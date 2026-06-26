/**
 * Anthropometric measurement calculations from 2D pose landmarks.
 *
 * All public functions are pure — no side effects, no I/O.
 *
 * Precision improvements over original:
 *   1. Side-scan depth integration: real sagittal depth from lateral landmarks
 *      replaces fixed depth ratios → ±4 cm → ±2 cm for circumferences.
 *   2. Dynamic waist detection: scans 25–55% range to find anatomical minimum.
 *   3. US Navy BF% formula: uses camera-measured circumferences (waist, hip, neck)
 *      instead of BMI-only Deurenberg. Falls back to Deurenberg when neck unavailable.
 *   4. BMI-adjusted depth ratios: fallback when side scan not available.
 *   5. Neck circumference from ear landmarks (frontal view).
 */

import type { PoseLandmark } from './visionProvider';
import { LANDMARK_INDEX as LM } from './visionProvider';
import { navyBF, dynamicDepthRatio } from '../../utils/bodyCompositionCalculators';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnthroMeasurements {
  waist_cm: number;
  hip_cm: number;
  bust_cm: number;
  neck_cm: number | null;
  bf_percentage: number;
  /** 'navy' when US Navy formula used, 'deurenberg' as fallback */
  bf_formula: 'navy' | 'deurenberg';
  /** 0–100: how reliable the measurement set is (key-landmark visibility × pose quality) */
  estimation_confidence: number;
}

export interface MeasurementInput {
  landmarks: PoseLandmark[];
  /** Frame pixel width */
  frameWidth: number;
  /** Frame pixel height */
  frameHeight: number;
  /** User's height in cm (used as reference scale) */
  heightCm: number;
  /** User's weight in kg (needed for BMI → Deurenberg BF% fallback) */
  weightKg: number;
  /** User's age in years */
  age: number;
  /** 'male' | 'female' */
  gender: 'male' | 'female';
  /**
   * Landmarks from the side (90°) scan of the SAME cycle.
   * When provided, real sagittal depth is extracted from bilateral landmark
   * spread instead of using fixed population-average depth ratios.
   */
  sideLandmarks?: PoseLandmark[];
  /** Frame dimensions used for the side scan (may differ from frontal frame). */
  sideFrameWidth?: number;
  sideFrameHeight?: number;
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────

const px = (lm: PoseLandmark, frameWidth: number) => lm.x * frameWidth;

/**
 * Absolute horizontal distance between two landmarks, in pixels.
 */
function spreadPx(lmA: PoseLandmark, lmB: PoseLandmark, frameWidth: number): number {
  return Math.abs(px(lmA, frameWidth) - px(lmB, frameWidth));
}

/**
 * Interpolate a virtual landmark between two real landmarks (0 = A, 1 = B).
 */
function interpolate(a: PoseLandmark, b: PoseLandmark, t: number): PoseLandmark {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    visibility: Math.min(a.visibility ?? 0, b.visibility ?? 0),
  };
}

// ─── Scale factor ─────────────────────────────────────────────────────────────

/**
 * Estimate pixels-per-cm using the user's known height.
 * Reference: nose (lm[0]) → average of both ankles (lm[27], lm[28]).
 * 0.94 correction: nose is ~6% below the top of the head.
 */
export function computeScaleFactor(
  landmarks: PoseLandmark[],
  frameHeight: number,
  heightCm: number,
): number {
  const nose = landmarks[LM.NOSE];
  const leftAnkle = landmarks[LM.LEFT_ANKLE];
  const rightAnkle = landmarks[LM.RIGHT_ANKLE];

  if (!nose || !leftAnkle || !rightAnkle) return 0;

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const personHeightPx = Math.abs(avgAnkleY - nose.y) * frameHeight;

  if (personHeightPx < 10) return 0;

  const correctedHeightPx = personHeightPx / 0.94;
  return heightCm / correctedHeightPx;
}

// ─── Circumference estimation ─────────────────────────────────────────────────

/**
 * Estimate circumference using the ellipse model:
 *   C ≈ π × (a + b)   where a = frontal_width/2, b = sagittal_depth/2
 */
function ellipseCircumference(widthCm: number, depthCm: number): number {
  return Math.PI * (widthCm / 2 + depthCm / 2);
}

// ─── Anatomical correction factors ──────────────────────────────────────────────

/**
 * MediaPipe landmarks don't sit on the true circumference sites:
 *   - HIP landmarks are at the bony pelvis (bi-iliac breadth), which is NARROWER
 *     than the maximal hip/gluteal girth (measured lower, around the buttocks) →
 *     raw hip is underestimated, often coming out smaller than the waist.
 *   - SHOULDER landmarks give biacromial breadth (bony shoulders), WIDER than the
 *     chest at bust level → raw bust is overestimated.
 *
 * These per-sex factors map the landmark-derived circumference to the true site.
 * They are heuristic starting points grounded in anthropometric ratios — tune
 * against tape-measure ground truth. The ±2–4 cm disclaimer still applies.
 */
const HIP_CORRECTION   = { female: 1.18, male: 1.10 } as const;
const BUST_CORRECTION  = { female: 0.95, male: 0.90 } as const;
const WAIST_CORRECTION = { female: 1.0,  male: 1.0  } as const;

/** Confidence penalty applied when the plausibility guard has to floor the hip. */
const IMPLAUSIBLE_HIP_PENALTY = 15;

// ─── Dynamic waist detection ──────────────────────────────────────────────────

/**
 * Find the anatomically correct waist position by scanning the torso
 * from 25% to 55% of the hip→shoulder range and picking the minimum width.
 * Returns the interpolation factor t (0 = hip, 1 = shoulder).
 */
function findWaistFactor(
  lh: PoseLandmark,
  ls: PoseLandmark,
  rh: PoseLandmark,
  rs: PoseLandmark,
  frameWidth: number,
): number {
  let minWidth = Infinity;
  let bestT = 0.38;

  for (let t = 0.25; t <= 0.55; t += 0.01) {
    const wL = interpolate(lh, ls, t);
    const wR = interpolate(rh, rs, t);
    const w = spreadPx(wL, wR, frameWidth);
    if (w < minWidth) {
      minWidth = w;
      bestT = t;
    }
  }
  return bestT;
}

// ─── Deurenberg BF% formula ──────────────────────────────────────────────────

/**
 * Deurenberg et al. (1991) — BMI-based BF% fallback.
 * Used when neck_cm is unavailable (US Navy formula requires neck).
 */
export function deurenbergBF(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const sex = gender === 'male' ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4;
  return Math.min(60, Math.max(2, Math.round(bf * 10) / 10));
}

// ─── Distance validation ──────────────────────────────────────────────────────

export interface DistanceValidation {
  valid: boolean;
  fraction: number;
  status: 'too_close' | 'too_far' | 'ok';
  /**
   * Whether the full body (head→ankles) is genuinely inside the frame.
   * False when the ankles aren't actually visible — the most common cause of a
   * failed scan (user framed only the upper body, like a hand-held selfie).
   */
  bodyInFrame: boolean;
}

/** Minimum landmark visibility to treat a point as truly "in frame". */
const ANKLE_VIS_MIN = 0.5;

export function validateDistance(
  landmarks: PoseLandmark[],
  frameHeight: number,
): DistanceValidation {
  const nose = landmarks[LM.NOSE];
  const leftAnkle = landmarks[LM.LEFT_ANKLE];
  const rightAnkle = landmarks[LM.RIGHT_ANKLE];

  if (!nose || !leftAnkle || !rightAnkle) {
    return { valid: false, fraction: 0, status: 'too_close', bodyInFrame: false };
  }

  // CRITICAL: MediaPipe always returns all 33 landmarks, extrapolating the ones
  // outside the frame with low visibility. We must NOT trust ankle coordinates
  // unless the ankles are actually visible — otherwise a head-and-torso selfie
  // gets a bogus distance reading. If ankles aren't visible, the body simply
  // isn't fully framed → the user needs to step back.
  const ankleVis = Math.max(leftAnkle.visibility ?? 0, rightAnkle.visibility ?? 0);
  if (ankleVis < ANKLE_VIS_MIN) {
    return { valid: false, fraction: 0, status: 'too_close', bodyInFrame: false };
  }

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const fraction = Math.abs(avgAnkleY - nose.y);

  // Slightly wider band than before (0.62–0.92) to reduce false rejections while
  // still keeping the whole body comfortably inside the frame.
  if (fraction > 0.92) return { valid: false, fraction, status: 'too_close', bodyInFrame: true };
  if (fraction < 0.62) return { valid: false, fraction, status: 'too_far', bodyInFrame: true };
  return { valid: true, fraction, status: 'ok', bodyInFrame: true };
}

// ─── Pose orientation detection ───────────────────────────────────────────────

export type PoseOrientation = 'frontal' | 'side' | 'unknown';

/**
 * Detect body orientation in a **distance-invariant** way.
 *
 * The previous version compared raw shoulder X-spread to absolute thresholds, so
 * at 2–3 m (where the spread shrinks) it could never confirm "frontal". Instead we
 * normalise the horizontal shoulder/hip spread by the torso height (vertical
 * shoulder→hip distance), which scales the same way with distance, and we also use
 * the left/right shoulder **visibility asymmetry** — when someone stands sideways,
 * the far shoulder is occluded, producing a large visibility gap.
 */
export function detectPoseOrientation(landmarks: PoseLandmark[]): PoseOrientation {
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) return 'unknown';

  const shoulderSpread = Math.abs(ls.x - rs.x);
  const hipSpread = Math.abs(lh.x - rh.x);

  // Torso height = vertical distance between shoulder line and hip line.
  // This is our distance-invariant scale reference.
  const shoulderY = (ls.y + rs.y) / 2;
  const hipY = (lh.y + rh.y) / 2;
  const torsoH = Math.abs(hipY - shoulderY);
  if (torsoH < 0.05) return 'unknown'; // torso not clearly visible

  const shoulderRatio = shoulderSpread / torsoH;
  const hipRatio = hipSpread / torsoH;

  // Side pose occludes the far shoulder/hip → strong visibility asymmetry.
  const shoulderVisAsym = Math.abs((ls.visibility ?? 0) - (rs.visibility ?? 0));
  const hipVisAsym = Math.abs((lh.visibility ?? 0) - (rh.visibility ?? 0));
  const strongAsymmetry = shoulderVisAsym > 0.35 || hipVisAsym > 0.35;

  // Frontal: shoulders and hips are wide relative to the torso height.
  if (shoulderRatio > 0.55 && hipRatio > 0.30 && !strongAsymmetry) return 'frontal';

  // Side: shoulders/hips collapse horizontally, OR clear occlusion asymmetry.
  if (shoulderRatio < 0.32 || strongAsymmetry) return 'side';

  return 'unknown';
}

// ─── Side-scan depth extraction ───────────────────────────────────────────────

interface SideDepths {
  hip_depth_cm: number;
  bust_depth_cm: number;
  waist_depth_cm: number;
}

/**
 * Extract real sagittal depths from side-scan landmarks.
 *
 * When a person is at 90°, LEFT_HIP / RIGHT_HIP represent front and back
 * of the body — their horizontal spread equals the actual body depth at
 * that level. Same logic applies to shoulders (bust) and interpolated waist.
 *
 * Returns null if side landmarks are insufficient quality.
 */
function extractSideDepths(
  sideLandmarks: PoseLandmark[],
  sideFrameWidth: number,
  sideFrameHeight: number,
  heightCm: number,
  waistT: number,
): SideDepths | null {
  if (sideLandmarks.length < 33) return null;

  const sideScale = computeScaleFactor(sideLandmarks, sideFrameHeight, heightCm);
  if (sideScale <= 0) return null;

  const ls = sideLandmarks[LM.LEFT_SHOULDER];
  const rs = sideLandmarks[LM.RIGHT_SHOULDER];
  const lh = sideLandmarks[LM.LEFT_HIP];
  const rh = sideLandmarks[LM.RIGHT_HIP];

  const minSideVis = 0.3;
  if (
    (ls.visibility ?? 0) < minSideVis ||
    (rs.visibility ?? 0) < minSideVis ||
    (lh.visibility ?? 0) < minSideVis ||
    (rh.visibility ?? 0) < minSideVis
  ) {
    return null;
  }

  const hip_depth_cm = spreadPx(lh, rh, sideFrameWidth) * sideScale;
  const bust_depth_cm = spreadPx(ls, rs, sideFrameWidth) * sideScale;

  const sideWaistL = interpolate(lh, ls, waistT);
  const sideWaistR = interpolate(rh, rs, waistT);
  const waist_depth_cm = spreadPx(sideWaistL, sideWaistR, sideFrameWidth) * sideScale;

  // Sanity: depths must be positive and physically plausible
  if (hip_depth_cm < 5 || hip_depth_cm > 60) return null;
  if (bust_depth_cm < 5 || bust_depth_cm > 60) return null;
  if (waist_depth_cm < 4 || waist_depth_cm > 55) return null;

  return { hip_depth_cm, bust_depth_cm, waist_depth_cm };
}

// ─── Main measurement export ──────────────────────────────────────────────────

export function computeMeasurements(input: MeasurementInput): AnthroMeasurements | null {
  const {
    landmarks,
    frameWidth,
    frameHeight,
    heightCm,
    weightKg,
    age,
    gender,
    sideLandmarks,
    sideFrameWidth,
    sideFrameHeight,
  } = input;

  if (landmarks.length < 33) return null;

  // Defensive: lookups keyed by gender must never receive a non-canonical value
  // (a bad key → undefined → NaN). Callers should already normalize, but guard here.
  const g: 'male' | 'female' = gender === 'male' ? 'male' : 'female';

  const scaleCmPerPx = computeScaleFactor(landmarks, frameHeight, heightCm);
  if (scaleCmPerPx <= 0) return null;

  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];

  const minVis = 0.4;
  if (
    (ls.visibility ?? 0) < minVis ||
    (rs.visibility ?? 0) < minVis ||
    (lh.visibility ?? 0) < minVis ||
    (rh.visibility ?? 0) < minVis
  ) {
    return null;
  }

  // ── BMI for fallback depth ratios ─────────────────────────────────────
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  // ── Frontal widths ────────────────────────────────────────────────────
  const bust_width_cm = spreadPx(ls, rs, frameWidth) * scaleCmPerPx;
  const hip_width_cm = spreadPx(lh, rh, frameWidth) * scaleCmPerPx;

  // Dynamic waist: find anatomically narrowest point
  const waistT = findWaistFactor(lh, ls, rh, rs, frameWidth);
  const waistL = interpolate(lh, ls, waistT);
  const waistR = interpolate(rh, rs, waistT);
  const waist_width_cm = spreadPx(waistL, waistR, frameWidth) * scaleCmPerPx;

  // ── Sagittal depths ───────────────────────────────────────────────────
  let hip_depth_cm: number;
  let bust_depth_cm: number;
  let waist_depth_cm: number;

  const sideDepths =
    sideLandmarks && sideFrameWidth && sideFrameHeight
      ? extractSideDepths(sideLandmarks, sideFrameWidth, sideFrameHeight, heightCm, waistT)
      : null;

  if (sideDepths) {
    hip_depth_cm = sideDepths.hip_depth_cm;
    bust_depth_cm = sideDepths.bust_depth_cm;
    waist_depth_cm = sideDepths.waist_depth_cm;
  } else {
    // Fallback: BMI-adjusted depth ratios
    hip_depth_cm = hip_width_cm * dynamicDepthRatio(bmi, 0.80);
    bust_depth_cm = bust_width_cm * dynamicDepthRatio(bmi, 0.72);
    waist_depth_cm = waist_width_cm * dynamicDepthRatio(bmi, 0.70);
  }

  // ── Circumferences via ellipse model + anatomical correction ──────────
  // The raw ellipse value is corrected to the true circumference site (see the
  // HIP/BUST/WAIST_CORRECTION rationale above) so the hip isn't underestimated
  // below the waist and the bust isn't inflated by shoulder breadth.
  const bust_cm = Math.round(ellipseCircumference(bust_width_cm, bust_depth_cm) * BUST_CORRECTION[g] * 10) / 10;
  let   hip_cm  = Math.round(ellipseCircumference(hip_width_cm, hip_depth_cm) * HIP_CORRECTION[g] * 10) / 10;
  const waist_cm = Math.round(ellipseCircumference(waist_width_cm, waist_depth_cm) * WAIST_CORRECTION[g] * 10) / 10;

  // Plausibility guard: for the vast majority of bodies the hip girth is ≥ the
  // waist. If it still comes out smaller after correction (landmark noise, or a
  // genuine android shape), floor the hip to the waist — they're within the stated
  // ±2–4 cm margin — and dock confidence so the result shows the low-confidence
  // (amber) state rather than a confidently wrong number.
  let confidencePenalty = 0;
  if (hip_cm < waist_cm) {
    hip_cm = waist_cm;
    confidencePenalty = IMPLAUSIBLE_HIP_PENALTY;
  }

  // ── Neck circumference from ear landmarks ─────────────────────────────
  let neck_cm: number | null = null;
  const leftEar = landmarks[LM.LEFT_EAR];
  const rightEar = landmarks[LM.RIGHT_EAR];
  if (
    leftEar && rightEar &&
    (leftEar.visibility ?? 0) > 0.5 &&
    (rightEar.visibility ?? 0) > 0.5
  ) {
    const neck_width_cm = spreadPx(leftEar, rightEar, frameWidth) * scaleCmPerPx;
    // Ellipse model: neck is ovaloid (depth ratio 0.65)
    neck_cm = Math.round(ellipseCircumference(neck_width_cm, neck_width_cm * 0.65) * 10) / 10;
    // Sanity range
    if (neck_cm < 20 || neck_cm > 60) neck_cm = null;
  }

  // ── BF%: US Navy formula when neck available, Deurenberg fallback ─────
  let bf_percentage: number;
  let bf_formula: 'navy' | 'deurenberg';

  const navyResult = neck_cm !== null
    ? navyBF(waist_cm, hip_cm, neck_cm, heightCm, g)
    : null;

  if (navyResult !== null) {
    bf_percentage = navyResult;
    bf_formula = 'navy';
  } else {
    bf_percentage = deurenbergBF(weightKg, heightCm, age, g);
    bf_formula = 'deurenberg';
  }

  // ── Confidence: average visibility of key landmarks ───────────────────
  const keyVis = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.NOSE,
  ].map(i => landmarks[i]?.visibility ?? 0);

  const rawConfidence =
    Math.round((keyVis.reduce((a, b) => a + b, 0) / keyVis.length) * 100 * 10) / 10;
  const estimation_confidence = Math.max(0, rawConfidence - confidencePenalty);

  return {
    waist_cm,
    hip_cm,
    bust_cm,
    neck_cm,
    bf_percentage,
    bf_formula,
    estimation_confidence,
  };
}

/** Quick Euclidean distance between two landmarks in pixels (for liveness/stability). */
export function landmarkDistPx(
  a: PoseLandmark,
  b: PoseLandmark,
  fw: number,
  fh: number,
): number {
  return Math.hypot((a.x - b.x) * fw, (a.y - b.y) * fh);
}
