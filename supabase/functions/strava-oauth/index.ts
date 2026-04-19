import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { code, user_id } = await req.json();
    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), { status: 400, headers: cors });
    }

    // 1. Trocar code por tokens com a API do Strava
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return new Response(JSON.stringify({ error: `Strava token error: ${err}` }), { status: 400, headers: cors });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_at, athlete } = tokenData;

    // 2. Salvar integração no banco com service role (bypassa RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase.from('user_integrations').upsert({
      user_id,
      service: 'strava',
      access_token,
      refresh_token,
      token_expiry: new Date(expires_at * 1000).toISOString(),
      external_user_id: String(athlete.id),
      scope: 'activity:read_all',
      is_connected: true,
      last_sync: new Date().toISOString(),
    }, { onConflict: 'user_id,service' });

    // 3. Buscar as últimas 5 atividades do atleta e salvar
    const activitiesRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=5',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (activitiesRes.ok) {
      const stravaActivities = await activitiesRes.json();
      const rows = stravaActivities.map((a: Record<string, unknown>) => ({
        user_id,
        service: 'strava',
        external_id: String(a.id),
        activity_type: a.type as string,
        name: a.name as string,
        calories_burned: (a.calories as number) || 0,
        duration_seconds: a.moving_time as number,
        distance_meters: (a.distance as number) || null,
        activity_date: a.start_date as string,
        raw_data: a,
      }));

      if (rows.length > 0) {
        await supabase.from('activities').upsert(rows, { onConflict: 'service,external_id' });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
