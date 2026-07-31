// =====================================================
// MALAMA — Edge Function: turn-credentials
// Gera credenciais TURN efêmeras para a videoconsulta.
// Provider: Cloudflare Realtime TURN (a chave fica server-side;
// o cliente só recebe credenciais temporárias).
// POST {} → { iceServers: RTCIceServer[] }
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cloudflare Realtime TURN — https://developers.cloudflare.com/realtime/turn/
const CF_TURN_KEY_ID    = Deno.env.get('CLOUDFLARE_TURN_KEY_ID');
const CF_TURN_API_TOKEN = Deno.env.get('CLOUDFLARE_TURN_API_TOKEN');

// Fallback: TURN estático de qualquer provedor, se configurado nos secrets.
const STATIC_TURN_URL  = Deno.env.get('TURN_SERVER_URL');
const STATIC_TURN_USER = Deno.env.get('TURN_USERNAME');
const STATIC_TURN_CRED = Deno.env.get('TURN_CREDENTIAL');

// A credencial precisa durar a consulta inteira — 4h dá folga.
const CREDENTIAL_TTL_SECONDS = 4 * 60 * 60;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Auth: só usuários logados recebem credenciais ──
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const [{ data: canAccess }, { data: withinQuota }] = await Promise.all([
    supabase.rpc('can_access_mobile_app'),
    supabase.rpc('consume_edge_quota', { p_scope: 'turn', p_limit: 10, p_window_seconds: 3600 }),
  ]);
  if (canAccess !== true) return json({ error: 'Acesso nao provisionado pelo RH' }, 403);
  if (withinQuota !== true) return json({ error: 'Limite temporario de video atingido' }, 429);

  let roomId = '';
  try { roomId = String((await req.json())?.room_id ?? ''); } catch { /* invalido abaixo */ }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
    return json({ error: 'room_id invalido' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: consultation } = await admin
    .from('consultations')
    .select('patient_id, status, scheduled_at, duration_minutes, doctors:doctor_id(user_id)')
    .eq('room_id', roomId)
    .maybeSingle();
  const doctorUserId = (consultation?.doctors as { user_id?: string } | null)?.user_id;
  const scheduledAt = consultation ? new Date(consultation.scheduled_at).getTime() : 0;
  const now = Date.now();
  const inCallWindow = scheduledAt > 0
    && now >= scheduledAt - 60 * 60 * 1000
    && now <= scheduledAt + (Number(consultation?.duration_minutes ?? 30) + 120) * 60 * 1000;
  if (!consultation || !['scheduled', 'in_progress'].includes(consultation.status)
      || (consultation.patient_id !== user.id && doctorUserId !== user.id) || !inCallWindow) {
    return json({ error: 'Consulta nao autorizada ou fora da janela' }, 403);
  }

  // ── Cloudflare: credencial efêmera por chamada ─────
  if (CF_TURN_KEY_ID && CF_TURN_API_TOKEN) {
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CF_TURN_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
        }
      );
      if (!res.ok) {
        console.error('Cloudflare TURN error:', res.status, await res.text());
      } else {
        const data = await res.json();
        // A API pode retornar um objeto único ou um array em iceServers.
        const servers = Array.isArray(data.iceServers)
          ? data.iceServers
          : [data.iceServers].filter(Boolean);
        if (servers.length > 0) return json({ iceServers: servers });
      }
    } catch (err) {
      console.error('Cloudflare TURN fetch failed:', err);
    }
  }

  // ── Fallback: TURN estático configurado nos secrets ─
  if (STATIC_TURN_URL && STATIC_TURN_USER && STATIC_TURN_CRED) {
    return json({
      iceServers: [
        { urls: STATIC_TURN_URL, username: STATIC_TURN_USER, credential: STATIC_TURN_CRED },
      ],
    });
  }

  // Sem TURN configurado — o cliente segue com os STUN padrão.
  return json({ iceServers: [] });
});
