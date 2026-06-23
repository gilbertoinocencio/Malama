// =====================================================
// Malama — Edge Function: Excluir a própria conta
// Exigência da App Store (Guideline 5.1.1(v)): o usuário deve poder iniciar
// e concluir a exclusão da conta de dentro do app.
// Autentica pelo JWT do chamador e apaga SOMENTE a própria conta (auth.users),
// fazendo cascade nas tabelas que referenciam auth.users/profiles.
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

  // Identifica o chamador pelo próprio token — garante que só apaga a si mesmo.
  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (callerError || !caller?.user) return json({ error: 'Sessão inválida' }, 401);

  const userId = caller.user.id;

  try {
    // Hard delete do usuário em auth.users — o cascade remove o profile e os
    // demais dados ligados por FK (ON DELETE CASCADE).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);

    return json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
