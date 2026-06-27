import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  email: string;
  type: 'doctor' | 'patient';
  lead_id: string;
  redirect_to: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Só super_admin pode disparar convites (evita spam e phishing via redirect_to)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: caller } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (caller?.user?.app_metadata?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Acesso restrito ao super admin' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email, type, lead_id, redirect_to }: Payload = await req.json();

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirect_to,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const table = type === 'doctor' ? 'doctor_leads' : 'patient_leads';
  await supabase
    .from(table)
    .update({ status: 'convidado', invited_at: new Date().toISOString() })
    .eq('id', lead_id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
