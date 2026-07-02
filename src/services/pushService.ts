// =====================================================
// Malama — Web Push (web/PWA)
// Registra a subscription do navegador em push_subscriptions,
// consumida pelas Edge Functions (lembretes de consulta, GLP-1...).
// No app nativo (iOS/Android) o alerta na tela bloqueada vem das
// notificações locais do Capacitor — aqui é no-op (sem PushManager).
// =====================================================

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Convert a base64url VAPID public key to Uint8Array for pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * Subscribe the browser to Web Push and persist the subscription
 * in the push_subscriptions table. Safe to call multiple times.
 * Pede a permissão de notificação se ainda não foi concedida.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY not set — push disabled');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON();
    const { endpoint, keys } = json as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' }
    );

    return true;
  } catch (err) {
    console.error('[push] subscribeToPush error:', err);
    return false;
  }
}
