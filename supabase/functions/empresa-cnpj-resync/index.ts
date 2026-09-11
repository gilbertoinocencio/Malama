// =====================================================
// Malama — Ressincronização de dados do CNPJ (BrasilAPI)
//
// Dois modos, mesma lógica (sincronizarCnpj em _shared/brasilapi.ts):
//   - Manual: RH autenticado (principal ou permissão 'empresa') pede
//     ressincronizar a PRÓPRIA empresa. O empresa_id nunca vem do corpo da
//     requisição — sempre resolvido a partir do token, mesmo padrão das
//     RPCs rh_contexto_operacional()/rh_agente_contexto().
//   - Lote: pg_cron chama de madrugada (mesmo padrão de autenticação de
//     send-rh-reminders — token === SERVICE_ROLE_KEY), processando um lote
//     pequeno de empresas pendentes com espaçamento entre chamadas à
//     BrasilAPI, para respeitar o teto informal de ~3 consultas/min.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sincronizarCnpj } from '../_shared/brasilapi.ts';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

// Espaçamento entre chamadas à BrasilAPI dentro do lote — teto informal de
// ~3 consultas/min usado pelos concorrentes (ReceitaWS, CNPJ.ws) como
// margem de segurança, já que a BrasilAPI não publica um limite fixo.
const ESPACAMENTO_LOTE_MS = 22_000;
const LIMITE_PADRAO = 5;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processarLote(limite: number) {
  const { data: pendentes, error } = await supabaseAdmin
    .from('empresas')
    .select('id, cnpj, empresa_dados_cnpj(synced_at, ultima_tentativa_em)')
    .not('cnpj', 'is', null)
    .order('synced_at', { ascending: true, nullsFirst: true, foreignTable: 'empresa_dados_cnpj' })
    .limit(500); // filtragem fina abaixo — a tabela de empresas não é grande o bastante pra paginar de verdade

  if (error) {
    console.error('[empresa-cnpj-resync] falha ao listar empresas pendentes:', error);
    return json({ error: 'Falha ao listar empresas pendentes.' }, 500);
  }

  const agora = Date.now();
  const SEIS_MESES_MS = 1000 * 60 * 60 * 24 * 30 * 6;
  const UM_DIA_MS = 1000 * 60 * 60 * 24;

  const devidas = (pendentes ?? []).filter((e: Record<string, unknown>) => {
    const dados = Array.isArray(e.empresa_dados_cnpj) ? e.empresa_dados_cnpj[0] : e.empresa_dados_cnpj;
    const syncedAt = dados?.synced_at ? new Date(dados.synced_at as string).getTime() : null;
    const ultimaTentativa = dados?.ultima_tentativa_em ? new Date(dados.ultima_tentativa_em as string).getTime() : null;
    const precisaSync = syncedAt === null || (agora - syncedAt) > SEIS_MESES_MS;
    const foraDoBackoff = ultimaTentativa === null || (agora - ultimaTentativa) > UM_DIA_MS;
    return precisaSync && foraDoBackoff;
  }).slice(0, limite);

  let ok = 0;
  let erro = 0;
  for (let i = 0; i < devidas.length; i++) {
    const empresa = devidas[i] as { id: string; cnpj: string };
    const resultado = await sincronizarCnpj(supabaseAdmin, empresa.id, empresa.cnpj);
    if (resultado.status === 'ok') ok++; else {
      erro++;
      console.error(`[empresa-cnpj-resync] lote: empresa ${empresa.id} -> ${resultado.status}: ${resultado.erro}`);
    }
    if (i < devidas.length - 1) await sleep(ESPACAMENTO_LOTE_MS);
  }

  return json({ processadas: devidas.length, ok, erro });
}

async function processarManual(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  if (!caller?.user) return json({ error: 'Não autorizado' }, 401);

  const { data: rh } = await supabaseAdmin
    .from('rh_usuarios')
    .select('empresa_id, principal, permissoes')
    .eq('user_id', caller.user.id)
    .eq('ativo', true)
    .maybeSingle();

  const podeEditar = rh?.principal === true || (rh?.permissoes ?? []).includes('empresa');
  if (!rh || !podeEditar) return json({ error: 'Sem permissão para ressincronizar os dados da empresa.' }, 403);

  const { data: empresa, error: empresaError } = await supabaseAdmin
    .from('empresas')
    .select('id, cnpj')
    .eq('id', rh.empresa_id)
    .single();
  if (empresaError || !empresa?.cnpj) return json({ error: 'Empresa sem CNPJ cadastrado.' }, 400);

  const resultado = await sincronizarCnpj(supabaseAdmin, empresa.id, empresa.cnpj);
  if (resultado.status !== 'ok') return json({ error: resultado.erro || 'Não foi possível sincronizar agora.', status: resultado.status }, 502);
  return json({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Corpo vazio é válido no modo manual (o botão do RH manda `{}`). O
    // lote do cron sempre manda `{modo:'lote'}` explicitamente, então um
    // corpo ausente só cai no fluxo manual, que exige JWT de qualquer forma.
  }

  if (body.modo === 'lote') {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!token || token !== SERVICE_KEY) return json({ error: 'Não autorizado' }, 401);
    const limite = Number.isFinite(Number(body.limite)) ? Math.min(Math.max(Number(body.limite), 1), 20) : LIMITE_PADRAO;
    return processarLote(limite);
  }

  return processarManual(req);
});
