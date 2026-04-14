import { supabase } from './supabase';

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  note?: string;
  source: 'manual' | 'body_scan' | 'wearable';
  logged_at: string;
  created_at: string;
}

export interface BodyMeasurementSnapshot {
  id: string;
  user_id: string;
  session_id?: string;
  avg_body_fat_pct?: number;
  avg_muscle_mass_kg?: number;
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  arm_left_cm?: number;
  arm_right_cm?: number;
  thigh_left_cm?: number;
  thigh_right_cm?: number;
  calf_left_cm?: number;
  calf_right_cm?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  avg_ai_score?: number;
  detected_biotype?: string;
  snapped_at: string;
  created_at: string;
}

export const WeightLogService = {
  /**
   * Log a new weight entry for the user.
   * The DB trigger will also update profiles.weight automatically.
   */
  async logWeight(
    userId: string,
    weightKg: number,
    source: 'manual' | 'body_scan' | 'wearable' = 'manual',
    note?: string,
    loggedAt?: Date
  ): Promise<WeightLog> {
    const { data, error } = await supabase
      .from('weight_logs')
      .insert({
        user_id: userId,
        weight_kg: weightKg,
        source,
        note: note || null,
        logged_at: (loggedAt || new Date()).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as WeightLog;
  },

  /**
   * Fetch weight history for a user (most recent first).
   */
  async getWeightHistory(userId: string, limit = 90): Promise<WeightLog[]> {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as WeightLog[];
  },

  /**
   * Get weight history for chart (chronological, last N days).
   */
  async getWeightHistoryForChart(userId: string, days = 90): Promise<WeightLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true });

    if (error) throw error;
    return (data || []) as WeightLog[];
  },

  /**
   * Delete a weight log entry.
   */
  async deleteWeightLog(id: string): Promise<void> {
    const { error } = await supabase
      .from('weight_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Get the most recent weight log for a user.
   */
  async getLatestWeight(userId: string): Promise<WeightLog | null> {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as WeightLog | null;
  },
};

export const MeasurementSnapshotService = {
  /**
   * Create a body measurement snapshot from a completed scan session.
   * Called after all 3 poses are done.
   */
  async createFromSession(
    userId: string,
    sessionId: string,
    avgBodyFat: number,
    avgMuscleMass: number,
    frontScanMeasurements: Record<string, number | undefined>,
    weightKg: number,
    heightCm: number,
    avgAiScore?: number,
    detectedBiotype?: string
  ): Promise<BodyMeasurementSnapshot> {
    const bmi = heightCm > 0 ? +(weightKg / ((heightCm / 100) ** 2)).toFixed(2) : undefined;

    const { data, error } = await supabase
      .from('body_measurement_snapshots')
      .insert({
        user_id: userId,
        session_id: sessionId,
        avg_body_fat_pct: avgBodyFat,
        avg_muscle_mass_kg: avgMuscleMass,
        waist_cm: frontScanMeasurements.waist || null,
        hip_cm: frontScanMeasurements.hip || null,
        chest_cm: frontScanMeasurements.chest || null,
        arm_left_cm: frontScanMeasurements.arm_left || null,
        arm_right_cm: frontScanMeasurements.arm_right || null,
        thigh_left_cm: frontScanMeasurements.thigh_left || null,
        thigh_right_cm: frontScanMeasurements.thigh_right || null,
        calf_left_cm: frontScanMeasurements.calf_left || null,
        calf_right_cm: frontScanMeasurements.calf_right || null,
        weight_kg: weightKg,
        height_cm: heightCm,
        bmi,
        avg_ai_score: avgAiScore || null,
        detected_biotype: detectedBiotype || null,
        snapped_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as BodyMeasurementSnapshot;
  },

  /**
   * Fetch snapshot history for chart (chronological).
   */
  async getSnapshotHistory(userId: string, days = 180): Promise<BodyMeasurementSnapshot[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('body_measurement_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('snapped_at', since.toISOString())
      .order('snapped_at', { ascending: true });

    if (error) return [];
    return (data || []) as BodyMeasurementSnapshot[];
  },

  /**
   * Get the latest snapshot (most recent body scan session result).
   */
  async getLatestSnapshot(userId: string): Promise<BodyMeasurementSnapshot | null> {
    const { data, error } = await supabase
      .from('body_measurement_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapped_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as BodyMeasurementSnapshot | null;
  },
};
