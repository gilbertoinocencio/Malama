/**
 * useBodyScan — Supabase persistence layer for MediaPipe-derived body scans.
 *
 * Follows the same pattern as other hooks in the project:
 *   - named export, no default
 *   - throw errors up; components handle UI feedback
 *   - supabase client imported from services/supabase
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnthroMeasurements } from '../services/bodyscan';

// ─── Database row type ─────────────────────────────────────────────────────────

export interface BodyScanRecord {
  id: string;
  user_id: string;
  scan_date: string;
  waist_cm: number | null;
  hip_cm: number | null;
  bust_cm: number | null;
  bf_percentage: number | null;
  estimation_confidence: number | null;
  height_cm_used: number;
  notes: string | null;
  created_at: string;
}

export interface SaveBodyScanInput {
  measurements: AnthroMeasurements;
  heightCmUsed: number;
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

      const { measurements, heightCmUsed, notes } = input;

      const { data, error: dbErr } = await supabase
        .from('body_scan_measurements')
        .insert({
          user_id: user.id,
          waist_cm: measurements.waist_cm,
          hip_cm: measurements.hip_cm,
          bust_cm: measurements.bust_cm,
          bf_percentage: measurements.bf_percentage,
          estimation_confidence: measurements.estimation_confidence,
          height_cm_used: heightCmUsed,
          notes: notes ?? null,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      const record = data as BodyScanRecord;
      // Prepend to local state so the UI updates instantly
      setHistory(prev => [record, ...prev]);
      return record;
    },
    [user],
  );

  // ── Latest record ──────────────────────────────────────────────────────────

  const latest = history[0] ?? null;

  // ── Progress delta (current vs previous) ──────────────────────────────────

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
