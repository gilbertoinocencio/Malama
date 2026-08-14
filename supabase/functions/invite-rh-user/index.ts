// Malama — convite de um membro da equipe do RH pelo usuário principal.

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

const papeis = ['gestor_rh', 'saude_mental', 'compliance', 'financeiro', 'personalizado'];
const permissoesValidas = [
  'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao', 'importar',
  'financeiro', 'compliance', 'empresa', 'apuracao',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  try {
    const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller?.user) return json({ error: 'Sessão inválida' }, 401);

    const { data: gestor } = await supabaseAdmin
      .from('rh_usuarios')
      .select('id, empresa_id, principal, ativo')
      .eq('user_id', caller.user.id)
      .eq('ativo', true)
      .maybeSingle();

    if (!gestor?.principal) {
      return json({ error: 'Apenas o usuário principal pode convidar a equipe' }, 403);
    }

    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const nome = String(body.nome ?? '').trim();
    const papel = String(body.papel ?? 'personalizado');
    const permissoes = Array.from(new Set(
      (Array.isArray(body.permissoes) ? body.permissoes : []).map(String),
    ));

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Informe um e-mail válido' }, 400);
    if (!nome) return json({ error: 'Informe o nome do usuário' }, 400);
    if (!papeis.includes(papel)) return json({ error: 'Papel inválido' }, 400);
    if (permissoes.some(p => !permissoesValidas.includes(p))) return json({ error: 'Permissão inválida' }, 400);

    const { data: existente } = await supabaseAdmin
      .from('rh_usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existente) return json({ error: 'Este e-mail já pertence a um usuário do RH' }, 409);

    const siteUrl = (Deno.env.get('SITE_URL') || 'https://soumalama.com.br').replace(/\/$/, '');
    const { data: convite, error: conviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/rh/nova-senha`,
      data: { name: nome },
    });
    if (conviteError || !convite.user) {
      return json({ error: conviteError?.message || 'Não foi possível criar o convite' }, 400);
    }

    const authUserId = convite.user.id;
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      app_metadata: { ...(convite.user.app_metadata ?? {}), role: 'rh' },
      user_metadata: { ...(convite.user.user_metadata ?? {}), name: nome },
    });
    if (metadataError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return json({ error: metadataError.message }, 400);
    }

    const { error: vinculoError } = await supabaseAdmin.from('rh_usuarios').insert({
      empresa_id: gestor.empresa_id,
      user_id: authUserId,
      auth_user_id: authUserId,
      email,
      nome,
      papel,
      permissoes,
      principal: false,
      ativo: true,
      criado_por: gestor.id,
    });

    if (vinculoError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return json({ error: vinculoError.message }, 400);
    }

    return json({ ok: true });
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
  }
});

