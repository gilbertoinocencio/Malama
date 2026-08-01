/**
 * useBodyScan — Supabase persistence layer for MediaPipe-derived body scans.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnthroMeasurements } from '../services/bodyscan';
import { bodyComposition } from '../utils/bodyCompositionCalculators';

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

      // Supabase/PostgrestError is a plain object, not an Error instance — wrap its
      // message so the UI surfaces the real cause (e.g. missing column) instead of a
      // generic "Erro ao salvar".
      if (dbErr) throw new Error(dbErr.message);

      const record = data as BodyScanRecord;
      setHistory(prev => [record, ...prev]);

      // 2. Composition snapshot for MetricsChart + doctor portal.
      // The database column keeps its legacy name (`avg_muscle_mass_kg`) for
      // compatibility, but the value is fat-free/lean mass — not skeletal muscle.
      // Camera-inferred circumferences intentionally stay only in the raw scan
      // record above; they are model inputs and must not become user-facing
      // measurements or clinical observations.
      try {
        const heightM      = heightCmUsed / 100;
        const bmi          = heightM > 0 ? +(weightKg / (heightM * heightM)).toFixed(2) : undefined;
        // Single source of truth — same lean-mass formula the result screen uses.
        const leanMassKg = bodyComposition({
          weight_kg: weightKg,
          bf_percentage: measurements.bf_percentage,
          height_cm: heightCmUsed,
        }).lean_mass_kg;

        const { error: snapErr } = await supabase.from('body_measurement_snapshots').insert({
          user_id:            user.id,
          avg_body_fat_pct:   measurements.bf_percentage,
          avg_muscle_mass_kg: leanMassKg,
          weight_kg:          weightKg,
          height_cm:          heightCmUsed,
          bmi,
          snapped_at:         new Date().toISOString(),
        });
        // Secondary mirror — never fails the primary save, but log the real reason.
        if (snapErr) throw new Error(snapErr.message);
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

  // Delta is meaningful only when there's a real previous scan AND both records
  // have a non-null value for that field. Using `?? 0` would turn "no baseline"
  // into a zero baseline and show the full current value as a fake variation
  // (e.g. "+65.7 vs anterior" on the very first scan).
  const cur = history[0] ?? null;
  const prev = history.length >= 2 ? history[1] : null;
  const fieldDelta = (a: number | null, b: number | null): number | undefined =>
    a != null && b != null ? Math.round((a - b) * 10) / 10 : undefined;

  const progress = cur && prev
    ? {
        bf_delta: fieldDelta(cur.bf_percentage, prev.bf_percentage),
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
