/**
 * scanAggregator — Pure aggregation logic for multi-scan body scan sessions.
 *
 * Responsibilities:
 *   1. Confidence-based filtering (discard low-confidence cycles)
 *   2. Outlier removal via standard deviation (σ threshold)
 *   3. Weighted average by confidence across valid cycles
 *
 * No React, no UI, no Supabase — pure, testable functions.
 */

import { deurenbergBF, type AnthroMeasurements } from './measurements';
import { navyBF } from '../../utils/bodyCompositionCalculators';

// ─── Constants ───────────────────────────────────────────────────────────────

export const CONFIDENCE_MIN = 75;
export const TARGET_VALID = 3;
export const MAX_ATTEMPTS = 6;
export const OUTLIER_SIGMA = 1.5;

// ─── Confidence hint ─────────────────────────────────────────────────────────

export function getConfidenceHint(confidence: number): string {
  if (confidence < 60) return 'Iluminação insuficiente ou fundo muito complexo';
  if (confidence < 70) return 'Tente se afastar um pouco mais da câmera';
  if (confidence < 75) return 'Fique de frente com os braços levemente afastados';
  return '';
}

// ─── Outlier removal ─────────────────────────────────────────────────────────

const KEYS = ['waist_cm', 'hip_cm', 'bust_cm'] as const;
type MeasKey = typeof KEYS[number];

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / values.length);
}

export function removeOutliers(scans: AnthroMeasurements[]): AnthroMeasurements[] {
  if (scans.length <= 2) return scans;

  return scans.filter(s =>
    KEYS.every(k => {
      const vals = scans.map(x => x[k]);
      const sd = stdDev(vals);
      if (sd === 0) return true;
      return Math.abs(s[k] - mean(vals)) <= OUTLIER_SIGMA * sd;
    }),
  );
}

// ─── Confidence dispersion penalty ─────────────────────────────────────────────

/**
 * Penalise confidence when the valid captures disagree with each other. A tight
 * cluster of measurements → ~0; widely scattered circumferences → up to ~20 points
 * off, so the result drops to the amber (low-confidence) state instead of looking
 * certain. This makes confidence reflect *agreement between captures*, not just
 * landmark visibility (which alone reported 82% even on a clearly-wrong scan).
 */
function dispersionPenalty(scans: AnthroMeasurements[]): number {
  if (scans.length < 2) return 0;
  const relSpreads = KEYS.map(k => {
    const vals = scans.map(x => x[k]);
    const m = mean(vals);
    if (m <= 0) return 0;
    return stdDev(vals) / m; // coefficient of variation
  });
  const worst = Math.max(...relSpreads);
  // ≤5% CV → no penalty; ~20% CV → full ~20-point penalty.
  return Math.min(20, Math.max(0, (worst - 0.05) * 130));
}

// ─── Weighted average ────────────────────────────────────────────────────────

/** Scalars needed to recompute BF% from the aggregated circumferences. */
export interface AggregateContext {
  heightCm: number;
  gender: 'male' | 'female';
  weightKg: number;
  age: number;
}

/**
 * Aggregates valid AnthroMeasurements into a single result using
 * confidence-weighted average for circumferences.
 *
 * neck_cm: averaged from scans that have it; null if none have it.
 * bf_percentage: recomputed from the AGGREGATED circumferences when `ctx` is given
 *   (Navy when neck is available, Deurenberg fallback) — NOT copied from a single
 *   raw capture, which let one noisy frame drive a wild/clamped BF%.
 */
export function aggregateScans(
  valid: AnthroMeasurements[],
  ctx?: AggregateContext,
): AnthroMeasurements {
  if (valid.length === 0) throw new Error('NO_VALID_SCANS');

  const pool = removeOutliers(valid);
  const use = pool.length >= 1 ? pool : valid;

  if (use.length === 1) return { ...use[0] };

  const totalWeight = use.reduce((s, x) => s + x.estimation_confidence, 0);

  const weightedAvg = (k: MeasKey): number =>
    Math.round(
      (use.reduce((s, x) => s + x[k] * x.estimation_confidence, 0) / totalWeight) * 10,
    ) / 10;

  const waist_cm = weightedAvg('waist_cm');
  const hip_cm = weightedAvg('hip_cm');
  const bust_cm = weightedAvg('bust_cm');

  // Weighted average for neck where available
  const scansWithNeck = use.filter(s => s.neck_cm !== null);
  let neck_cm: number | null = null;
  if (scansWithNeck.length > 0) {
    const neckWeight = scansWithNeck.reduce((s, x) => s + x.estimation_confidence, 0);
    neck_cm =
      Math.round(
        (scansWithNeck.reduce((s, x) => s + (x.neck_cm as number) * x.estimation_confidence, 0) /
          neckWeight) *
          10,
      ) / 10;
  }

  // ── BF%: recompute from the AGGREGATED circumferences ──────────────────────
  let bf_percentage: number;
  let bf_formula: 'navy' | 'deurenberg';
  if (ctx) {
    const navy = neck_cm !== null ? navyBF(waist_cm, hip_cm, neck_cm, ctx.heightCm, ctx.gender) : null;
    if (navy !== null) {
      bf_percentage = navy;
      bf_formula = 'navy';
    } else {
      bf_percentage = deurenbergBF(ctx.weightKg, ctx.heightCm, ctx.age, ctx.gender);
      bf_formula = 'deurenberg';
    }
  } else {
    // Backward-compatible fallback (e.g. unit tests without context).
    bf_percentage = use[0].bf_percentage;
    bf_formula = use.some(s => s.bf_formula === 'navy') ? 'navy' : 'deurenberg';
  }

  const avgConfidence = totalWeight / use.length;
  const estimation_confidence = Math.max(0, Math.round(avgConfidence - dispersionPenalty(use)));

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
