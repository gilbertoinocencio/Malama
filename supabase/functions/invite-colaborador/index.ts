// =====================================================
// Malama — Edge Function: Adicionar colaborador a uma empresa
// Chamada pelo RH. Valida limite de assentos, vincula usuário
// existente ou cria convite por e-mail. Requer service_role para
// resolver e-mail → user_id e enviar o convite.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  try {
    const { email, redirect_to } = await req.json();
    if (!email) return json({ error: 'E-mail é obrigatório' }, 400);

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Identificar o RH chamador e a empresa dele
    const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller?.user) return json({ error: 'Sessão inválida' }, 401);

    const { data: rh, error: rhError } = await supabaseAdmin
      .from('rh_usuarios')
      .select('empresa_id')
      .eq('user_id', caller.user.id)
      .maybeSingle();

    if (rhError || !rh) return json({ error: 'Apenas o RH da empresa pode adicionar colaboradores' }, 403);
    const empresaId = rh.empresa_id;

    // 2. Carregar empresa (limite de assentos + status)
    const { data: empresa, error: empError } = await supabaseAdmin
      .from('empresas')
      .select('max_assentos, status')
      .eq('id', empresaId)
      .single();

    if (empError || !empresa) return json({ error: 'Empresa não encontrada' }, 404);
    if (empresa.status !== 'ativa') return json({ error: 'A conta da empresa não está ativa' }, 403);

    // 3. Já existe colaborador ativo/convidado com esse e-mail?
    const { data: existing } = await supabaseAdmin
      .from('empresa_colaboradores')
      .select('id, status')
      .eq('empresa_id', empresaId)
      .eq('email', normalizedEmail)
      .neq('status', 'removido')
      .maybeSingle();

    if (existing) return json({ error: 'Este colaborador já está vinculado à empresa' }, 409);

    // 4. Validar limite de assentos (ativos + convidados ocupam assento)
    const { count } = await supabaseAdmin
      .from('empresa_colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .in('status', ['ativo', 'convidado']);

    if (empresa.max_assentos != null && (count ?? 0) >= empresa.max_assentos) {
      return json({ error: 'Limite de assentos contratados atingido' }, 422);
    }

    // 5. O e-mail já tem conta no app?
    const { data: existingUserId } = await supabaseAdmin
      .rpc('get_user_id_by_email', { p_email: normalizedEmail });

    if (existingUserId) {
      // Vincula mantendo todos os dados do usuário
      const { error: insErr } = await supabaseAdmin
        .from('empresa_colaboradores')
        .insert([{
          empresa_id: empresaId,
          user_id: existingUserId,
          email: normalizedEmail,
          status: 'ativo',
          data_ativacao: new Date().toISOString(),
        }]);
      if (insErr) return json({ error: insErr.message }, 400);
      return json({ status: 'ativo', linked: true });
    }

    // 6. Não tem conta — cria registro 'convidado' e envia e-mail de convite
    const { error: insErr } = await supabaseAdmin
      .from('empresa_colaboradores')
      .insert([{
        empresa_id: empresaId,
        email: normalizedEmail,
        status: 'convidado',
      }]);
    if (insErr) return json({ error: insErr.message }, 400);

    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo: redirect_to || undefined }
    );
    // O convite falhar (ex.: e-mail já registrado em corrida) não deve reverter o
    // vínculo — o colaborador segue 'convidado' e pode ser reenviado depois.
    if (inviteErr) {
      return json({ status: 'convidado', invited: false, warning: inviteErr.message });
    }

    return json({ status: 'convidado', invited: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
