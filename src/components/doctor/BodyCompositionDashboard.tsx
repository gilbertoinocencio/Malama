/**
 * BodyCompositionDashboard — longitudinal body composition view for doctors.
 *
 * Displays:
 *   - Clinical indices from the latest scan (WHR, RCE, FFMI, BAI) with risk colours
 *   - BF% timeline with source labels (camera, BIA, skinfolds — empty states for future)
 *   - Circumferences timeline (waist, hip, neck, arm, thigh, calf)
 *
 * Data source: body_measurement_snapshots (populated by useBodyScan after each scan)
 */

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '../../services/supabase';
import {
  computeClinicalIndices,
  whrRisk,
  rceRisk,
  ffmiRisk,
  type RiskLevel,
} from '../../utils/bodyCompositionCalculators';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Snapshot {
  id: string;
  snapped_at: string;
  avg_body_fat_pct: number | null;
  avg_muscle_mass_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  neck_cm: number | null;
  arm_left_cm: number | null;
  arm_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  calf_left_cm: number | null;
  calf_right_cm: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
}

interface Props {
  patientId: string;
  gender?: 'male' | 'female';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_STYLE: Record<RiskLevel, string> = {
  low:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderate:  'bg-amber-50   text-amber-700   border-amber-200',
  high:      'bg-rose-50    text-rose-600    border-rose-200',
  very_high: 'bg-rose-100   text-rose-800    border-rose-300',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low:       'Normal',
  moderate:  'Atenção',
  high:      'Risco',
  very_high: 'Alto Risco',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function avg(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.round(((a + b) / 2) * 10) / 10;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const IndexCard: React.FC<{
  label: string;
  description: string;
  value: string;
  risk: RiskLevel;
}> = ({ label, description, value, risk }) => (
  <div className={`rounded-xl border p-3 flex flex-col gap-1 ${RISK_STYLE[risk]}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold tracking-wide uppercase opacity-70">{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${RISK_STYLE[risk]}`}>
        {RISK_LABEL[risk]}
      </span>
    </div>
    <span className="text-2xl font-bold leading-tight">{value}</span>
    <span className="text-[11px] opacity-60">{description}</span>
  </div>
);

const EmptySourceBadge: React.FC<{ label: string; icon: string }> = ({ label, icon }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-stone-200 text-stone-400 text-xs">
    <span>{icon}</span>
    <span>{label}</span>
    <span className="ml-auto text-[10px] bg-stone-100 px-1.5 rounded">em breve</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const BodyCompositionDashboard: React.FC<Props> = ({ patientId, gender }) => {
  // Ensure gender is always a valid union value regardless of the parent's type
  const resolvedGender: 'male' | 'female' = gender === 'male' ? 'male' : 'female';

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('body_measurement_snapshots')
          .select('*')
          .eq('user_id', patientId)
          .order('snapped_at', { ascending: true })
          .limit(60);

        if (error) throw error;
        setSnapshots((data ?? []) as Snapshot[]);
      } catch (err) {
        console.error('[BodyCompositionDashboard] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <span className="material-symbols-outlined text-4xl mb-3 block">accessibility_new</span>
        <p className="font-medium text-stone-600 mb-1">Nenhum scan registrado</p>
        <p className="text-sm">Os dados de composição corporal aparecerão aqui após o primeiro Body Scan do paciente.</p>
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];

  // Clinical indices from latest snapshot
  const indices = computeClinicalIndices({
    waist_cm:      latest.waist_cm ?? 0,
    hip_cm:        latest.hip_cm ?? 0,
    height_cm:     latest.height_cm ?? 170,
    weight_kg:     latest.weight_kg ?? 70,
    bf_percentage: latest.avg_body_fat_pct ?? undefined,
    gender: resolvedGender,
  });

  // Chart data — BF% timeline
  const bfChartData = snapshots.map(s => ({
    date: fmtDate(s.snapped_at),
    'Câmera': s.avg_body_fat_pct,
  }));

  // Chart data — circumferences timeline
  const circumChartData = snapshots.map(s => ({
    date:        fmtDate(s.snapped_at),
    'Cintura':   s.waist_cm,
    'Quadril':   s.hip_cm,
    'Pescoço':   s.neck_cm,
    'Braço':     avg(s.arm_left_cm, s.arm_right_cm),
    'Coxa':      avg(s.thigh_left_cm, s.thigh_right_cm),
    'Panturrilha': avg(s.calf_left_cm, s.calf_right_cm),
  }));

  return (
    <div className="space-y-8">

      {/* ── Data sources legend ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
          Fontes de Dados
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#86a88d]/10 border border-[#86a88d]/30 text-[#5a7a62] text-xs font-medium">
            <span>📱</span>
            <span>Body Scan Câmera</span>
            <span className="ml-auto text-[10px] bg-[#86a88d]/20 px-1.5 rounded">
              {snapshots.length} registros
            </span>
          </div>
          <EmptySourceBadge label="BIA Clínica" icon="⚡" />
          <EmptySourceBadge label="Dobras Cutâneas" icon="📏" />
          <EmptySourceBadge label="BIA Caseira" icon="🏠" />
        </div>
      </div>

      {/* ── Clinical indices ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
          Índices Clínicos — Último Scan
        </p>
        <div className="grid grid-cols-2 gap-3">
          {indices.whr !== null && (
            <IndexCard
              label="RCQ"
              description="Relação Cintura-Quadril"
              value={indices.whr.toFixed(2)}
              risk={whrRisk(indices.whr, resolvedGender)}
            />
          )}
          {indices.rce !== null && (
            <IndexCard
              label="RCE"
              description="Relação Cintura-Estatura"
              value={indices.rce.toFixed(2)}
              risk={rceRisk(indices.rce)}
            />
          )}
          {indices.ffmi !== null && (
            <IndexCard
              label="FFMI"
              description="Índice Massa Livre de Gordura"
              value={indices.ffmi.toFixed(1)}
              risk={ffmiRisk(indices.ffmi, resolvedGender)}
            />
          )}
          {indices.bai !== null && (
            <IndexCard
              label="BAI"
              description="Body Adiposity Index"
              value={indices.bai.toFixed(1)}
              risk={
                resolvedGender === 'female'
                  ? indices.bai < 21 ? 'moderate' : indices.bai < 33 ? 'low' : indices.bai < 39 ? 'moderate' : 'high'
                  : indices.bai < 8  ? 'moderate' : indices.bai < 21 ? 'low' : indices.bai < 26 ? 'moderate' : 'high'
              }
            />
          )}
          {indices.bmi !== null && (
            <IndexCard
              label="IMC"
              description="Índice de Massa Corporal"
              value={indices.bmi.toFixed(1)}
              risk={
                indices.bmi < 18.5 ? 'moderate'
                : indices.bmi < 25  ? 'low'
                : indices.bmi < 30  ? 'moderate'
                : indices.bmi < 35  ? 'high'
                : 'very_high'
              }
            />
          )}
          {indices.absi !== null && (
            <IndexCard
              label="ABSI"
              description="A Body Shape Index"
              value={indices.absi.toFixed(4)}
              risk="moderate"
            />
          )}
        </div>
        <p className="text-[10px] text-stone-400 mt-2 text-center">
          Referências: RCQ mulher &lt;0.80 / homem &lt;0.90 · RCE &lt;0.50 · FFMI mulher ≥15 / homem ≥19
        </p>
      </div>

      {/* ── BF% timeline ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
          % Gordura Corporal — Evolução
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bfChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => [`${v?.toFixed(1)}%`, '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Câmera"
                stroke="#86a88d"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-stone-400 mt-1 text-center">
          📱 Câmera · Linhas tracejadas para BIA e Dobras aparecerão quando registradas
        </p>
      </div>

      {/* ── Circumferences timeline ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
          Circunferências — Evolução (cm)
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={circumChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit=" cm" domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => [`${v?.toFixed(1)} cm`, '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Cintura"      stroke="#7d4a3c" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="Quadril"      stroke="#c07a6a" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="Pescoço"      stroke="#86a88d" strokeWidth={1.5} dot={{ r: 2 }} connectNulls strokeDasharray="4 2" />
              <Line type="monotone" dataKey="Braço"        stroke="#b5a0d4" strokeWidth={1.5} dot={{ r: 2 }} connectNulls strokeDasharray="4 2" />
              <Line type="monotone" dataKey="Coxa"         stroke="#f0b87a" strokeWidth={1.5} dot={{ r: 2 }} connectNulls strokeDasharray="4 2" />
              <Line type="monotone" dataKey="Panturrilha"  stroke="#88c4d8" strokeWidth={1.5} dot={{ r: 2 }} connectNulls strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-stone-400 mt-1 text-center">
          Sólido = câmera-derivado ±2 cm · Tracejado = estimativa estatística ±4 cm
        </p>
      </div>

      {/* ── Latest values table ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
          Último Registro — {fmtDate(latest.snapped_at)}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Cintura',      value: latest.waist_cm,                        badge: '📷' },
            { label: 'Quadril',      value: latest.hip_cm,                          badge: '📷' },
            { label: 'Busto',        value: latest.chest_cm,                        badge: '📷' },
            { label: 'Pescoço',      value: latest.neck_cm,                         badge: '📷' },
            { label: 'Braço',        value: avg(latest.arm_left_cm, latest.arm_right_cm),     badge: '📊' },
            { label: 'Coxa',         value: avg(latest.thigh_left_cm, latest.thigh_right_cm), badge: '📊' },
            { label: 'Panturrilha',  value: avg(latest.calf_left_cm, latest.calf_right_cm),   badge: '📊' },
            { label: '% Gordura',    value: latest.avg_body_fat_pct,                badge: '📷' },
            { label: 'Massa Magra',  value: latest.avg_muscle_mass_kg ? +(latest.avg_muscle_mass_kg).toFixed(1) : null, badge: null, unit: 'kg' },
          ].map(item => item.value != null ? (
            <div key={item.label} className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-stone-400 font-light tracking-wide flex-1">{item.label}</span>
                {item.badge && <span className="text-[9px]">{item.badge}</span>}
              </div>
              <span className="text-lg font-semibold text-stone-800">
                {typeof item.value === 'number' ? item.value.toFixed(1) : item.value}
              </span>
              <span className="text-[11px] text-stone-400 ml-1">{item.unit ?? 'cm'}</span>
            </div>
          ) : null)}
        </div>
        <div className="flex gap-4 mt-3 text-[10px] text-stone-400">
          <span>📷 Câmera-derivado</span>
          <span>📊 Estimativa estatística</span>
        </div>
      </div>

    </div>
  );
};
