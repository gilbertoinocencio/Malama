import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Extrair usuário do JWT enviado pelo cliente
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: cors });
    }

    const userId = user.id;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obter token Strava válido (renova automaticamente se expirado)
    const refreshRes = await fetch(`${SUPABASE_URL}/functions/v1/strava-refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!refreshRes.ok) {
      // Sem conexão Strava — não é erro, apenas sem dados para sincronizar
      return new Response(JSON.stringify({ synced: 0, message: 'No Strava connection' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { access_token, error: tokenError } = await refreshRes.json();
    if (tokenError || !access_token) {
      return new Response(JSON.stringify({ synced: 0, message: 'No valid token' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Buscar as 30 atividades mais recentes do Strava
    const activitiesRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!activitiesRes.ok) {
      const err = await activitiesRes.text();
      console.error('Strava activities fetch error:', err);
      return new Response(JSON.stringify({ error: 'Failed to fetch Strava activities' }), {
        status: 502,
        headers: cors,
      });
    }

    const stravaActivities = await activitiesRes.json();
    if (!Array.isArray(stravaActivities) || stravaActivities.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const rows = stravaActivities.map((a: Record<string, unknown>) => ({
      user_id:          userId,
      service:          'strava',
      external_id:      String(a.id),
      activity_type:    a.type as string,
      name:             a.name as string,
      calories_burned:  (a.calories as number) || 0,
      duration_seconds: a.moving_time as number,
      distance_meters:  (a.distance as number) || null,
      activity_date:    a.start_date as string,
      raw_data:         a,
    }));

    const { error: upsertError } = await supabase
      .from('activities')
      .upsert(rows, { onConflict: 'service,external_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save activities' }), {
        status: 500,
        headers: cors,
      });
    }

    return new Response(JSON.stringify({ synced: rows.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('strava-sync error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
