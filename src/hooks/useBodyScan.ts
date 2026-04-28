/**
 * useBodyScan — Supabase persistence layer for MediaPipe-derived body scans.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnthroMeasurements } from '../services/bodyscan';
import { estimateLimbCircumferences } from '../utils/bodyCompositionCalculators';

// ─── Database row type ─────────────────────────────────────────────────────────

export interface BodyScanRecord {
  id: string;
  user_id: string;
  scan_date: string;
  waist_cm: number | null;
  hip_cm: number | null;
  bust_cm: number | null;
  neck_cm: number | null;
  bf_percentage: number | null;
  bf_formula: 'navy' | 'deurenberg' | null;
  estimation_confidence: number | null;
  height_cm_used: number;
  notes: string | null;
  created_at: string;
}

export interface SaveBodyScanInput {
  measurements: AnthroMeasurements;
  heightCmUsed: number;
  weightKg?: number;
  age?: number;
  gender?: 'male' | 'female';
  notes?: string;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useBodyScan() {
  const { user } = useAuth();

  const [history, setHistory] = useState<BodyScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch history ──────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('body_scan_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('scan_date', { ascending: false })
        .limit(50);

      if (dbErr) throw dbErr;
      setHistory((data ?? []) as BodyScanRecord[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar histórico';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Save scan ──────────────────────────────────────────────────────────────

  const saveScan = useCallback(
    async (input: SaveBodyScanInput): Promise<BodyScanRecord> => {
      if (!user) throw new Error('Usuário não autenticado');

      const {
        measurements,
        heightCmUsed,
        weightKg = 70,
        age = 30,
        gender = 'female',
        notes,
      } = input;

      // 1. Raw scan record
      const { data, error: dbErr } = await supabase
        .from('body_scan_measurements')
        .insert({
          user_id:              user.id,
          waist_cm:             measurements.waist_cm,
          hip_cm:               measurements.hip_cm,
          bust_cm:              measurements.bust_cm,
          neck_cm:              measurements.neck_cm ?? null,
          bf_percentage:        measurements.bf_percentage,
          bf_formula:           measurements.bf_formula,
          estimation_confidence: measurements.estimation_confidence,
          height_cm_used:       heightCmUsed,
          notes:                notes ?? null,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      const record = data as BodyScanRecord;
      setHistory(prev => [record, ...prev]);

      // 2. Extended snapshot for MetricsChart + doctor portal
      try {
        const bfFraction   = measurements.bf_percentage / 100;
        const heightM      = heightCmUsed / 100;
        const bmi          = heightM > 0 ? +(weightKg / (heightM * heightM)).toFixed(2) : undefined;
        const muscleMassKg = +(weightKg * (1 - bfFraction)).toFixed(2);

        // Limb estimates from regression (population-based, ±4 cm)
        const limbs = estimateLimbCircumferences({
          weight_kg: weightKg,
          height_cm: heightCmUsed,
          hip_cm:    measurements.hip_cm,
          waist_cm:  measurements.waist_cm,
          age,
          gender,
        });

        await supabase.from('body_measurement_snapshots').insert({
          user_id:            user.id,
          avg_body_fat_pct:   measurements.bf_percentage,
          avg_muscle_mass_kg: muscleMassKg,
          waist_cm:           measurements.waist_cm,
          hip_cm:             measurements.hip_cm,
          chest_cm:           measurements.bust_cm,
          neck_cm:            measurements.neck_cm ?? null,
          // Same regression value for left and right (no laterality from camera)
          arm_left_cm:        limbs.arm_cm,
          arm_right_cm:       limbs.arm_cm,
          thigh_left_cm:      limbs.thigh_cm,
          thigh_right_cm:     limbs.thigh_cm,
          calf_left_cm:       limbs.calf_cm,
          calf_right_cm:      limbs.calf_cm,
          weight_kg:          weightKg,
          height_cm:          heightCmUsed,
          bmi,
          snapped_at:         new Date().toISOString(),
        });
      } catch (snapshotErr) {
        console.warn('Could not mirror scan to body_measurement_snapshots:', snapshotErr);
      }

      return record;
    },
    [user],
  );

  // ── Latest record ──────────────────────────────────────────────────────────

  const latest = history[0] ?? null;

  // ── Progress delta ────────────────────────────────────────────────────────

  const progress = history.length >= 2
    ? {
        waist_delta: (history[0].waist_cm ?? 0) - (history[1].waist_cm ?? 0),
        hip_delta:   (history[0].hip_cm   ?? 0) - (history[1].hip_cm   ?? 0),
        bf_delta:    (history[0].bf_percentage ?? 0) - (history[1].bf_percentage ?? 0),
      }
    : null;

  return {
    history,
    latest,
    progress,
    loading,
    error,
    saveScan,
    fetchHistory,
  };
}
