// =====================================================
// NURA — Edge Function: Criar usuário auth do influenciador
// Requer service_role para criar usuário sem afetar sessão do admin
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Verificar que o chamador está autenticado
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      email, password, name,
      instagram_handle, pix_key,
      commission_per_referral, notes, status,
    } = await req.json();

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'email, password e name são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Criar usuário no Supabase Auth (confirmado imediatamente)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const referral_token = `inf_${crypto.randomUUID().replace(/-/g, '')}`;
    const access_token = `acc_${crypto.randomUUID().replace(/-/g, '')}`;

    // 2. Inserir registro do influenciador já vinculado ao user_id
    const { data: influencer, error: infError } = await supabaseAdmin
      .from('influencers')
      .insert([{
        user_id: userId,
        name,
        email,
        instagram_handle: instagram_handle || null,
        pix_key: pix_key || null,
        commission_per_referral: parseFloat(commission_per_referral) || 10,
        notes: notes || null,
        status: status || 'active',
        referral_token,
        access_token,
        setup_token: null, // não necessário — conta já criada pelo admin
      }])
      .select()
      .single();

    if (infError) {
      // Rollback: remover o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: infError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(influencer), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
