// =====================================================
// NURA — Edge Function: send-glp1-notifications
// Runs on a cron every 5 minutes (via pg_cron).
// Finds pending GLP-1 dose notifications and sends
// Web Push to the user's registered subscriptions.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@nura.app';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── VAPID helpers ─────────────────────────────────────────────────────────

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidJwt(audience: string): Promise<string> {
  const header  = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encode = (obj: object) =>
    base64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import private key (base64url-encoded raw PKCS8 or JWK)
  let privateKey: CryptoKey;
  try {
    // Try importing as JWK first
    const jwk = JSON.parse(atob(VAPID_PRIVATE.replace(/-/g, '+').replace(/_/g, '/')));
    privateKey = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  } catch {
    // Fall back to raw base64url PKCS8
    const keyData = Uint8Array.from(
      atob(VAPID_PRIVATE.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    privateKey = await crypto.subtle.importKey(
      'pkcs8', keyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64urlEncode(signature)}`;
}

// ─── Send a single push notification ─────────────────────────────────────────

async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<boolean> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.hostname}`;
  const jwt = await createVapidJwt(audience);

  const body = JSON.stringify(payload);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Type':  'application/json',
      'TTL':           '86400',
    },
    body,
  });

  return res.status === 201 || res.status === 200;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    // 1. Find overdue doses that haven't been notified
    const now = new Date().toISOString();
    const { data: doses, error: dosesError } = await supabase
      .from('glp1_doses')
      .select('id, user_id, medication, dose_mg')
      .lte('next_dose_scheduled_at', now)
      .eq('notification_sent', false)
      .not('next_dose_scheduled_at', 'is', null);

    if (dosesError) throw dosesError;
    if (!doses || doses.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sent = 0;
    for (const dose of doses) {
      // 2. Fetch push subscriptions for this user
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', dose.user_id);

      if (!subs || subs.length === 0) {
        // Mark as sent anyway so we don't keep retrying
        await supabase.from('glp1_doses').update({ notification_sent: true }).eq('id', dose.id);
        continue;
      }

      const payload = {
        title: `💉 Hora da dose de ${dose.medication}!`,
        body:  dose.dose_mg
          ? `Sua aplicação de ${dose.dose_mg}mg está agendada para agora.`
          : `Sua aplicação de ${dose.medication} está agendada para agora.`,
        tag:  'glp1-dose',
        url:  '/',
      };

      // 3. Send to every subscription endpoint for this user
      const results = await Promise.allSettled(
        subs.map(sub => sendPush(sub, payload))
      );
      const anyOk = results.some(r => r.status === 'fulfilled' && r.value);

      if (anyOk) {
        // 4. Mark notification_sent = true
        await supabase.from('glp1_doses').update({ notification_sent: true }).eq('id', dose.id);
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    console.error('[send-glp1-notifications] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
