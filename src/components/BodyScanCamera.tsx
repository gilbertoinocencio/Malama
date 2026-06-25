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
 *   - Hands-free mode: spoken countdown to prop the phone and step back, then it
 *     captures automatically guided by voice + vibration.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MediaPipeProvider,
  LivenessDetector,
  StabilityDetector,
  validateDistance,
  detectPoseOrientation,
  computeMeasurements,
  primeVoice,
  speak,
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
   * Hands-free mode for solo self-scans: shows a spoken countdown so the user can
   * prop the phone and step back, and disables the arm-raise liveness (impossible
   * to perform while far from a propped phone).
   */
  handsFree?: boolean;
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
  | 'countdown'     // hands-free: get-into-position countdown
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
  | 'liveness'
  | 'hold_still';

/** Number of consecutive frames a guidance state must persist before we announce it.
 *  Prevents the voice from contradicting itself on momentary tracking jitter. */
const GUIDANCE_DEBOUNCE_FRAMES = 4;

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

// ─── Component ─────────────────────────────────────────────────────────────────

export const BodyScanCamera: React.FC<BodyScanCameraProps> = ({
  pose,
  requireLiveness = true,
  handsFree = false,
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
  /** True while the hands-free positioning countdown is running — blocks capture. */
  const countdownActiveRef = useRef(false);
  /** Interval ID for the hands-free countdown, so restarts don't overlap. */
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Debounce bookkeeping for spoken guidance. */
  const pendingKeyRef   = useRef<{ key: GuidanceKey; count: number } | null>(null);
  const committedKeyRef = useRef<GuidanceKey | null>(null);

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
  const [countdown, setCountdown]       = useState<number | null>(null);

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
      case 'liveness':    return 'Levante o braço direito acima do ombro';
      case 'hold_still':  return 'Isso! Perfeito, fique bem imóvel';
    }
  }, [pose]);

  /**
   * Commit a guidance state only after it persists GUIDANCE_DEBOUNCE_FRAMES frames.
   * The visual frame validity updates every frame elsewhere; this gates only the
   * textual + spoken message so the voice never flip-flops on tracking jitter.
   */
  const commitGuidance = useCallback((key: GuidanceKey) => {
    if (committedKeyRef.current === key) return;
    const pending = pendingKeyRef.current;
    if (pending && pending.key === key) {
      pending.count += 1;
      if (pending.count >= GUIDANCE_DEBOUNCE_FRAMES) {
        committedKeyRef.current = key;
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
  useEffect(() => {
    if (step === 'loading' || step === 'captured' || step === 'countdown' || !statusMsg) {
      if (repeatTimerRef.current) { clearInterval(repeatTimerRef.current); repeatTimerRef.current = null; }
      return;
    }

    speak(statusMsg);

    if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    repeatTimerRef.current = setInterval(() => speak(statusMsgRef.current), 6000);

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

      // Multisensory capture confirmation — felt, heard and seen, even in profile.
      hapticSuccess();
      if (pose === 'front') {
        hapticStep();
        speak('Capturei! Agora vire o corpo de lado, de perfil');
      } else {
        speak('Capturei! Scan concluído');
      }

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
        if (!countdownActiveRef.current) setStep('positioning');
        rafRef.current = requestAnimationFrame(runLoop);
        return;
      }

      const { landmarks } = frame.result;

      // Distance (full-body-in-frame aware)
      const dist = validateDistance(landmarks, frameH);
      setDistanceStatus(dist.status);

      // Orientation (distance-invariant)
      const orientation = detectPoseOrientation(landmarks);
      const expectedOrientation: PoseOrientation = pose === 'front' ? 'frontal' : 'side';
      const orientationOk = orientation === expectedOrientation;
      const positionOk = dist.valid && orientationOk;

      setFrameValid(positionOk);
      drawGuideLines(ctx, frameW, frameH, positionOk);
      drawLandmarkDots(ctx, landmarks, frameW, frameH);

      // While the hands-free countdown runs, only give positioning guidance —
      // never capture yet (gives the user time to get into place).
      const captureBlocked = countdownActiveRef.current;

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
      if (!positionOk) {
        stableGreetedRef.current = false;
        stabilityRef.current.reset();
        setStabilityPct(0);

        if (!dist.valid) {
          commitGuidance(dist.status === 'too_close' ? 'step_back' : 'come_closer');
        } else if (!orientationOk) {
          commitGuidance(pose === 'front' ? 'turn_front' : 'turn_side');
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

      // During the hands-free countdown we hold here without capturing.
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
  }, [pose, livenessEnabled, captureFrame, commitGuidance]);

  // ── Hands-free positioning countdown ──────────────────────────────────────────

  const startCountdown = useCallback(() => {
    // Clear any countdown already in flight (e.g. user tapped "Recontar").
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownActiveRef.current = true;
    let n = 10;
    setCountdown(n);
    setStep('countdown');
    speak('Apoie o celular e se afaste. Você tem dez segundos para se posicionar.');

    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        countdownTimerRef.current = null;
        setCountdown(null);
        countdownActiveRef.current = false;
        stabilityRef.current.reset();
        setStep('positioning');
        speak('Pode começar. Vou te guiar pela voz.');
        return;
      }
      setCountdown(n);
      if (n <= 5) speak(String(n)); // spoken final 5-second countdown
    }, 1000);
    countdownTimerRef.current = id;

    return () => { clearInterval(id); countdownTimerRef.current = null; };
  }, []);

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  // Reruns when `pose` OR `facingMode` changes.
  // MediaPipe WASM is browser-cached after first load, so reinit on flip is fast.

  useEffect(() => {
    let mounted = true;
    let cancelCountdown: (() => void) | undefined;
    capturedRef.current = false;
    stableGreetedRef.current = false;
    countdownActiveRef.current = false;
    pendingKeyRef.current = null;
    committedKeyRef.current = null;
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

        if (handsFree) {
          // Give the user time to prop the phone and step back, guided by voice.
          cancelCountdown = startCountdown();
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
      cancelCountdown?.();
      if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
      cancelAnimationFrame(rafRef.current);
      stopCamera();
      provider.destroy();
      stopSpeaking();
      if (repeatTimerRef.current) { clearInterval(repeatTimerRef.current); repeatTimerRef.current = null; }
    };
  }, [pose, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Hands-free positioning countdown */}
      <AnimatePresence>
        {step === 'countdown' && countdown !== null && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0a0a]/70 flex flex-col items-center justify-center gap-3"
          >
            <p className="text-white/70 text-sm font-light tracking-wide text-center px-8">
              Apoie o celular e se afaste
            </p>
            <span
              className="text-white leading-none"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 96 }}
            >
              {countdown}
            </span>
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

      {/* Hands-free restart button — top centre-left */}
      {handsFree && step !== 'loading' && step !== 'captured' && step !== 'countdown' && (
        <button
          onClick={() => startCountdown()}
          className="absolute top-10 left-16 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 text-white/80 active:scale-95 transition-transform z-10 flex items-center gap-1.5"
          aria-label="Reiniciar contagem"
        >
          <span className="material-symbols-outlined text-base leading-none">timer</span>
          <span className="text-xs font-light">Recontar</span>
        </button>
      )}

      {/* Status banner — large, full-width, bottom centre */}
      <AnimatePresence mode="wait">
        {step !== 'loading' && step !== 'captured' && step !== 'countdown' && (
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
      {step !== 'loading' && step !== 'liveness' && step !== 'countdown' && (
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
