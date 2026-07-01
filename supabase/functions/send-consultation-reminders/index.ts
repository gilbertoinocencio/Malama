// =====================================================
// Malama — Edge Function: send-consultation-reminders
// Roda no cron a cada 5 min (via pg_cron).
// Cria a notificação in-app (patient_notifications) e envia
// Web Push (VAPID) para lembretes 24h / 3h / 30min antes da consulta.
// Dedupe via tabela consultation_reminders_sent.
//
// No app nativo (iOS/Android) o alerta na tela bloqueada vem das
// notificações locais (Capacitor). Aqui garantimos o sino in-app e o
// push na web/PWA. Deploy: `supabase functions deploy send-consultation-reminders`.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@soumalama.com.br';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type Kind = '24h' | '3h' | '30min';
const KINDS: Kind[] = ['24h', '3h', '30min'];
const OFFSET_MS: Record<Kind, number> = {
  '24h':  24 * 60 * 60 * 1000,
  '3h':    3 * 60 * 60 * 1000,
  '30min':     30 * 60 * 1000,
};

// ─── VAPID helpers (mesmo padrão de send-glp1-notifications) ──────────────────

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

  let privateKey: CryptoKey;
  try {
    const jwk = JSON.parse(atob(VAPID_PRIVATE.replace(/-/g, '+').replace(/_/g, '/')));
    privateKey = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
    );
  } catch {
    const keyData = Uint8Array.from(
      atob(VAPID_PRIVATE.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0),
    );
    privateKey = await crypto.subtle.importKey(
      'pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
    );
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64urlEncode(signature)}`;
}

async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
): Promise<boolean> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.hostname}`;
  const jwt = await createVapidJwt(audience);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Type':  'application/json',
      'TTL':           '86400',
    },
    body: JSON.stringify(payload),
  });
  return res.status === 201 || res.status === 200;
}

// ─── Conteúdo dos lembretes ───────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

function contentFor(kind: Kind, doctorName: string | null, scheduledAt: string): { title: string; body: string } {
  const doctor = doctorName ? `Dr(a). ${doctorName}` : 'seu médico';
  const time = formatTime(scheduledAt);
  switch (kind) {
    case '24h':
      return { title: 'Consulta amanhã', body: `Amanhã às ${time} você tem consulta com ${doctor}.` };
    case '3h':
      return { title: 'Consulta hoje em 3 horas', body: `Sua consulta com ${doctor} é às ${time}.` };
    case '30min':
      return { title: 'Sua consulta começa em 30 min', body: `Entre pelo app alguns minutos antes do horário (${time}).` };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const in24hIso = new Date(nowMs + OFFSET_MS['24h']).toISOString();

    // Consultas agendadas que começam nas próximas 24h
    const { data: consults, error } = await supabase
      .from('consultations')
      .select('id, patient_id, scheduled_at, created_at, doctors(name)')
      .eq('status', 'scheduled')
      .gt('scheduled_at', nowIso)
      .lte('scheduled_at', in24hIso);

    if (error) throw error;
    if (!consults || consults.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Lembretes já enviados (dedupe)
    const ids = consults.map(c => c.id);
    const { data: sentRows } = await supabase
      .from('consultation_reminders_sent')
      .select('consultation_id, kind')
      .in('consultation_id', ids);
    const sentSet = new Set((sentRows ?? []).map(r => `${r.consultation_id}:${r.kind}`));

    let sent = 0;
    for (const c of consults) {
      const scheduledMs = new Date(c.scheduled_at).getTime();
      const createdMs = c.created_at ? new Date(c.created_at).getTime() : 0;
      const doctorName = (c.doctors as { name?: string } | null)?.name ?? null;

      for (const kind of KINDS) {
        const reminderAtMs = scheduledMs - OFFSET_MS[kind];
        const due = reminderAtMs <= nowMs;            // já passou o momento do lembrete
        const meaningful = reminderAtMs >= createdMs; // lembrete não é anterior ao agendamento
        const already = sentSet.has(`${c.id}:${kind}`);
        if (!due || !meaningful || already) continue;

        const { title, body } = contentFor(kind, doctorName, c.scheduled_at);

        // Sino in-app (sempre)
        await supabase.from('patient_notifications').insert({
          user_id: c.patient_id,
          type: 'consultation_reminder',
          title,
          body,
          data: {
            consultation_id: c.id,
            doctor_name: doctorName,
            scheduled_at: c.scheduled_at,
            reminder_kind: kind,
          },
        });

        // Web Push (best-effort) — web/PWA
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', c.patient_id);
        if (subs && subs.length > 0) {
          const payload = { title, body, tag: `consulta-${c.id}-${kind}`, url: '/?view=minhas-consultas' };
          await Promise.allSettled(subs.map(s => sendPush(s, payload)));
        }

        // Marca como enviado (mesmo sem push — o sino já foi criado)
        await supabase.from('consultation_reminders_sent').insert({ consultation_id: c.id, kind });
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    console.error('[send-consultation-reminders] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
