import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_CLIENT_ID          = Deno.env.get('STRAVA_CLIENT_ID')!;
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
    const { code } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: cors });
    }

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

    // Buscar atividades recentes do Strava (últimos 30 dias) e salvar na tabela activities
    try {
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const activitiesRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=10&after=${thirtyDaysAgo}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      if (activitiesRes.ok) {
        const stravaActivities = await activitiesRes.json();

        if (Array.isArray(stravaActivities) && stravaActivities.length > 0) {
          const rows = stravaActivities.map((a: any) => ({
            user_id:          user.id,
            service:          'strava',
            external_id:      String(a.id),
            activity_type:    a.type ?? 'Unknown',
            name:             a.name ?? 'Atividade Strava',
            calories_burned:  a.calories ?? 0,
            duration_seconds: a.moving_time ?? 0,
            distance_meters:  a.distance ?? null,
            activity_date:    a.start_date,
            raw_data:         a,
          }));

          const { error: actErr } = await supabase
            .from('activities')
            .upsert(rows, { onConflict: 'service,external_id' });

          if (actErr) console.error('Error saving activities:', actErr);
          else console.log(`Saved ${rows.length} activities for user ${user.id}`);
        }
      }
    } catch (actFetchErr) {
      // Não bloquear o fluxo principal se a busca de atividades falhar
      console.error('Error fetching Strava activities:', actFetchErr);
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
