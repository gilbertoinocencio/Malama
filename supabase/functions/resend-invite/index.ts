// =====================================================
// Malama — Edge Function: Reenviar convite/ativação
// Chamada pelo RH para colaboradores ainda em 'convidado'.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { activationEmailHtml, activationEmailText, sendEmail } from '../_shared/emails.ts';

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
    const { colaborador_id, redirect_to } = await req.json();
    if (!colaborador_id) return json({ error: 'colaborador_id é obrigatório' }, 400);

    // 1. Identificar RH chamador
    const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller?.user) return json({ error: 'Sessão inválida' }, 401);

    const { data: rh } = await supabaseAdmin
      .from('rh_usuarios')
      .select('empresa_id')
      .eq('user_id', caller.user.id)
      .maybeSingle();
    if (!rh) return json({ error: 'Apenas o RH da empresa pode reenviar convites' }, 403);

    // 2. Buscar colaborador (deve pertencer à mesma empresa)
    const { data: colab, error: colabErr } = await supabaseAdmin
      .from('empresa_colaboradores')
      .select('id, email, user_id, status')
      .eq('id', colaborador_id)
      .eq('empresa_id', rh.empresa_id)
      .single();

    if (colabErr || !colab) return json({ error: 'Colaborador não encontrado' }, 404);
    if (colab.status !== 'convidado') return json({ error: 'Apenas colaboradores com status "convidado" podem ter o convite reenviado' }, 422);

    // 3. Nome da empresa
    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('nome')
      .eq('id', rh.empresa_id)
      .single();
    const empresaNome = empresa?.nome ?? 'Sua empresa';

    // 4. Reenviar e-mail adequado ao tipo de colaborador
    if (colab.user_id) {
      // Já tem conta Malama → e-mail de ativação
      const appUrl = `${(Deno.env.get('SITE_URL') || 'https://soumalama.com.br').replace(/\/$/, '')}/`;
      const { sent, warning } = await sendEmail({
        to: colab.email,
        subject: `${empresaNome} liberou seu benefício Malama`,
        html: activationEmailHtml(empresaNome, appUrl),
        text: activationEmailText(empresaNome, appUrl),
      });
      return json({ sent, warning });
    }

    // Novo usuário → reenviar convite Supabase
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      colab.email,
      { redirectTo: redirect_to || undefined }
    );
    if (inviteErr) return json({ sent: false, warning: inviteErr.message });
    return json({ sent: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
