import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_CLIENT_ID          = Deno.env.get('STRAVA_CLIENT_ID')!;   // 227202
const STRAVA_CLIENT_SECRET      = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Ler code do body JSON (chamada do frontend em /strava/callback)
    const { code } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: cors });
    }

    // JWT do usuário autenticado via header Authorization
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();

    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), { status: 401, headers: cors });
    }

    // Trocar code por tokens com a API do Strava
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Strava token error:', err);
      return new Response(JSON.stringify({ error: 'token_exchange_failed' }), { status: 400, headers: cors });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_at, athlete, scope } = tokenData;

    // Identificar o usuário pelo JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'invalid_session' }), { status: 401, headers: cors });
    }

    // Salvar (ou atualizar) a conexão
    const { error: upsertError } = await supabase
      .from('strava_connections')
      .upsert({
        user_id:           user.id,
        strava_athlete_id: athlete.id,
        access_token,
        refresh_token,
        expires_at,
        scopes:            scope ?? '',
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('DB upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'db_error' }), { status: 500, headers: cors });
    }

    return new Response(
      JSON.stringify({ success: true, athlete_id: athlete.id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('strava-oauth-callback error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
