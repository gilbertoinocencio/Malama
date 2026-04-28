/**
 * Body composition calculators: clinical indices, US Navy BF% formula,
 * and regression-based limb circumference estimates.
 *
 * All functions are pure — no side effects, no I/O.
 */

// ─── US Navy Body Fat Formula ─────────────────────────────────────────────────

/**
 * US Navy circumference-based body fat formula.
 * Uses measurements derived from the camera, making BF% more camera-grounded
 * than the Deurenberg/BMI-only approach.
 *
 * Female: BF% = 163.205 × log10(waist + hip − neck) − 97.684 × log10(height) − 78.387
 * Male:   BF% = 86.010 × log10(waist − neck) − 70.041 × log10(height) + 36.76
 *
 * Returns null if inputs are out of valid range.
 */
export function navyBF(
  waist_cm: number,
  hip_cm: number,
  neck_cm: number,
  height_cm: number,
  gender: 'male' | 'female',
): number | null {
  if (waist_cm <= 0 || neck_cm <= 0 || height_cm <= 0) return null;
  if (gender === 'female' && hip_cm <= 0) return null;

  let bf: number;
  if (gender === 'female') {
    const circ = waist_cm + hip_cm - neck_cm;
    if (circ <= 0) return null;
    bf = 163.205 * Math.log10(circ) - 97.684 * Math.log10(height_cm) - 78.387;
  } else {
    const circ = waist_cm - neck_cm;
    if (circ <= 0) return null;
    bf = 86.01 * Math.log10(circ) - 70.041 * Math.log10(height_cm) + 36.76;
  }

  return Math.min(60, Math.max(2, Math.round(bf * 10) / 10));
}

// ─── Clinical Indices ─────────────────────────────────────────────────────────

export interface ClinicalIndices {
  whr: number | null;     // Waist-to-Hip Ratio
  rce: number | null;     // Relação Cintura-Estatura
  bai: number | null;     // Body Adiposity Index
  ffmi: number | null;    // Fat-Free Mass Index
  absi: number | null;    // A Body Shape Index
  bmi: number | null;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface IndexRisk {
  value: number;
  risk: RiskLevel;
  label: string;
}

export function computeClinicalIndices(params: {
  waist_cm: number;
  hip_cm: number;
  height_cm: number;
  weight_kg: number;
  bf_percentage?: number;
  gender: 'male' | 'female';
}): ClinicalIndices {
  const { waist_cm, hip_cm, height_cm, weight_kg, bf_percentage, gender } = params;

  const height_m = height_cm / 100;
  const bmi = weight_kg > 0 && height_m > 0 ? weight_kg / (height_m * height_m) : null;

  const whr = waist_cm > 0 && hip_cm > 0 ? Math.round((waist_cm / hip_cm) * 100) / 100 : null;
  const rce = waist_cm > 0 && height_cm > 0 ? Math.round((waist_cm / height_cm) * 100) / 100 : null;

  // BAI = hip / (height^1.5) - 18
  const bai =
    hip_cm > 0 && height_m > 0
      ? Math.round((hip_cm / Math.pow(height_m, 1.5) - 18) * 10) / 10
      : null;

  // FFMI = lean_mass_kg / height_m²
  let ffmi: number | null = null;
  if (bf_percentage != null && weight_kg > 0 && height_m > 0) {
    const lean_kg = weight_kg * (1 - bf_percentage / 100);
    ffmi = Math.round((lean_kg / (height_m * height_m)) * 10) / 10;
  }

  // ABSI = waist_m / (BMI^(2/3) × height_m^(1/2))
  let absi: number | null = null;
  if (bmi && waist_cm > 0 && height_m > 0) {
    const waist_m = waist_cm / 100;
    absi = Math.round((waist_m / (Math.pow(bmi, 2 / 3) * Math.pow(height_m, 0.5))) * 10000) / 10000;
  }

  void gender; // used in risk thresholds below, kept for future use
  return { whr, rce, bai, ffmi, absi, bmi };
}

/** Risk classification for WHR */
export function whrRisk(whr: number, gender: 'male' | 'female'): RiskLevel {
  if (gender === 'female') {
    if (whr < 0.80) return 'low';
    if (whr < 0.85) return 'moderate';
    return 'high';
  }
  if (whr < 0.90) return 'low';
  if (whr < 1.00) return 'moderate';
  return 'high';
}

/** Risk classification for RCE (Relação Cintura-Estatura) */
export function rceRisk(rce: number): RiskLevel {
  if (rce < 0.40) return 'low';
  if (rce < 0.50) return 'moderate';
  if (rce < 0.60) return 'high';
  return 'very_high';
}

/** Risk classification for FFMI (low = sarcopenia risk) */
export function ffmiRisk(ffmi: number, gender: 'male' | 'female'): RiskLevel {
  if (gender === 'female') {
    if (ffmi >= 15) return 'low';
    if (ffmi >= 12) return 'moderate';
    return 'high';
  }
  if (ffmi >= 19) return 'low';
  if (ffmi >= 16) return 'moderate';
  return 'high';
}

// ─── Limb Circumference Regression ───────────────────────────────────────────

/**
 * Statistical estimates for limb circumferences based on NHANES/WHO data.
 * These are population-level estimates (±4 cm margin), NOT camera measurements.
 *
 * Used only when direct camera measurement is not available.
 */
export interface LimbEstimates {
  arm_cm: number;    // mid-upper arm
  thigh_cm: number;  // mid-thigh
  calf_cm: number;   // mid-calf
}

export function estimateLimbCircumferences(params: {
  weight_kg: number;
  height_cm: number;
  hip_cm: number;
  waist_cm: number;
  age: number;
  gender: 'male' | 'female';
}): LimbEstimates {
  const { weight_kg, height_cm, hip_cm, age, gender } = params;

  // Mid-upper arm circumference — adapted from NHANES regression
  const c_arm = gender === 'female' ? 5.2 : 3.8;
  const arm_raw = 0.15 * weight_kg + 0.07 * hip_cm - 0.05 * height_cm + c_arm;
  const arm_cm = Math.round(Math.max(15, Math.min(55, arm_raw)) * 10) / 10;

  // Thigh circumference — Snijder et al. 2003
  const k_thigh = gender === 'female' ? 0.18 : 0.16;
  const off_thigh = gender === 'female' ? 20 : 18;
  const thigh_raw = 0.53 * hip_cm + k_thigh * height_cm - off_thigh;
  const thigh_cm = Math.round(Math.max(30, Math.min(80, thigh_raw)) * 10) / 10;

  // Calf circumference — adapted from Chumlea et al.
  const c_calf = gender === 'female' ? -1.5 : 0.5;
  const calf_raw = 0.48 * thigh_cm + 0.15 * weight_kg - 0.20 * age + c_calf;
  const calf_cm = Math.round(Math.max(20, Math.min(55, calf_raw)) * 10) / 10;

  return { arm_cm, thigh_cm, calf_cm };
}

// ─── BMI-adjusted depth ratio ─────────────────────────────────────────────────

/**
 * Adjusts the body cross-section depth ratio based on BMI.
 * Higher BMI → more circular (ratio closer to 1.0).
 * Lower BMI → more elliptical (ratio stays near base).
 */
export function dynamicDepthRatio(bmi: number, base: number): number {
  const adjusted = base + 0.012 * Math.max(0, bmi - 22);
  return Math.min(0.92, Math.max(0.60, adjusted));
}
