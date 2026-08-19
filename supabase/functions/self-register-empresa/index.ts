// =====================================================
// Malama — autocadastro público de empresas
// Cria a empresa em configuração e o primeiro acesso do RH. Não cria
// contrato, cobrança, assentos nem libera benefícios aos colaboradores.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const emailValido = (email: string) => /^\S+@\S+\.\S+$/.test(email);

const cnpjValido = (cnpj: string) => {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const n of base) {
      soma += Number(n) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const base = cnpj.slice(0, 12);
  return Number(cnpj[12]) === digito(base) && Number(cnpj[13]) === digito(base + cnpj[12]);
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const body = await req.json();
    const nomeEmpresa = String(body.empresa ?? '').trim();
    const cnpj = String(body.cnpj ?? '').replace(/\D/g, '');
    const nome = String(body.nome ?? '').trim();
    const cargo = String(body.cargo ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const telefone = String(body.telefone ?? '').trim();
    const senha = String(body.senha ?? '');
    const tamanho = String(body.num_colaboradores ?? '').trim();
    const modos = body.modos ?? {};
    const modoCompliance = Boolean(modos.compliance);
    const modoMental = Boolean(modos.mental);
    const modoMetabolico = Boolean(modos.metabolico);

    if (!nomeEmpresa || !nome || !cargo || !telefone || !tamanho) {
      return json({ error: 'Preencha todos os dados obrigatórios.' }, 400);
    }
    if (!cnpjValido(cnpj)) return json({ error: 'Informe um CNPJ válido.' }, 400);
    if (!emailValido(email)) return json({ error: 'Informe um e-mail corporativo válido.' }, 400);
    if (senha.length < 8) return json({ error: 'A senha deve ter ao menos 8 caracteres.' }, 400);
    if (!modoCompliance && !modoMental && !modoMetabolico) {
      return json({ error: 'Selecione ao menos uma solução.' }, 400);
    }
    if (!body.aceiteTermos || !body.aceitePrivacidade) {
      return json({ error: 'É necessário aceitar os termos e a política de privacidade.' }, 400);
    }

    const [{ data: empresaExistente }, { data: rhExistente }] = await Promise.all([
      supabaseAdmin.from('empresas').select('id').eq('cnpj', cnpj).maybeSingle(),
      supabaseAdmin.from('rh_usuarios').select('id').eq('email', email).maybeSingle(),
    ]);
    if (empresaExistente || rhExistente) {
      return json({ error: 'Já existe uma conta ou cadastro em andamento com estes dados. Entre em contato se precisar de ajuda.' }, 409);
    }

    const agora = new Date().toISOString();
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        nome: nomeEmpresa,
        cnpj,
        responsavel_nome: nome,
        responsavel_email: email,
        responsavel_telefone: telefone,
        status: 'em_configuracao',
        modo_compliance: modoCompliance,
        modo_mental: modoMental,
        modo_metabolico: modoMetabolico,
        autocadastro_em: agora,
        termos_aceitos_em: agora,
        privacidade_aceita_em: agora,
        tamanho_empresa_informado: tamanho,
      })
      .select('id')
      .single();
    if (empresaError || !empresa) return json({ error: 'Não foi possível criar a empresa agora.' }, 500);

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      app_metadata: { role: 'rh' },
      user_metadata: { name: nome, cargo },
    });
    if (userError || !userData.user) {
      await supabaseAdmin.from('empresas').delete().eq('id', empresa.id);
      return json({ error: 'Não foi possível criar o acesso. Tente outro e-mail ou recupere sua conta.' }, 400);
    }

    const { error: rhError } = await supabaseAdmin.from('rh_usuarios').insert({
      empresa_id: empresa.id,
      user_id: userData.user.id,
      auth_user_id: userData.user.id,
      email,
      nome,
      papel: 'proprietario',
      principal: true,
      permissoes: [
        'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao',
        'importar', 'financeiro', 'compliance', 'empresa', 'usuarios', 'apuracao',
      ],
    });
    if (rhError) {
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      await supabaseAdmin.from('empresas').delete().eq('id', empresa.id);
      return json({ error: 'Não foi possível concluir o cadastro agora.' }, 500);
    }

    return json({ ok: true });
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
  }
});
