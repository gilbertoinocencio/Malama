import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
const CHECK_HIDDEN_TAB_MS = 60 * 1000;
const ACTIVITY_KEY_PREFIX = 'malama.auth.lastActivity.';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

/**
 * Desloga o usuário automaticamente após `IDLE_TIMEOUT_MS` de inatividade.
 * @param enabled - ativar somente quando o usuário estiver autenticado.
 */
export function useIdleLogout(enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let activityKey: string | null = null;

    const clearTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const readLastActivity = () => {
      if (!activityKey) return Date.now();
      const parsed = Number(localStorage.getItem(activityKey));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
    };

    const scheduleCheck = (delay = IDLE_TIMEOUT_MS) => {
      clearTimer();
      timerRef.current = setTimeout(() => void checkIdle(), Math.max(1000, delay));
    };

    const checkIdle = async () => {
      if (disposed || !activityKey) return;

      // Uma aba escondida nunca encerra a sessão que pode estar sendo usada
      // em outra aba. Ao voltar a ficar visível, ela consulta o timestamp
      // compartilhado e decide se a sessão realmente ficou ociosa.
      if (document.visibilityState !== 'visible') {
        scheduleCheck(CHECK_HIDDEN_TAB_MS);
        return;
      }

      const elapsed = Date.now() - readLastActivity();
      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearTimer();
        await supabase.auth.signOut();
        return;
      }
      scheduleCheck(IDLE_TIMEOUT_MS - elapsed);
    };

    const markActivity = () => {
      if (!activityKey || document.visibilityState !== 'visible') return;
      localStorage.setItem(activityKey, String(Date.now()));
      scheduleCheck();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkIdle();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === activityKey && event.newValue) {
        scheduleCheck(Math.max(1000, IDLE_TIMEOUT_MS - (Date.now() - Number(event.newValue))));
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (disposed || !data.session?.user.id) return;
      activityKey = `${ACTIVITY_KEY_PREFIX}${data.session.user.id}`;
      if (!localStorage.getItem(activityKey)) localStorage.setItem(activityKey, String(Date.now()));
      void checkIdle();
    });

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, markActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    return () => {
      disposed = true;
      clearTimer();
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, markActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled]);
}
