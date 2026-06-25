/**
 * voiceGuide — platform-aware voice + haptic guidance for the Body Scan.
 *
 * Why this exists:
 *   The Web Speech API (`window.speechSynthesis`) is unreliable inside the Android
 *   WebView — the voice list is often empty and `speak()` silently no-ops, so users
 *   doing a side-profile scan (who can't see the screen) get no guidance at all.
 *
 *   On a native Capacitor platform we therefore drive Android's built-in TTS engine
 *   via @capacitor-community/text-to-speech (offline, reliable) and add Haptics for
 *   non-visual cues. On the web/PWA we fall back to the Web Speech API.
 *
 * All functions are fire-and-forget and swallow their own errors — guidance must
 * never block or crash the scan loop.
 */

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

// ─── Web Speech fallback voice resolution ───────────────────────────────────────

let webVoice: SpeechSynthesisVoice | null = null;
let webVoiceWired = false;

/** Resolve and cache the best pt-BR (or pt-*) voice for the Web Speech fallback. */
function resolveWebVoice(): void {
  if (!('speechSynthesis' in window)) return;
  let voices: SpeechSynthesisVoice[] = [];
  try { voices = window.speechSynthesis.getVoices(); } catch { return; }
  if (!voices.length) return;
  webVoice =
    voices.find(v => v.lang?.toLowerCase() === 'pt-br') ??
    voices.find(v => v.lang?.toLowerCase().startsWith('pt')) ??
    null;
}

/**
 * Prime the speech engine. MUST be called from a user gesture (e.g. the "Iniciar
 * Scan" tap) so the first real instruction isn't swallowed:
 *   - native: nudges the TTS engine awake.
 *   - web: wires the async 'voiceschanged' listener and unlocks audio with a near
 *     silent utterance.
 */
export async function primeVoice(): Promise<void> {
  try {
    if (isNative) {
      // A zero-text speak warms the engine without an audible artifact on most devices.
      await TextToSpeech.speak({ text: ' ', lang: 'pt-BR', rate: 1.0 }).catch(() => {});
      return;
    }
    if (!('speechSynthesis' in window)) return;
    if (!webVoiceWired) {
      webVoiceWired = true;
      window.speechSynthesis.addEventListener?.('voiceschanged', resolveWebVoice);
    }
    resolveWebVoice();
    // Unlock audio context with an inaudible utterance triggered by the gesture.
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    warm.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(warm);
  } catch {
    /* non-blocking */
  }
}

// ─── Speech ──────────────────────────────────────────────────────────────────

/**
 * Priority lock: while a milestone announcement (announce) "owns" the audio
 * channel, reactive positioning guidance (speak) yields instead of cutting it
 * off. Without this, the per-frame guidance + 6 s repeat timer trample the
 * milestone phrases ("frente registrada", "agora a última amostra").
 */
let announceLockUntil = 0;

/** Rough spoken duration of a pt-BR phrase, used to hold the priority lock. */
function estimateDurationMs(text: string): number {
  return Math.min(9000, Math.max(1200, text.length * 60));
}

/** Low-level speak — cancels whatever was being said and speaks `text`. */
async function rawSpeak(text: string): Promise<void> {
  try {
    if (isNative) {
      await TextToSpeech.stop().catch(() => {});
      await TextToSpeech.speak({
        text,
        lang: 'pt-BR',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'playback',
      });
      return;
    }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'pt-BR';
    if (!webVoice) resolveWebVoice();
    if (webVoice) utt.voice = webVoice;
    utt.rate = 0.95;
    utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  } catch {
    /* WebView without a usable TTS engine — visual + haptic guidance still works */
  }
}

/**
 * Reactive guidance phrase (positioning hints). Yields to an in-flight
 * announcement so milestones are never cut off mid-sentence; it will simply
 * re-fire on the next frame once the lock expires.
 */
export async function speak(text: string): Promise<void> {
  if (!text) return;
  if (Date.now() < announceLockUntil) return;
  await rawSpeak(text);
}

/**
 * Milestone announcement (session intro, capture confirmations, cycle cues).
 * Always interrupts and holds the priority lock for its estimated duration so
 * reactive guidance won't talk over it.
 */
export async function announce(text: string): Promise<void> {
  if (!text) return;
  announceLockUntil = Date.now() + estimateDurationMs(text);
  await rawSpeak(text);
}

/** Stop any ongoing speech and release the priority lock (real teardown only). */
export async function stopSpeaking(): Promise<void> {
  announceLockUntil = 0;
  try {
    if (isNative) {
      await TextToSpeech.stop().catch(() => {});
      return;
    }
    window.speechSynthesis?.cancel();
  } catch {
    /* non-blocking */
  }
}

// ─── Haptics ───────────────────────────────────────────────────────────────────

/** Light tap — pose just became valid / a soft progress beat. */
export async function hapticTick(): Promise<void> {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* no-op */ }
}

/** Medium tap — meaningful transition (e.g. front capture done, now turn). */
export async function hapticStep(): Promise<void> {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { /* no-op */ }
}

/** Strong success buzz — frame captured. Felt even when the phone is propped. */
export async function hapticSuccess(): Promise<void> {
  if (!isNative) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* no-op */ }
}
