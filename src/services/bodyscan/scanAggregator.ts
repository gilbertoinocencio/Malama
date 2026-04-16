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

import type { AnthroMeasurements } from './measurements';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum estimation_confidence (0–100) for a cycle to be accepted. */
export const CONFIDENCE_MIN = 75;

/** Target number of valid cycles per session. */
export const TARGET_VALID = 3;

/** Maximum total attempts (valid + discarded) before forcing a decision. */
export const MAX_ATTEMPTS = 6;

/** How many standard deviations from the mean before a measurement is an outlier. */
export const OUTLIER_SIGMA = 1.5;

// ─── Confidence hint ─────────────────────────────────────────────────────────

/**
 * Returns a user-facing hint when a cycle is discarded due to low confidence.
 * Returns empty string if confidence is already above the threshold.
 */
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

/**
 * Removes scans whose measurements deviate more than OUTLIER_SIGMA standard
 * deviations from the group mean on any key dimension.
 *
 * With ≤ 2 scans there is no statistical basis for outlier removal, so all
 * scans are returned unchanged.
 */
export function removeOutliers(scans: AnthroMeasurements[]): AnthroMeasurements[] {
  if (scans.length <= 2) return scans;

  return scans.filter(s =>
    KEYS.every(k => {
      const vals = scans.map(x => x[k]);
      const sd = stdDev(vals);
      if (sd === 0) return true; // all identical — no outlier
      return Math.abs(s[k] - mean(vals)) <= OUTLIER_SIGMA * sd;
    }),
  );
}

// ─── Weighted average ────────────────────────────────────────────────────────

/**
 * Aggregates 2–3 valid AnthroMeasurements into a single result using a
 * confidence-weighted average for circumferences.
 *
 * bf_percentage is taken from the first scan (Deurenberg formula is
 * pose-independent — same weight/height/age/gender input every time).
 *
 * @throws {Error} 'NO_VALID_SCANS' if the input array is empty.
 */
export function aggregateScans(valid: AnthroMeasurements[]): AnthroMeasurements {
  if (valid.length === 0) throw new Error('NO_VALID_SCANS');

  const pool = removeOutliers(valid);
  const use  = pool.length >= 1 ? pool : valid; // fallback: skip removal if all are outliers

  if (use.length === 1) return { ...use[0] };

  const totalWeight = use.reduce((s, x) => s + x.estimation_confidence, 0);

  const weightedAvg = (k: MeasKey): number =>
    Math.round(
      use.reduce((s, x) => s + x[k] * x.estimation_confidence, 0) / totalWeight * 10,
    ) / 10;

  return {
    waist_cm:              weightedAvg('waist_cm'),
    hip_cm:                weightedAvg('hip_cm'),
    bust_cm:               weightedAvg('bust_cm'),
    bf_percentage:         use[0].bf_percentage,
    estimation_confidence: Math.round(totalWeight / use.length),
  };
}
