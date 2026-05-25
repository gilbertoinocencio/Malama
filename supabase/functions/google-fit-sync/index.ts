import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_FIT_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_FIT_CLIENT_SECRET')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MET_BY_TYPE: Record<string, number> = {
  Walk: 3.5, Run: 9.0, Biking: 6.0, Hiking: 5.5, Swimming: 6.0,
  WeightTraining: 4.5, Yoga: 2.5, Aerobics: 5.0, Jump_rope: 10.0,
  Martial_arts: 6.0, Soccer: 7.0, Tennis: 6.0, Skating: 7.0,
  Pilates: 3.0, Treadmill: 7.0, Volleyball: 4.0, Squash: 7.0,
};

function mapActivityType(typeCode: number): string {
  const types: Record<number, string> = {
    7: 'Walk', 8: 'Run', 1: 'Aerobics', 9: 'Biking', 10: 'Biking',
    20: 'Football', 21: 'Frisbee', 22: 'Gardening', 29: 'Hiking',
    35: 'Jump_rope', 41: 'Martial_arts', 45: 'Pilates', 56: 'Skateboarding',
    57: 'Skating', 58: 'Skiing', 59: 'Snowboarding', 63: 'Soccer',
    64: 'Softball', 65: 'Squash', 69: 'Swimming', 71: 'Tennis',
    72: 'Treadmill', 74: 'Volleyball', 75: 'Walking', 76: 'Yoga',
    82: 'WeightTraining',
  };
  return types[typeCode] || 'Other';
}

function estimateCalories(activityType: string, durationSeconds: number, weightKg = 70): number {
  const met = MET_BY_TYPE[activityType] ?? 4.0;
  return Math.round(met * weightKg * (durationSeconds / 3600));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // 1. Validar JWT do cliente
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

    // 2. Carregar tokens do Google Fit
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token, token_expiry')
      .eq('user_id', userId)
      .eq('service', 'google_fit')
      .eq('is_connected', true)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ synced: 0, message: 'No Google Fit connection' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let { access_token, refresh_token, token_expiry } = integration;

    // 3. Renovar token se expirado
    if (token_expiry && new Date(token_expiry) <= new Date()) {
      if (!refresh_token) {
        return new Response(JSON.stringify({ synced: 0, message: 'Token expired, reconnect Google Fit' }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshRes.ok) {
        return new Response(JSON.stringify({ synced: 0, message: 'Token refresh failed' }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const newTokens = await refreshRes.json();
      access_token = newTokens.access_token;
      const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      await supabase
        .from('user_integrations')
        .update({ access_token, token_expiry: newExpiry })
        .eq('user_id', userId)
        .eq('service', 'google_fit');
    }

    // 4. Buscar sessões das últimas 2 semanas
    const endTimeMs   = Date.now();
    const startTimeMs = endTimeMs - 14 * 24 * 60 * 60 * 1000;

    const sessionsRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startTimeMs).toISOString()}&endTime=${new Date(endTimeMs).toISOString()}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!sessionsRes.ok) {
      console.error('Sessions fetch error:', await sessionsRes.text());
      return new Response(JSON.stringify({ synced: 0, message: 'Failed to fetch sessions' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const sessionsData = await sessionsRes.json();
    const sessions: Record<string, unknown>[] = sessionsData.session || [];

    if (sessions.length === 0) {
      await supabase
        .from('user_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('service', 'google_fit');

      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 5. Buscar calorias via Aggregate API (bucketBySession)
    const caloriesBySession: Record<string, number> = {};
    const aggregateRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
        bucketBySession: {},
        startTimeMillis: startTimeMs,
        endTimeMillis: endTimeMs,
      }),
    });

    if (aggregateRes.ok) {
      const aggregateData = await aggregateRes.json();
      for (const bucket of aggregateData.bucket || []) {
        const sessionId = bucket.session?.id as string | undefined;
        if (!sessionId) continue;
        for (const ds of bucket.dataset || []) {
          for (const point of ds.point || []) {
            const cal = (point.value?.[0]?.fpVal as number) ?? 0;
            caloriesBySession[sessionId] = (caloriesBySession[sessionId] || 0) + cal;
          }
        }
      }
    }

    // 6. Montar rows para upsert
    const rows = sessions.map((s) => {
      const startMs       = parseInt(s.startTimeMillis as string);
      const endMs         = parseInt(s.endTimeMillis as string);
      const durationSec   = Math.round((endMs - startMs) / 1000);
      const activityType  = mapActivityType((s.activityType as number) || 0);
      const aggCalories   = caloriesBySession[s.id as string] || 0;
      const calories      = aggCalories > 0
        ? Math.round(aggCalories)
        : estimateCalories(activityType, durationSec);

      return {
        user_id:          userId,
        service:          'google_fit',
        external_id:      s.id as string,
        activity_type:    activityType,
        name:             (s.name as string) || 'Google Fit Activity',
        calories_burned:  calories,
        duration_seconds: durationSec,
        distance_meters:  null,
        activity_date:    new Date(startMs).toISOString(),
        raw_data:         s,
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

    // 7. Atualizar flow_stats para cada data afetada
    const affectedDates = [...new Set(rows.map(r => r.activity_date.substring(0, 10)))];

    for (const date of affectedDates) {
      const start = `${date}T00:00:00`;
      const end   = `${date}T23:59:59.999`;

      const { data: dayActivities } = await supabase
        .from('activities')
        .select('calories_burned')
        .eq('user_id', userId)
        .gte('activity_date', start)
        .lte('activity_date', end);

      if (dayActivities && dayActivities.length > 0) {
        const totalCalories = dayActivities.reduce(
          (sum: number, a: { calories_burned: number }) => sum + (a.calories_burned ?? 0), 0
        );

        await supabase
          .from('flow_stats')
          .upsert({ user_id: userId, date, calories_burned: totalCalories }, { onConflict: 'user_id,date' });
      }
    }

    // 8. Atualizar last_sync
    await supabase
      .from('user_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('service', 'google_fit');

    return new Response(JSON.stringify({ synced: rows.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('google-fit-sync error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
