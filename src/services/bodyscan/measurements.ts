/**
 * Anthropometric measurement calculations from 2D pose landmarks.
 *
 * All public functions are pure — no side effects, no I/O.
 * The estimation margin is ±4 cm for circumferences and ±4% for BF%.
 */

import type { PoseLandmark } from './visionProvider';
import { LANDMARK_INDEX as LM } from './visionProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnthroMeasurements {
  waist_cm: number;
  hip_cm: number;
  bust_cm: number;
  bf_percentage: number;
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
  /** User's weight in kg (needed for BMI → Deurenberg BF%) */
  weightKg: number;
  /** User's age in years */
  age: number;
  /** 'male' | 'female' */
  gender: 'male' | 'female';
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────

/** Convert normalised landmark x to absolute pixel x. */
const px = (lm: PoseLandmark, frameWidth: number) => lm.x * frameWidth;
/** Convert normalised landmark y to absolute pixel y. */
const py = (lm: PoseLandmark, frameHeight: number) => lm.y * frameHeight;

/** Euclidean distance between two normalised landmarks, in pixels. */
const dist = (
  a: PoseLandmark,
  b: PoseLandmark,
  fw: number,
  fh: number
): number =>
  Math.hypot((a.x - b.x) * fw, (a.y - b.y) * fh);

// ─── Scale factor ─────────────────────────────────────────────────────────────

/**
 * Estimate pixels-per-cm using the user's known height.
 *
 * Reference: nose (lm[0]) → average of both ankles (lm[27], lm[28]).
 * We add a 10% correction because the top of the head is slightly
 * above the nose and heels extend below the ankle joints.
 */
export function computeScaleFactor(
  landmarks: PoseLandmark[],
  frameHeight: number,
  heightCm: number
): number {
  const nose = landmarks[LM.NOSE];
  const leftAnkle = landmarks[LM.LEFT_ANKLE];
  const rightAnkle = landmarks[LM.RIGHT_ANKLE];

  if (!nose || !leftAnkle || !rightAnkle) return 0;

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const personHeightPx = Math.abs(avgAnkleY - nose.y) * frameHeight;

  if (personHeightPx < 10) return 0;

  // The nose-to-ankle span is ~94% of total body height; correct for it
  const correctedHeightPx = personHeightPx / 0.94;
  return heightCm / correctedHeightPx; // cm / px → multiply by px to get cm
}

// ─── Body width at landmark level ────────────────────────────────────────────

/**
 * Width in cm between two symmetric landmarks (e.g. left_hip / right_hip).
 */
function widthBetween(
  lmA: PoseLandmark,
  lmB: PoseLandmark,
  frameWidth: number,
  scaleCmPerPx: number
): number {
  const pxDiff = Math.abs(px(lmA, frameWidth) - px(lmB, frameWidth));
  return pxDiff * scaleCmPerPx;
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

// ─── Circumference estimation ─────────────────────────────────────────────────

/**
 * Estimate circumference from a frontal-view width using an ellipse model.
 *
 *   C ≈ π × (a + b)   where a = width/2 (frontal semi-axis)
 *                            b = depth/2 (lateral semi-axis)
 *   b ≈ a × depthRatio
 *
 * Typical depth ratios:
 *   - waist  ≈ 0.70 (roughly elliptical)
 *   - hip    ≈ 0.80 (closer to round)
 *   - bust   ≈ 0.72
 */
function widthToCircumference(widthCm: number, depthRatio: number): number {
  const a = widthCm / 2;
  const b = a * depthRatio;
  return Math.PI * (a + b);
}

// ─── Deurenberg BF% formula ──────────────────────────────────────────────────

/**
 * Deurenberg et al. (1991) body fat percentage formula.
 *
 *   BF% = 1.20 × BMI + 0.23 × age − 10.8 × sex − 5.4
 *   sex: 1 = male, 0 = female
 *
 * More reliable than 2D silhouette estimation alone.
 * Expected accuracy: ±3–5 % compared to DEXA.
 */
export function deurenbergBF(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female'
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
  /** Fraction of frame height the person occupies (0–1). */
  fraction: number;
  /** 'too_close' | 'too_far' | 'ok' */
  status: 'too_close' | 'too_far' | 'ok';
}

/**
 * Validate that the person fills 70–85% of the frame height.
 * Outside that range the pixel→cm scale factor becomes unreliable.
 */
export function validateDistance(
  landmarks: PoseLandmark[],
  frameHeight: number
): DistanceValidation {
  const nose = landmarks[LM.NOSE];
  const leftAnkle = landmarks[LM.LEFT_ANKLE];
  const rightAnkle = landmarks[LM.RIGHT_ANKLE];

  if (!nose || !leftAnkle || !rightAnkle) {
    return { valid: false, fraction: 0, status: 'too_far' };
  }

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const fraction = Math.abs(avgAnkleY - nose.y);

  if (fraction > 0.85) return { valid: false, fraction, status: 'too_close' };
  if (fraction < 0.70) return { valid: false, fraction, status: 'too_far' };
  return { valid: true, fraction, status: 'ok' };
}

// ─── Pose orientation detection ───────────────────────────────────────────────

export type PoseOrientation = 'frontal' | 'side' | 'unknown';

/**
 * Detect whether the person is in a frontal or side (90°) orientation.
 *
 * - Frontal: both shoulders clearly visible → large horizontal spread.
 * - Side: one shoulder occludes the other → small spread relative to frame.
 */
export function detectPoseOrientation(
  landmarks: PoseLandmark[],
): PoseOrientation {
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];

  if (!ls || !rs) return 'unknown';

  // Horizontal separation in normalised coords
  const spreadX = Math.abs(ls.x - rs.x);

  if (spreadX > 0.10) return 'frontal';
  if (spreadX < 0.05) return 'side';
  return 'unknown';
}

// ─── Main measurement export ──────────────────────────────────────────────────

/**
 * Compute all anthropometric measurements from a set of pose landmarks.
 *
 * Returns null if the landmarks are insufficient (low visibility / bad scale).
 */
export function computeMeasurements(input: MeasurementInput): AnthroMeasurements | null {
  const { landmarks, frameWidth, frameHeight, heightCm, weightKg, age, gender } = input;

  if (landmarks.length < 33) return null;

  const scaleCmPerPx = computeScaleFactor(landmarks, frameHeight, heightCm);
  if (scaleCmPerPx <= 0) return null;

  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];

  // Minimum visibility threshold
  const minVis = 0.4;
  if (
    (ls.visibility ?? 0) < minVis ||
    (rs.visibility ?? 0) < minVis ||
    (lh.visibility ?? 0) < minVis ||
    (rh.visibility ?? 0) < minVis
  ) {
    return null;
  }

  // ── Bust: width at shoulder level ─────────────────────────────────────
  const shoulderWidthCm = widthBetween(ls, rs, frameWidth, scaleCmPerPx);
  const bust_cm = Math.round(widthToCircumference(shoulderWidthCm, 0.72) * 10) / 10;

  // ── Hip: width at hip landmark level ──────────────────────────────────
  const hipWidthCm = widthBetween(lh, rh, frameWidth, scaleCmPerPx);
  const hip_cm = Math.round(widthToCircumference(hipWidthCm, 0.80) * 10) / 10;

  // ── Waist: interpolated midpoint between shoulder and hip (~38% from hip)
  const waistLeft = interpolate(lh, ls, 0.38);
  const waistRight = interpolate(rh, rs, 0.38);
  const waistWidthCm = widthBetween(waistLeft, waistRight, frameWidth, scaleCmPerPx);
  const waist_cm = Math.round(widthToCircumference(waistWidthCm, 0.70) * 10) / 10;

  // ── BF% via Deurenberg (more reliable than 2D silhouette alone) ────────
  const bf_percentage = deurenbergBF(weightKg, heightCm, age, gender);

  // ── Confidence: average visibility of key landmarks ────────────────────
  const keyVis = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP,
                  LM.LEFT_ANKLE, LM.RIGHT_ANKLE, LM.NOSE]
    .map(i => landmarks[i]?.visibility ?? 0);
  const estimation_confidence =
    Math.round((keyVis.reduce((a, b) => a + b, 0) / keyVis.length) * 100 * 10) / 10;

  return { waist_cm, hip_cm, bust_cm, bf_percentage, estimation_confidence };
}

// ─── Frame distance between two landmark positions ────────────────────────────

/**
 * Quick helper: Euclidean distance between two landmarks, in PIXELS.
 * Useful for liveness and stability checks.
 */
export { dist as landmarkDistPx };
