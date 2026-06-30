import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_FIT_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_FIT_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://soumalama.com.br';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeia activity type code do Google Fit para string legível
function mapGoogleActivityType(typeCode: number): string {
  const types: Record<number, string> = {
    7: 'Walk', 8: 'Run', 1: 'Aerobics', 9: 'Biking',
    10: 'Biking', 20: 'Football', 21: 'Frisbee', 22: 'Gardening',
    29: 'Hiking', 35: 'Jump_rope', 41: 'Martial_arts', 45: 'Pilates',
    56: 'Skateboarding', 57: 'Skating', 58: 'Skiing', 59: 'Snowboarding',
    63: 'Soccer', 64: 'Softball', 65: 'Squash', 69: 'Swimming',
    71: 'Tennis', 72: 'Treadmill', 74: 'Volleyball', 75: 'Walking',
    76: 'Yoga', 82: 'WeightTraining', 83: 'WheelingInAWheelchair',
  };
  return types[typeCode] || 'Other';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { code, user_id } = await req.json();
    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), { status: 400, headers: cors });
    }

    const redirectUri = `${APP_URL}?google_code=1`;

    // 1. Trocar code por tokens com a API do Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return new Response(JSON.stringify({ error: `Google token error: ${err}` }), { status: 400, headers: cors });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000).toISOString();

    // Buscar o sub (Google user ID)
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

    // 2. Salvar integração no banco
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase.from('user_integrations').upsert({
      user_id,
      service: 'google_fit',
      access_token,
      refresh_token: refresh_token || null,
      token_expiry: tokenExpiry,
      external_user_id: userInfo.sub || null,
      scope: 'fitness.activity.read',
      is_connected: true,
      last_sync: new Date().toISOString(),
    }, { onConflict: 'user_id,service' });

    // 3. Buscar sessões de atividade das últimas 4 semanas
    const endTimeMs = Date.now();
    const startTimeMs = endTimeMs - 28 * 24 * 60 * 60 * 1000;

    const sessionsRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startTimeMs).toISOString()}&endTime=${new Date(endTimeMs).toISOString()}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json();
      const sessions = sessionsData.session || [];

      const rows = sessions.map((s: Record<string, unknown>) => {
        const startMs = parseInt(s.startTimeMillis as string);
        const endMs = parseInt(s.endTimeMillis as string);
        const durationSeconds = Math.round((endMs - startMs) / 1000);
        return {
          user_id,
          service: 'google_fit',
          external_id: s.id as string,
          activity_type: mapGoogleActivityType((s.activityType as number) || 0),
          name: (s.name as string) || 'Google Fit Activity',
          calories_burned: 0, // Google Fit sessions não incluem calorias diretamente
          duration_seconds: durationSeconds,
          distance_meters: null,
          activity_date: new Date(startMs).toISOString(),
          raw_data: s,
        };
      });

      if (rows.length > 0) {
        await supabase.from('activities').upsert(rows, { onConflict: 'service,external_id' });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
