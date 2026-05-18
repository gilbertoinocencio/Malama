import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_VERIFY_TOKEN       = Deno.env.get('STRAVA_VERIFY_TOKEN')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // ── GET: Handshake de validação do Strava ────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
      return Response.json({ 'hub.challenge': challenge });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // ── POST: Evento de atividade ou deauthorização ──────────────────────
  if (req.method === 'POST') {
    // Strava exige resposta em 2 segundos — processamento em background
    const payload = await req.json();

    // Responder imediatamente antes de processar
    const responsePromise = new Response('EVENT_RECEIVED', { status: 200 });

    // Processar em background (não bloqueia a resposta)
    processEvent(payload).catch((err) => console.error('strava-webhook processing error:', err));

    return responsePromise;
  }

  return new Response('Method Not Allowed', { status: 405 });
});

async function processEvent(payload: Record<string, unknown>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const objectType = payload.object_type as string;
  const aspectType = payload.aspect_type as string;
  const objectId   = payload.object_id as number;
  const ownerId    = payload.owner_id as number;

  // ── Deauthorização: remover conexão ─────────────────────────────────
  if (objectType === 'athlete') {
    const updates = payload.updates as Record<string, string> | undefined;
    if (updates?.authorized === 'false') {
      await supabase
        .from('strava_connections')
        .delete()
        .eq('strava_athlete_id', ownerId);
    }
    return;
  }

  // ── Nova atividade criada ────────────────────────────────────────────
  if (objectType === 'activity' && aspectType === 'create') {
    // Buscar user_id pelo strava_athlete_id
    const { data: connection } = await supabase
      .from('strava_connections')
      .select('user_id')
      .eq('strava_athlete_id', ownerId)
      .maybeSingle();

    if (!connection) return;

    const userId = connection.user_id;

    // Obter access_token válido via strava-refresh-token
    const refreshRes = await supabase.functions.invoke('strava-refresh-token', {
      body: { user_id: userId },
    });

    if (refreshRes.error || !refreshRes.data?.access_token) {
      console.error('Failed to get valid token for user:', userId);
      return;
    }

    const accessToken = refreshRes.data.access_token;

    // Buscar detalhes completos da atividade na API do Strava (endpoint detail inclui calories)
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${objectId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!activityRes.ok) {
      console.error('Failed to fetch Strava activity:', objectId, await activityRes.text());
      return;
    }

    const activity = await activityRes.json();

    // Extrair calorias (calories direto, ou kilojoules * 0.239 como fallback)
    const calories: number = activity.calories
      ?? (activity.kilojoules ? Math.round(activity.kilojoules * 0.239) : 0);

    // Usar data local da atividade (start_date_local é a hora do fuso do atleta)
    const activityDateRaw: string = activity.start_date_local ?? activity.start_date;
    const activityDate = activityDateRaw.substring(0, 10);

    // ── Upsert em activities (para calendário e listas) ──────────────
    // IMPORTANTE: usar start_date_local para que o filtro de data no app funcione corretamente
    await supabase
      .from('activities')
      .upsert({
        user_id:          userId,
        service:          'strava',
        external_id:      String(objectId),
        activity_type:    activity.type ?? 'Unknown',
        name:             activity.name ?? 'Atividade Strava',
        calories_burned:  calories,
        duration_seconds: activity.moving_time ?? 0,
        distance_meters:  (activity.distance as number) ?? null,
        activity_date:    activityDateRaw,
        raw_data:         activity,
      }, { onConflict: 'service,external_id' });

    // ── Upsert em flow_stats: somar calories_burned e acrescentar ao array de IDs ──
    const { data: existing } = await supabase
      .from('flow_stats')
      .select('calories_burned, strava_activity_ids')
      .eq('user_id', userId)
      .eq('date', activityDate)
      .maybeSingle();

    const prevCalories   = existing?.calories_burned ?? 0;
    const prevIds        = existing?.strava_activity_ids ?? [];
    const activityIdStr  = String(objectId);

    // Evitar duplicata se o webhook disparar duas vezes
    if (prevIds.includes(activityIdStr)) return;

    await supabase
      .from('flow_stats')
      .upsert({
        user_id:              userId,
        date:                 activityDate,
        calories_burned:      prevCalories + calories,
        strava_activity_ids:  [...prevIds, activityIdStr],
      }, { onConflict: 'user_id,date' });
  }
}
