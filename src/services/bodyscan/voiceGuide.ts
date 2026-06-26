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
 * Serialization. The overlap the user saw came from CONCURRENT speech calls: the
 * old time-estimated lock expired before the native TTS actually finished, so the
 * per-frame guidance + 6 s repeat timer started a second utterance on top of the
 * first. We now allow only ONE utterance at a time and resolve on its REAL end:
 *   - `locked` is held for the whole duration of an utterance (a true mutex).
 *   - reactive `speak` SKIPS while busy (it re-fires later via the repeat timer).
 *   - `announce` (milestones) cuts in-flight reactive guidance and then speaks.
 */
let locked = false;       // an utterance is currently playing
let announcing = false;   // a milestone owns the channel → reactive guidance yields

/** True while a phrase is being spoken — lets callers avoid stacking new speech. */
export function isSpeaking(): boolean {
  return locked;
}

/** Stop whatever is playing now (does not touch the `announcing` intent flag). */
async function stopCurrent(): Promise<void> {
  try {
    if (isNative) { await TextToSpeech.stop().catch(() => {}); return; }
    window.speechSynthesis?.cancel();
  } catch { /* non-blocking */ }
}

/** Wait (briefly) for an in-flight utterance to release the mutex. */
async function waitUnlock(): Promise<void> {
  for (let i = 0; locked && i < 60; i++) {
    await new Promise(r => setTimeout(r, 50)); // ~3 s safety cap
  }
}

/**
 * Low-level speak that RESOLVES WHEN SPEECH ACTUALLY ENDS. Native TTS resolves its
 * own promise on completion; the Web Speech fallback is wrapped so onend/onerror
 * resolve it. Knowing the real end is what prevents the next phrase from cutting in.
 */
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
    await new Promise<void>((resolve) => {
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      window.speechSynthesis.speak(utt);
    });
  } catch {
    /* WebView without a usable TTS engine — visual + haptic guidance still works */
  }
}

/**
 * Reactive guidance phrase (positioning hints). Skips if something is already
 * being spoken (a milestone or a previous hint) so phrases never overlap; the
 * per-state effect / repeat timer re-issues it once the channel is free.
 */
export async function speak(text: string): Promise<void> {
  if (!text || locked || announcing) return;
  locked = true;
  try { await rawSpeak(text); } finally { locked = false; }
}

/**
 * Milestone announcement (session intro, capture confirmations, cycle cues).
 * Cuts any in-flight reactive guidance and owns the channel until it finishes,
 * so nothing talks over it.
 */
export async function announce(text: string): Promise<void> {
  if (!text) return;
  announcing = true;
  try {
    await stopCurrent();   // cut a reactive phrase that may be playing
    await waitUnlock();    // let its mutex release
    locked = true;
    try { await rawSpeak(text); } finally { locked = false; }
  } finally {
    announcing = false;
  }
}

/** Stop any ongoing speech and clear all speech state (real teardown only). */
export async function stopSpeaking(): Promise<void> {
  announcing = false;
  locked = false;
  await stopCurrent();
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
