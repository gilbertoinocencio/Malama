/**
 * Body composition calculators: clinical indices, US Navy BF% formula,
 * and regression-based limb circumference estimates.
 *
 * All functions are pure — no side effects, no I/O.
 */

// ─── Gender normalization ─────────────────────────────────────────────────────

/**
 * Normalizes whatever the profile stores (the onboarding saves the Portuguese
 * 'masculino'/'feminino', and 'non_binary' is also possible) into the canonical
 * 'male' | 'female' that every calculator expects.
 *
 * Critical: lookups keyed by gender (e.g. correction factors) would yield
 * `undefined` → NaN for a non-canonical value; the US Navy / Deurenberg formulas
 * would silently pick the wrong branch. Always run raw gender through this first.
 */
export function normalizeGender(raw?: string | null): 'male' | 'female' {
  const g = (raw ?? '').toLowerCase();
  if (['male', 'masculino', 'homem', 'm'].includes(g)) return 'male';
  if (['female', 'feminino', 'mulher', 'f'].includes(g)) return 'female';
  return 'female'; // default já adotado no app
}

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

  // FFMI = lean_mass_kg / height_m² — single source of truth in bodyComposition()
  let ffmi: number | null = null;
  if (bf_percentage != null && weight_kg > 0 && height_m > 0) {
    ffmi = bodyComposition({ weight_kg, bf_percentage, height_cm }).ffmi;
  }

  // ABSI = waist_m / (BMI^(2/3) × height_m^(1/2))
  let absi: number | null = null;
  if (bmi && waist_cm > 0 && height_m > 0) {
    const waist_m = waist_cm / 100;
    absi = Math.round((waist_m / (Math.pow(bmi, 2 / 3) * Math.pow(height_m, 0.5))) * 10000) / 10000;
  }

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

/**
 * Risk classification for body-fat % (ACE/ACSM general-fitness bands).
 * 'low' = healthy/athletic; 'moderate' = borderline (too low OR slightly high);
 * 'high' = obese range. Women's thresholds run ~8-9 pts above men's.
 */
export function bfRisk(bf: number, gender: 'male' | 'female'): RiskLevel {
  if (gender === 'female') {
    if (bf < 14) return 'moderate'; // essential/too-low
    if (bf <= 31) return 'low';     // athletic → acceptable
    if (bf < 39) return 'moderate';
    return 'high';
  }
  if (bf < 6) return 'moderate';    // essential/too-low
  if (bf <= 24) return 'low';       // athletic → acceptable
  if (bf < 30) return 'moderate';
  return 'high';
}

/** Risk classification for Fat Mass Index (kg/m²). Mirrors bfRisk semantics. */
export function fmiRisk(fmi: number, gender: 'male' | 'female'): RiskLevel {
  if (gender === 'female') {
    if (fmi < 5) return 'moderate';  // too-low
    if (fmi <= 9) return 'low';      // healthy
    if (fmi < 13) return 'moderate';
    return 'high';
  }
  if (fmi < 3) return 'moderate';    // too-low
  if (fmi <= 6) return 'low';        // healthy
  if (fmi < 9) return 'moderate';
  return 'high';
}

/** Risk classification for BMI (WHO bands). Extracted from inline UI logic. */
export function bmiRisk(bmi: number): RiskLevel {
  if (bmi < 18.5) return 'moderate'; // underweight
  if (bmi < 25) return 'low';        // normal
  if (bmi < 30) return 'moderate';   // overweight
  return 'high';                     // obese
}

// ─── Body composition (mass & indices derived from BF%) ──────────────────────

export interface BodyComposition {
  fat_mass_kg: number;
  lean_mass_kg: number;
  fmi: number;   // Fat Mass Index = fat_mass_kg / height_m²
  ffmi: number;  // Fat-Free Mass Index = lean_mass_kg / height_m²
}

/**
 * Derives fat/lean mass (kg) and their height-normalized indices from BF%.
 * Single source of truth — `computeClinicalIndices` reuses the FFMI from here.
 */
export function bodyComposition(params: {
  weight_kg: number;
  bf_percentage: number;
  height_cm: number;
}): BodyComposition {
  const { weight_kg, bf_percentage, height_cm } = params;
  const height_m = height_cm / 100;
  const fatFraction = bf_percentage / 100;

  const fat_mass_kg = weight_kg * fatFraction;
  const lean_mass_kg = weight_kg * (1 - fatFraction);
  const denom = height_m > 0 ? height_m * height_m : NaN;

  return {
    fat_mass_kg: Math.round(fat_mass_kg * 10) / 10,
    lean_mass_kg: Math.round(lean_mass_kg * 10) / 10,
    fmi: Math.round((fat_mass_kg / denom) * 10) / 10,
    ffmi: Math.round((lean_mass_kg / denom) * 10) / 10,
  };
}

// ─── Resting Metabolic Rate ──────────────────────────────────────────────────

/**
 * Resting Metabolic Rate via Mifflin-St Jeor (kcal/day).
 * Chosen over Harris-Benedict (used in profileService for calorie targets)
 * because it matches Spren's reported RMR: 85.3kg/181cm/40a/male → 1789 (Spren: 1786).
 *
 * RMR depends only on weight/height/age/sex — NOT on the camera scan — so it is
 * the most trustworthy number on the result screen regardless of scan quality.
 */
export function restingMetabolicRate(params: {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: 'male' | 'female';
}): number {
  const { weight_kg, height_cm, age, gender } = params;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const rmr = base + (gender === 'male' ? 5 : -161);
  return Math.round(rmr);
}

// ─── Metric display bands (for Low│Healthy│High sliders) ─────────────────────

export type MetricKind = 'bf' | 'fmi' | 'ffmi' | 'bmi';

export interface MetricBand {
  min: number;          // left edge of the rendered bar
  max: number;          // right edge of the rendered bar
  healthyLow: number;   // start of the green zone
  healthyHigh: number;  // end of the green zone
}

/**
 * Display band for a metric's slider: full range + the healthy sub-range.
 * The healthy edges mirror the thresholds used by the *Risk classifiers above so
 * the green zone always agrees with the chip color.
 */
export function metricBand(kind: MetricKind, gender: 'male' | 'female'): MetricBand {
  const female = gender === 'female';
  switch (kind) {
    case 'bf':
      return female
        ? { min: 10, max: 45, healthyLow: 14, healthyHigh: 31 }
        : { min: 4, max: 40, healthyLow: 6, healthyHigh: 24 };
    case 'fmi':
      return female
        ? { min: 2, max: 16, healthyLow: 5, healthyHigh: 9 }
        : { min: 1, max: 12, healthyLow: 3, healthyHigh: 6 };
    case 'ffmi':
      return female
        ? { min: 10, max: 22, healthyLow: 15, healthyHigh: 21 }
        : { min: 14, max: 26, healthyLow: 19, healthyHigh: 24 };
    case 'bmi':
      return { min: 15, max: 40, healthyLow: 18.5, healthyHigh: 25 };
  }
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
