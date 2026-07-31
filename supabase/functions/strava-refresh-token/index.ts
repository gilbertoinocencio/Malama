import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_CLIENT_ID          = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET      = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  try {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const user_id = user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar conexão do usuário
    const { data: connection, error: fetchError } = await supabase
      .from('strava_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (fetchError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No Strava connection found for this user' }),
        { status: 404, headers: cors }
      );
    }

    // Verificar se o token expira em menos de 1 hora
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresThreshold = nowSeconds + 3600;

    if (connection.expires_at >= expiresThreshold) {
      // Token ainda válido — retornar sem renovar
      return new Response(
        JSON.stringify({ access_token: connection.access_token }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Token expirado ou prestes a expirar — renovar com o Strava
    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type:    'refresh_token',
      }),
    });

    if (!refreshRes.ok) {
      const err = await refreshRes.text();
      console.error('Strava refresh error:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh Strava token' }),
        { status: 502, headers: cors }
      );
    }

    const refreshData = await refreshRes.json();
    const { access_token, refresh_token, expires_at } = refreshData;

    // Atualizar tokens na tabela
    const { error: updateError } = await supabase
      .from('strava_connections')
      .update({ access_token, refresh_token, expires_at })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('DB update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to persist refreshed tokens' }),
        { status: 500, headers: cors }
      );
    }

    return new Response(
      JSON.stringify({ access_token }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('strava-refresh-token error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: cors }
    );
  }
});
