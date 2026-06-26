/**
 * BodyScanCamera — real-time pose-guided camera component.
 *
 * Pipeline per frame:
 *   1. MediaPipe → landmarks
 *   2. validateDistance → full-body-in-frame + distance feedback
 *   3. detectPoseOrientation → confirms correct pose (distance-invariant)
 *   4. LivenessDetector (right-arm raise)  ← only for the first scan, hands-on mode
 *   5. StabilityDetector (2 s hold)
 *   6. Auto-capture → computeMeasurements → onCapture callback
 *
 * UX features:
 *   - Native voice guidance (Android/iOS TTS) + Web Speech fallback — audible even
 *     when the user is in profile and can't see the screen.
 *   - Haptic cues (pose valid / capture) for non-visual confirmation.
 *   - Anti-flicker: spoken guidance only changes once a state persists a few frames.
 *   - Front-camera mirror so left/right feels natural.
 *   - Hands-free mode: a single spoken intro to prop the phone and step back, then it
 *     captures automatically guided by voice + vibration.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceLevel } from '../hooks/useDeviceLevel';
import {
  MediaPipeProvider,
  LivenessDetector,
  StabilityDetector,
  validateDistance,
  detectPoseOrientation,
  computeMeasurements,
  primeVoice,
  speak,
  announce,
  isSpeaking,
  stopSpeaking,
  hapticTick,
  hapticStep,
  hapticSuccess,
  type AnthroMeasurements,
  type PoseLandmark,
  type PoseOrientation,
} from '../services/bodyscan';
import { LANDMARK_INDEX as LM } from '../services/bodyscan';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScanPose = 'front' | 'side';

export interface BodyScanCaptureResult {
  pose: ScanPose;
  measurements: AnthroMeasurements;
  /** Raw landmarks from the captured frame — used by BodyScanner to recompute
   *  measurements with depth information from the paired side/front scan. */
  landmarks: PoseLandmark[];
  frameWidth: number;
  frameHeight: number;
  /** JPEG data-URL of the captured frame (not uploaded — stays on device) */
  imageDataUrl: string;
}

interface BodyScanCameraProps {
  /** Which pose to guide the user into */
  pose: ScanPose;
  /** Whether to run liveness check (raise right arm) before allowing capture */
  requireLiveness?: boolean;
  /**
   * Hands-free mode for solo self-scans: speaks a single opening instruction so
   * the user can prop the phone and step back, and disables the arm-raise liveness
   * (impossible to perform while far from a propped phone).
   */
  handsFree?: boolean;
  /** Total target cycles in the session (TARGET_VALID) — spoken in the intro. */
  totalCycles?: number;
  /**
   * Whether to play the full spoken intro + step-back grace window. Only true for
   * the very first scan of the session; later poses go straight to guidance since
   * the user is already positioned and just rotates in place.
   */
  showIntro?: boolean;
  heightCm: number;
  weightKg: number;
  age: number;
  gender: 'male' | 'female';
  onCapture: (result: BodyScanCaptureResult) => void;
  onError?: (msg: string) => void;
}

// ─── Step state ────────────────────────────────────────────────────────────────

type CameraStep =
  | 'loading'       // MediaPipe initialising
  | 'intro'         // hands-free: spoken opening + step-back grace window
  | 'liveness'      // waiting for right-arm raise
  | 'positioning'   // pose / distance validation
  | 'stable'        // 2-s countdown
  | 'captured';     // frame captured, processing

// ─── Guidance phrases ───────────────────────────────────────────────────────────

type GuidanceKey =
  | 'no_pose'
  | 'step_back'
  | 'come_closer'
  | 'turn_front'
  | 'turn_side'
  | 'level_phone'
  | 'raise_arms'
  | 'liveness'
  | 'hold_still';

/** Number of consecutive frames a guidance state must persist before we announce it.
 *  Prevents the voice from contradicting itself on momentary tracking jitter. */
const GUIDANCE_DEBOUNCE_FRAMES = 8;

/** Minimum time before the spoken guidance may switch to a *different* phrase.
 *  Stops the voice flip-flopping ("afaste-se"/"aproxime-se") at borderline distance. */
const GUIDANCE_MIN_SWITCH_MS = 1800;

// ─── Distance hysteresis (anti flip-flop) ────────────────────────────────────────
// Smoothing + a dead-band around the valid distance window so per-frame landmark
// jitter doesn't bounce the status between too_close/too_far/ok.
const DIST_EMA_ALPHA   = 0.3;   // weight of the newest frame in the moving average
const DIST_ENTER_NEAR  = 0.64;  // enter "ok" only inside this tighter window …
const DIST_ENTER_FAR   = 0.90;
const DIST_EXIT_NEAR   = 0.60;  // … but leave "ok" only past this wider band
const DIST_EXIT_FAR    = 0.94;

// ─── Overlay drawing helpers ────────────────────────────────────────────────────

const GUIDE_COLOR = 'rgba(255,255,255,0.40)';
const VALID_COLOR = 'rgba(134,168,141,0.85)'; // sage green

function drawGuideLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  valid: boolean,
) {
  ctx.clearRect(0, 0, w, h);

  // Frame border
  ctx.strokeStyle = valid ? VALID_COLOR : GUIDE_COLOR;
  ctx.lineWidth = valid ? 2 : 1;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // Thin horizontal thirds
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1;
  for (const frac of [0.33, 0.66]) {
    ctx.beginPath();
    ctx.moveTo(0, h * frac);
    ctx.lineTo(w, h * frac);
    ctx.stroke();
  }

  // Thin vertical centre
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
}

function drawLandmarkDots(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  w: number,
  h: number,
) {
  const keyIndices = [
    LM.NOSE,
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
  ];

  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  for (const i of keyIndices) {
    const lm = landmarks[i];
    if (!lm || (lm.visibility ?? 0) < 0.4) continue;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Skeleton lines
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  const pairs: [number, number][] = [
    [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
    [LM.LEFT_SHOULDER, LM.LEFT_HIP],
    [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
    [LM.LEFT_HIP, LM.RIGHT_HIP],
    [LM.LEFT_HIP, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_ANKLE],
  ];
  for (const [a, b] of pairs) {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    if (!lmA || !lmB) continue;
    if ((lmA.visibility ?? 0) < 0.4 || (lmB.visibility ?? 0) < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(lmA.x * w, lmA.y * h);
    ctx.lineTo(lmB.x * w, lmB.y * h);
    ctx.stroke();
  }
}

/**
 * Both arms raised / abducted (Spren-style "cactus" pose) so the torso silhouette
 * is clean and separated from the arms — essential for reliable width measurement
 * (and for the silhouette-based depth in the next phase). y grows downward, so a
 * raised wrist has a SMALLER y than its shoulder. Small margin guards against jitter.
 */
function armsRaised(landmarks: PoseLandmark[]): boolean {
  const lw = landmarks[LM.LEFT_WRIST];
  const rw = landmarks[LM.RIGHT_WRIST];
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  if (!lw || !rw || !ls || !rs) return false;
  const visOk = [lw, rw, ls, rs].every(l => (l.visibility ?? 0) > 0.4);
  if (!visOk) return false;
  return lw.y < ls.y - 0.03 && rw.y < rs.y - 0.03;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const BodyScanCamera: React.FC<BodyScanCameraProps> = ({
  pose,
  requireLiveness = true,
  handsFree = false,
  totalCycles = 3,
  showIntro = true,
  heightCm,
  weightKg,
  age,
  gender,
  onCapture,
  onError,
}) => {
  // In hands-free mode the arm-raise liveness is impossible (user is far from a
  // propped phone), so we always skip it.
  const livenessEnabled = requireLiveness && !handsFree;

  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const providerRef   = useRef<MediaPipeProvider | null>(null);
  const livenessRef   = useRef(new LivenessDetector());
  const stabilityRef  = useRef(new StabilityDetector(2000));
  const prevLandmarks = useRef<PoseLandmark[] | null>(null);
  const rafRef        = useRef<number>(0);
  const capturedRef   = useRef(false);
  /** Always holds the freshest statusMsg for use inside interval callbacks. */
  const statusMsgRef  = useRef('');
  /** Interval ID for periodic re-speak when user is stuck in same state. */
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Prevents saying the stability greeting more than once per pose cycle. */
  const stableGreetedRef = useRef(false);
  /** True while the hands-free intro / step-back grace is running — blocks capture. */
  const introActiveRef = useRef(false);
  /** Timer ID for the intro grace window, so restarts don't overlap. */
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Debounce bookkeeping for spoken guidance. */
  const pendingKeyRef   = useRef<{ key: GuidanceKey; count: number } | null>(null);
  const committedKeyRef = useRef<GuidanceKey | null>(null);
  /** Timestamp of the last committed guidance switch (for the min-switch cooldown). */
  const lastSwitchAtRef = useRef(0);
  /** EMA of the distance fraction + last stable status (distance hysteresis). */
  const distEmaRef      = useRef<number | null>(null);
  const distStatusRef   = useRef<'too_close' | 'too_far' | 'ok'>('too_far');

  // Front camera by default: in a solo self-scan the user needs to see the on-screen guide and
  // hear the voice prompts while positioning. The flip button switches to the rear camera for
  // higher quality when someone else is holding the phone.
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [step, setStep]             = useState<CameraStep>('loading');
  const [statusMsg, setStatusMsg]   = useState('Inicializando...');
  const [stabilityPct, setStabilityPct] = useState(0);
  const [livenessPct, setLivenessPct]   = useState(0);
  const [frameValid, setFrameValid]     = useState(false);
  const [distanceStatus, setDistanceStatus] = useState<'too_close' | 'too_far' | 'ok'>('too_far');

  // Device tilt (Spren-style upright/level capture). Active while the camera runs.
  // Only gates capture in hands-free mode (propped phone) — when the user holds the
  // phone there's nothing to "level". A ref mirrors it for the rAF loop closure.
  const level = useDeviceLevel(step !== 'loading' && step !== 'captured');
  const levelRef = useRef(level);
  levelRef.current = level;

  // Guidance phrases — short, warm, imperative (good for audio-only guidance).
  const guidanceMsg = useCallback((key: GuidanceKey): string => {
    switch (key) {
      case 'no_pose':
        return pose === 'front'
          ? 'Apareça inteiro na câmera, da cabeça aos pés'
          : 'Fique de lado e apareça inteiro na câmera';
      case 'step_back':   return 'Afaste-se até aparecer o corpo todo';
      case 'come_closer': return 'Aproxime-se um pouco';
      case 'turn_front':  return 'Fique de frente para a câmera';
      case 'turn_side':   return 'Vire de lado, fique de perfil para a câmera';
      case 'level_phone': return 'Endireite o celular, deixe ele reto e em pé';
      case 'raise_arms':  return 'Levante os braços, afastados do corpo';
      case 'liveness':    return 'Levante o braço direito acima do ombro';
      case 'hold_still':  return 'Isso! Perfeito, fique bem imóvel';
    }
  }, [pose]);

  /**
   * Commit a guidance state only after it persists GUIDANCE_DEBOUNCE_FRAMES frames
   * AND at least GUIDANCE_MIN_SWITCH_MS elapsed since the last switch. The visual
   * frame validity updates every frame elsewhere; this gates only the textual +
   * spoken message so the voice never flip-flops on tracking jitter. 'hold_still'
   * (positive lock-in) is exempt from the cooldown so success feedback stays snappy.
   */
  const commitGuidance = useCallback((key: GuidanceKey) => {
    if (committedKeyRef.current === key) return;
    const pending = pendingKeyRef.current;
    if (pending && pending.key === key) {
      pending.count += 1;
      if (pending.count >= GUIDANCE_DEBOUNCE_FRAMES) {
        const now = Date.now();
        const cooling =
          key !== 'hold_still' &&
          committedKeyRef.current !== null &&
          now - lastSwitchAtRef.current < GUIDANCE_MIN_SWITCH_MS;
        if (cooling) return; // keep the current phrase a bit longer; re-evaluate next frame
        committedKeyRef.current = key;
        lastSwitchAtRef.current = now;
        pendingKeyRef.current = null;
        setStatusMsg(guidanceMsg(key));
      }
    } else {
      pendingKeyRef.current = { key, count: 1 };
    }
  }, [guidanceMsg]);

  // ── Voice guidance ───────────────────────────────────────────────────────────
  // speak()/stopSpeaking() live in voiceGuide (native TTS + Web Speech fallback).

  // Keep ref in sync so interval callback always reads the freshest message
  statusMsgRef.current = statusMsg;

  // Speak immediately when message changes; repeat every 6 s while stuck in same state.
  // This ensures the user hears guidance even if they miss the first prompt.
  // voiceGuide.speak() self-gates (skips while busy), so this never overlaps; the
  // explicit isSpeaking() guard just avoids queuing a redundant repeat.
  useEffect(() => {
    if (step === 'loading' || step === 'captured' || step === 'intro' || !statusMsg) {
      if (repeatTimerRef.current) { clearInterval(repeatTimerRef.current); repeatTimerRef.current = null; }
      return;
    }

    speak(statusMsg);

    if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    repeatTimerRef.current = setInterval(() => {
      if (!isSpeaking()) speak(statusMsgRef.current);
    }, 6000);

    return () => {
      if (repeatTimerRef.current) { clearInterval(repeatTimerRef.current); repeatTimerRef.current = null; }
    };
  }, [statusMsg, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera ─────────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  /**
   * Start camera with the given facing mode.
   * Receives `facing` as a parameter so the callback doesn't depend on
   * `facingMode` state — avoids stale-closure issues.
   */
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.('Câmera não suportada neste dispositivo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        onError?.('Permissão de câmera negada. Permita o acesso nas configurações.');
      } else {
        onError?.('Não foi possível acessar a câmera.');
      }
    }
  }, [onError]);

  // ── Capture ─────────────────────────────────────────────────────────────────

  const captureFrame = useCallback(
    (landmarks: PoseLandmark[], frameW: number, frameH: number) => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      setStep('captured');
      cancelAnimationFrame(rafRef.current);

      const measurements = computeMeasurements({
        landmarks,
        frameWidth: frameW,
        frameHeight: frameH,
        heightCm,
        weightKg,
        age,
        gender,
      });

      if (!measurements) {
        capturedRef.current = false;
        setStep('positioning');
        onError?.('Não foi possível calcular as medidas. Tente novamente.');
        return;
      }

      // Multisensory capture confirmation — felt and seen, even in profile.
      // The spoken milestone ("frente registrada", "primeira amostra…") is owned by
      // the orchestrator (BodyScanner), which knows whether the sample was accepted.
      hapticSuccess();
      if (pose === 'front') hapticStep();

      // Capture JPEG — stays 100% local, never uploaded
      const canvas = document.createElement('canvas');
      canvas.width  = frameW;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0);
      }
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();

      onCapture({ pose, measurements, landmarks, frameWidth: frameW, frameHeight: frameH, imageDataUrl });
    },
    [heightCm, weightKg, age, gender, pose, onCapture, onError, stopCamera],
  );

  // ── Inference loop ──────────────────────────────────────────────────────────

  const runLoop = useCallback(() => {
    const provider = providerRef.current;
    const video    = videoRef.current;
    const canvas   = canvasRef.current;

    if (!provider?.isReady() || !video || video.readyState < 2 || !canvas) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const frameW = video.videoWidth;
    const frameH = video.videoHeight;
    canvas.width  = frameW;
    canvas.height = frameH;

    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(runLoop); return; }

    provider.analyzeFrame(video).then((frame) => {
      const now = frame.timestamp;

      // ── No pose detected ────────────────────────────────────────────────
      if (!frame.poseDetected || !frame.result) {
        commitGuidance('no_pose');
        drawGuideLines(ctx, frameW, frameH, false);
        setFrameValid(false);
        if (!introActiveRef.current) setStep('positioning');
        rafRef.current = requestAnimationFrame(runLoop);
        return;
      }

      const { landmarks } = frame.result;

      // Distance (full-body-in-frame aware) + smoothing & hysteresis so the spoken
      // guidance doesn't flip-flop between "afaste-se"/"aproxime-se" at a borderline
      // distance. Large fraction = too close; small fraction = too far.
      const rawDist = validateDistance(landmarks, frameH);
      let effStatus: 'too_close' | 'too_far' | 'ok';
      if (!rawDist.bodyInFrame) {
        // Ankles not framed → fraction is bogus; force step-back and reset the EMA.
        distEmaRef.current = null;
        effStatus = rawDist.status;
      } else {
        const ema = distEmaRef.current == null
          ? rawDist.fraction
          : distEmaRef.current * (1 - DIST_EMA_ALPHA) + rawDist.fraction * DIST_EMA_ALPHA;
        distEmaRef.current = ema;
        if (distStatusRef.current === 'ok') {
          effStatus = ema < DIST_EXIT_NEAR ? 'too_far'
            : ema > DIST_EXIT_FAR ? 'too_close'
            : 'ok';
        } else {
          effStatus = (ema >= DIST_ENTER_NEAR && ema <= DIST_ENTER_FAR) ? 'ok'
            : ema < DIST_ENTER_NEAR ? 'too_far'
            : 'too_close';
        }
      }
      distStatusRef.current = effStatus;
      const dist = {
        valid: effStatus === 'ok',
        fraction: rawDist.fraction,
        status: effStatus,
        bodyInFrame: rawDist.bodyInFrame,
      };
      setDistanceStatus(effStatus);

      // Orientation (distance-invariant)
      const orientation = detectPoseOrientation(landmarks);
      const expectedOrientation: PoseOrientation = pose === 'front' ? 'frontal' : 'side';
      const orientationOk = orientation === expectedOrientation;
      const positionOk = dist.valid && orientationOk;

      // Standardization gates (Spren-inspired):
      //  - phone roughly upright — hands-free / propped only; skip if no sensor data.
      //  - front capture needs arms raised for a clean torso silhouette.
      const phoneLevelOk = !handsFree || !levelRef.current.available || levelRef.current.level;
      const armsOk = pose !== 'front' || armsRaised(landmarks);
      const ready = positionOk && phoneLevelOk && armsOk;

      setFrameValid(ready);
      drawGuideLines(ctx, frameW, frameH, ready);
      drawLandmarkDots(ctx, landmarks, frameW, frameH);

      // While the hands-free intro grace runs, only give positioning guidance —
      // never capture yet (gives the user time to get into place).
      const captureBlocked = introActiveRef.current;

      // ── Liveness (hands-on first scan only, AND only once well-positioned) ─
      if (livenessEnabled && !livenessRef.current.validated) {
        if (!positionOk) {
          // Guide them into frame first; don't ask for the arm raise yet.
          stabilityRef.current.reset();
          setStabilityPct(0);
          if (!dist.valid) {
            commitGuidance(dist.status === 'too_close' ? 'step_back' : 'come_closer');
          } else {
            commitGuidance(pose === 'front' ? 'turn_front' : 'turn_side');
          }
          setStep('positioning');
          prevLandmarks.current = landmarks;
          rafRef.current = requestAnimationFrame(runLoop);
          return;
        }
        setStep('liveness');
        setLivenessPct(livenessRef.current.progress);
        livenessRef.current.addFrame(landmarks);
        commitGuidance('liveness');
        prevLandmarks.current = landmarks;
        rafRef.current = requestAnimationFrame(runLoop);
        return;
      }

      // ── Positioning ─────────────────────────────────────────────────────
      if (!ready) {
        stableGreetedRef.current = false;
        stabilityRef.current.reset();
        setStabilityPct(0);

        if (!dist.valid) {
          commitGuidance(dist.status === 'too_close' ? 'step_back' : 'come_closer');
        } else if (!orientationOk) {
          commitGuidance(pose === 'front' ? 'turn_front' : 'turn_side');
        } else if (!phoneLevelOk) {
          commitGuidance('level_phone');
        } else if (!armsOk) {
          commitGuidance('raise_arms');
        }

        setStep('positioning');
        prevLandmarks.current = landmarks;
        rafRef.current = requestAnimationFrame(runLoop);
        return;
      }

      // ── Stable: pose is correct ──────────────────────────────────────────
      setStep('stable');
      commitGuidance('hold_still');
      if (!stableGreetedRef.current) {
        stableGreetedRef.current = true;
        hapticTick(); // felt confirmation that the pose locked in
      }

      // During the hands-free intro grace we hold here without capturing.
      if (captureBlocked) {
        stabilityRef.current.reset();
        setStabilityPct(0);
        prevLandmarks.current = landmarks;
        rafRef.current = requestAnimationFrame(runLoop);
        return;
      }

      // ── Stability hold → capture ─────────────────────────────────────────
      const isStable = stabilityRef.current.addFrame(landmarks, prevLandmarks.current, now);
      setStabilityPct(stabilityRef.current.progress);
      prevLandmarks.current = landmarks;

      if (isStable) {
        captureFrame(landmarks, frameW, frameH);
        return;
      }

      rafRef.current = requestAnimationFrame(runLoop);
    });
  }, [pose, livenessEnabled, handsFree, captureFrame, commitGuidance]);

  // ── Hands-free spoken intro + step-back grace ─────────────────────────────────
  // Replaces the old numeric countdown: a single flowing announcement explaining the
  // multi-sample scan, then a fixed grace window so the user can prop the phone and
  // step back. No spoken numbers — the milestone narration carries the experience.

  const GRACE_MS = 9000;

  const startIntro = useCallback(() => {
    // Clear any intro grace already in flight (e.g. user tapped "Recomeçar").
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    introActiveRef.current = true;
    setStep('intro');

    const count = totalCycles === 3 ? 'três' : String(totalCycles);
    announce(
      `Vamos começar o Body Scan. Vou tirar ${count} amostras de frente e ${count} de lado ` +
      'para uma avaliação precisa. Apoie o celular num lugar firme e afaste-se até aparecer ' +
      'o corpo inteiro.',
    );

    const id = setTimeout(() => {
      introTimerRef.current = null;
      introActiveRef.current = false;
      stabilityRef.current.reset();
      setStep('positioning');
      announce('Pode se posicionar, vou te guiar pela voz.');
    }, GRACE_MS);
    introTimerRef.current = id;

    return () => { clearTimeout(id); introTimerRef.current = null; };
  }, [totalCycles]);

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  // Reruns when `pose` OR `facingMode` changes.
  // MediaPipe WASM is browser-cached after first load, so reinit on flip is fast.

  useEffect(() => {
    let mounted = true;
    let cancelIntro: (() => void) | undefined;
    capturedRef.current = false;
    stableGreetedRef.current = false;
    introActiveRef.current = false;
    pendingKeyRef.current = null;
    committedKeyRef.current = null;
    lastSwitchAtRef.current = 0;
    distEmaRef.current = null;
    distStatusRef.current = 'too_far';
    stabilityRef.current.reset();
    livenessRef.current.reset();
    prevLandmarks.current = null;
    if (repeatTimerRef.current) { clearInterval(repeatTimerRef.current); repeatTimerRef.current = null; }
    setStep('loading');

    const provider = new MediaPipeProvider();
    providerRef.current = provider;

    (async () => {
      try {
        await startCamera(facingMode);
        if (!mounted) return;
        await provider.initialize();
        if (!mounted) return;

        // Full spoken intro + step-back grace only on the very first (front) scan
        // of the session; later poses go straight to guidance (user is already in
        // place and just rotates).
        if (handsFree && showIntro && pose === 'front') {
          cancelIntro = startIntro();
        } else {
          setStep(livenessEnabled ? 'liveness' : 'positioning');
          setStatusMsg(
            livenessEnabled
              ? 'Levante o braço direito acima do ombro'
              : pose === 'front'
                ? 'Fique de frente e apareça da cabeça aos pés'
                : 'Fique de perfil e apareça da cabeça aos pés',
          );
        }
        rafRef.current = requestAnimationFrame(runLoop);
      } catch (err) {
        console.error('[BodyScanCamera] init error:', err);
        onError?.('Falha ao inicializar análise de pose. Verifique sua conexão.');
      }
    })();

    return () => {
      mounted = false;
      cancelIntro?.();
      if (introTimerRef.current) { clearTimeout(introTimerRef.current); introTimerRef.current = null; }
      cancelAnimationFrame(rafRef.current);
      stopCamera();
      provider.destroy();
      // NOTE: stopSpeaking() is intentionally NOT called here. This cleanup also
      // runs on every pose transition (front→side→next cycle), and cutting speech
      // here would chop the orchestrator's milestone announcements. Speech is only
      // torn down on true unmount (real close) by the dedicated effect below.
      if (repeatTimerRef.current) { clearInterval(repeatTimerRef.current); repeatTimerRef.current = null; }
    };
  }, [pose, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop speech only on true unmount (real close), so it survives pose transitions.
  useEffect(() => () => { stopSpeaking(); }, []);

  // ── Derived UI ──────────────────────────────────────────────────────────────

  const borderClass = '';

  const distanceLabel =
    distanceStatus === 'too_close'
      ? 'Afaste-se'
      : distanceStatus === 'too_far'
        ? 'Aproxime-se'
        : 'Distância ✓';

  // Front camera is mirrored so left/right feels natural (like a mirror).
  // The overlay canvas gets the same transform to stay aligned with the video.
  const mirrorStyle = facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden">
      {/* Live video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={mirrorStyle}
        playsInline
        muted
        autoPlay
      />

      {/* Overlay canvas (pose dots + guide lines) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-all duration-700 ${borderClass}`}
        style={mirrorStyle}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4"
          >
            <div className="w-8 h-8 border border-white/30 border-t-white/80 rounded-full animate-spin" />
            <p className="text-white/60 text-sm font-light tracking-widest uppercase">
              Carregando IA
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hands-free spoken intro — step-back grace (no numeric countdown) */}
      <AnimatePresence>
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0a0a]/70 flex flex-col items-center justify-center gap-4 px-10 text-center"
          >
            <span
              className="material-symbols-outlined text-white/70"
              style={{ fontSize: 56 }}
            >
              record_voice_over
            </span>
            <p
              className="text-white text-xl leading-snug"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Apoie o celular e se afaste
            </p>
            <p className="text-white/50 text-xs font-light tracking-widest uppercase">
              Vou te guiar pela voz
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step progress bars — top centre */}
      {step !== 'loading' && (
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-14">
          {(['liveness', 'positioning', 'stable'] as CameraStep[]).map((s, i) => (
            <div
              key={s}
              className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                step === s
                  ? 'bg-white/70'
                  : i < (['liveness', 'positioning', 'stable'] as CameraStep[]).indexOf(step)
                    ? 'bg-white/40'
                    : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      )}

      {/* Camera flip button — top left */}
      {step !== 'loading' && step !== 'captured' && (
        <button
          onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
          className="absolute top-10 left-4 bg-black/40 backdrop-blur-md p-2.5 rounded-full border border-white/20 text-white/80 active:scale-95 transition-transform z-10"
          aria-label="Alternar câmera"
        >
          <span className="material-symbols-outlined text-xl leading-none">flip_camera_ios</span>
        </button>
      )}

      {/* Bubble level — top right (hands-free / propped phone, when sensor available) */}
      {handsFree && level.available && step !== 'loading' && step !== 'captured' && (
        <div className="absolute top-10 right-4 z-10 flex flex-col items-center gap-1">
          <div className="relative w-24 h-6 rounded-full bg-black/40 backdrop-blur-md border border-white/20 overflow-hidden">
            {/* centre target zone */}
            <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-6 border-x border-white/15" />
            {/* bubble — x reflects side roll, colour reflects level */}
            <div
              className={`absolute top-1/2 w-4 h-4 rounded-full transition-all duration-150 ${
                level.level ? 'bg-emerald-400' : 'bg-amber-300'
              }`}
              style={{
                left: `calc(50% + ${Math.max(-1, Math.min(1, level.roll / 30)) * 38}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
          <span className="text-white/60 text-[10px] font-light tracking-wider uppercase">
            {level.level ? 'Nivelado' : 'Endireite o celular'}
          </span>
        </div>
      )}

      {/* Hands-free restart button — top centre-left (only during the intro grace) */}
      {handsFree && showIntro && step === 'intro' && (
        <button
          onClick={() => startIntro()}
          className="absolute top-10 left-16 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 text-white/80 active:scale-95 transition-transform z-10 flex items-center gap-1.5"
          aria-label="Recomeçar instruções"
        >
          <span className="material-symbols-outlined text-base leading-none">replay</span>
          <span className="text-xs font-light">Recomeçar</span>
        </button>
      )}

      {/* Status banner — large, full-width, bottom centre */}
      <AnimatePresence mode="wait">
        {step !== 'loading' && step !== 'captured' && step !== 'intro' && (
          <motion.div
            key={statusMsg}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-24 left-4 right-4"
          >
            <div className="bg-black/70 backdrop-blur-md rounded-2xl px-5 py-4 text-center border border-white/10">
              <p className="text-white text-lg font-medium leading-snug">{statusMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liveness progress arc — right side */}
      <AnimatePresence>
        {step === 'liveness' && (
          <motion.div
            key="liveness"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col items-center gap-2"
          >
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              <circle
                cx="22" cy="22" r="18"
                fill="none" stroke="rgba(134,168,141,0.85)" strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - livenessPct)}`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <span className="text-white/50 text-[10px] tracking-wider uppercase">Braço</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stability countdown arc */}
      <AnimatePresence>
        {step === 'stable' && (
          <motion.div
            key="stable"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-40 left-0 right-0 flex justify-center"
          >
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
              <circle
                cx="28" cy="28" r="22"
                fill="none" stroke="rgba(134,168,141,0.90)" strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - stabilityPct)}`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                className="transition-all duration-100"
              />
              <text
                x="28" y="33"
                textAnchor="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize="13"
                fontFamily="Playfair Display, serif"
              >
                {Math.ceil((1 - stabilityPct) * 2)}s
              </text>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distance badge — top right */}
      {step !== 'loading' && step !== 'liveness' && step !== 'intro' && (
        <div className="absolute top-10 right-4">
          <div
            className={`text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md border font-light tracking-wider uppercase transition-colors duration-300 ${
              distanceStatus === 'ok'
                ? 'bg-[#86a88d]/20 border-[#86a88d]/40 text-[#86a88d]'
                : 'bg-white/10 border-white/20 text-white/60'
            }`}
          >
            {distanceLabel}
          </div>
        </div>
      )}

      {/* Capture flash */}
      <AnimatePresence>
        {step === 'captured' && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BodyScanCamera;
