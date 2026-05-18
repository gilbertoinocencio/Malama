import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MET (Metabolic Equivalent of Task) por tipo — usado quando Strava não fornece calories nem kilojoules
const MET_BY_TYPE: Record<string, number> = {
  Walk:             3.5,
  Hike:             5.5,
  Run:              9.0,
  VirtualRun:       8.0,
  Ride:             6.0,
  VirtualRide:      5.5,
  MountainBikeRide: 8.5,
  Swim:             6.0,
  WeightTraining:   4.5,
  Workout:          4.5,
  Yoga:             2.5,
  Crossfit:         7.0,
  Rowing:           7.0,
  Soccer:           7.0,
  Tennis:           6.0,
};

function estimateCalories(type: string, durationSeconds: number): number {
  const met = MET_BY_TYPE[type] ?? 4.0;
  return Math.round(met * 70 * (durationSeconds / 3600));
}

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

    const rows = stravaActivities.map((a: Record<string, unknown>) => {
      const type     = (a.type as string) ?? 'Workout';
      const duration = (a.moving_time as number) ?? 0;

      // BUG FIX: o endpoint de lista do Strava não inclui `calories` (apenas DetailedActivity),
      // apenas `kilojoules`. Usar kilojoules * 0.239 ou estimativa MET como fallback.
      const stravaCalories = (a.calories as number) ?? 0;
      const kjCalories     = (a.kilojoules as number) > 0
        ? Math.round((a.kilojoules as number) * 0.239)
        : 0;
      const calories =
        stravaCalories > 0 ? stravaCalories :
        kjCalories     > 0 ? kjCalories     :
        estimateCalories(type, duration);

      // BUG FIX: usar start_date_local (fuso do atleta) para que o filtro de data local no app
      // funcione corretamente. Atividades feitas à noite não devem aparecer no dia seguinte.
      const activityDate = (a.start_date_local as string) ?? (a.start_date as string);

      return {
        user_id:          userId,
        service:          'strava',
        external_id:      String(a.id),
        activity_type:    type,
        name:             (a.name as string) ?? 'Atividade Strava',
        calories_burned:  calories,
        duration_seconds: duration,
        distance_meters:  (a.distance as number) || null,
        activity_date:    activityDate,
        raw_data:         a,
      };
    });

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

    // BUG FIX: atualizar flow_stats para cada dia afetado pela sincronização.
    // Agrupa as atividades recém-sincronizadas por data e recalcula o total a partir
    // da tabela activities (idempotente — evita double-counting com o webhook).
    const affectedDates = [...new Set(rows.map(r => (r.activity_date as string).substring(0, 10)))];

    for (const date of affectedDates) {
      const start = `${date}T00:00:00`;
      const end   = `${date}T23:59:59.999`;

      const { data: dayActivities } = await supabase
        .from('activities')
        .select('calories_burned, external_id')
        .eq('user_id', userId)
        .eq('service', 'strava')
        .gte('activity_date', start)
        .lte('activity_date', end);

      if (dayActivities && dayActivities.length > 0) {
        const totalCalories = dayActivities.reduce(
          (sum: number, a: { calories_burned: number }) => sum + (a.calories_burned ?? 0), 0
        );
        const activityIds = dayActivities.map((a: { external_id: string }) => String(a.external_id));

        await supabase
          .from('flow_stats')
          .upsert({
            user_id:             userId,
            date,
            calories_burned:     totalCalories,
            strava_activity_ids: activityIds,
          }, { onConflict: 'user_id,date' });
      }
    }

    return new Response(JSON.stringify({ synced: rows.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('strava-sync error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
