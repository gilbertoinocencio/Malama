/**
 * useDeviceLevel — reads the phone's tilt so the Body Scan can be captured with a
 * standardized, upright camera geometry (à la Spren's "prop it upright" + bubble level).
 *
 * Why this matters: the px→cm scale and the horizontal width measurements assume the
 * camera is vertical. A side roll (gamma) skews widths; a wrong pitch (beta) skews the
 * vertical perspective. Keeping the phone upright removes a big source of cross-scan
 * variance at the source instead of trying to average it out afterwards.
 *
 * Native: @capacitor/motion 'orientation'. Web/PWA: window 'deviceorientation'
 * (iOS 13+ needs DeviceOrientationEvent.requestPermission, triggered from a gesture).
 */

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

export interface DeviceLevelState {
  /** True once the orientation sensor is actually producing data. */
  available: boolean;
  /** Left-right tilt (gamma), degrees. 0 = not rolled sideways. */
  roll: number;
  /** Front-back tilt (beta), degrees. ~90 = vertical/upright. */
  pitch: number;
  /** Within tolerance for a clean, upright capture. */
  level: boolean;
}

// Generous tolerances — the goal is "roughly upright", not a tripod. Tighten after
// validating against real devices.
const ROLL_TOL = 10;   // ± degrees of side roll allowed
const PITCH_MIN = 55;  // upright window — allows leaning back to frame a standing body
const PITCH_MAX = 115;

const INITIAL: DeviceLevelState = { available: false, roll: 0, pitch: 90, level: false };

export function useDeviceLevel(active: boolean): DeviceLevelState {
  const [state, setState] = useState<DeviceLevelState>(INITIAL);
  const lastEventRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setState(INITIAL);
      return;
    }

    let removeFn: (() => void) | null = null;

    const onOrientation = (beta: number | null, gamma: number | null) => {
      if (beta == null || gamma == null) return;
      lastEventRef.current = Date.now();
      const level =
        Math.abs(gamma) <= ROLL_TOL && beta >= PITCH_MIN && beta <= PITCH_MAX;
      setState({ available: true, roll: gamma, pitch: beta, level });
    };

    const setup = async () => {
      // iOS 13+ requires explicit permission. Best-effort: it must be triggered from
      // a user gesture upstream (the "Iniciar scan" tap), but calling it is harmless.
      try {
        const DOE = (window as unknown as {
          DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
        }).DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === 'function') {
          await DOE.requestPermission().catch(() => {});
        }
      } catch { /* ignore */ }

      if (Capacitor.isNativePlatform()) {
        try {
          const handle = await Motion.addListener('orientation', (e) => {
            onOrientation(e.beta ?? null, e.gamma ?? null);
          });
          removeFn = () => { handle.remove().catch(() => {}); };
          return;
        } catch { /* fall through to web */ }
      }

      const handler = (e: DeviceOrientationEvent) => onOrientation(e.beta, e.gamma);
      window.addEventListener('deviceorientation', handler, true);
      removeFn = () => window.removeEventListener('deviceorientation', handler, true);
    };

    setup();

    // If events stop arriving (sensor unavailable / permission denied), mark
    // unavailable so the capture gate doesn't block the user.
    const watchdog = setInterval(() => {
      if (Date.now() - lastEventRef.current > 1500) {
        setState(s => (s.available ? { ...s, available: false } : s));
      }
    }, 1000);

    return () => {
      if (removeFn) removeFn();
      clearInterval(watchdog);
    };
  }, [active]);

  return state;
}
