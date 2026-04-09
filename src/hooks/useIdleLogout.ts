import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

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

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
      }, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [enabled]);
}
