// =====================================================
// Malama — Painel de Insights de IA (médico)
// Alertas comportamentais, padrões e resumo executivo
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  Brain, AlertTriangle, TrendingDown, TrendingUp,
  Activity, RefreshCw, ChevronDown, ChevronRight,
  Zap, CheckCircle, Minus
} from 'lucide-react';
import { generateDoctorBriefing } from '../../services/caramelService';
import type { PatientFullProfile } from '../../types/doctorPortal';

interface Props {
  patient: PatientFullProfile;
  patientId: string;
}

interface Alert {
  level: 'critical' | 'warning' | 'ok';
  title: string;
  detail: string;
}

// ─── Derived alert engine (client-side, instant) ─────
function deriveAlerts(patient: PatientFullProfile): Alert[] {
  const alerts: Alert[] = [];
  const { adherence, weekly_history, symptom_checkins } = patient;

  // Adesão
  if (adherence.registration_percentage < 40) {
    alerts.push({
      level: 'critical',
      title: 'Adesão crítica',
      detail: `Apenas ${adherence.registration_percentage}% dos dias com registro nos últimos 30 dias.`,
    });
  } else if (adherence.registration_percentage < 65) {
    alerts.push({
      level: 'warning',
      title: 'Adesão abaixo do esperado',
      detail: `${adherence.registration_percentage}% dos dias registrados. Meta recomendada: ≥ 70%.`,
    });
  } else {
    alerts.push({
      level: 'ok',
      title: 'Boa adesão',
      detail: `${adherence.registration_percentage}% dos dias registrados.`,
    });
  }

  // Ingestão calórica vs. meta
  if (adherence.calorie_goal > 0 && adherence.average_calories > 0) {
    const ratio = adherence.average_calories / adherence.calorie_goal;
    if (ratio < 0.75) {
      alerts.push({
        level: 'warning',
        title: 'Ingestão calórica muito baixa',
        detail: `Média de ${adherence.average_calories} kcal vs meta de ${adherence.calorie_goal} kcal (${Math.round(ratio * 100)}%).`,
      });
    } else if (ratio > 1.2) {
      alerts.push({
        level: 'warning',
        title: 'Superando meta calórica',
        detail: `Média de ${adherence.average_calories} kcal vs meta de ${adherence.calorie_goal} kcal (${Math.round(ratio * 100)}%).`,
      });
    }
  }

  // Tendência calórica nas últimas 4 semanas
  if (weekly_history.length >= 4) {
    const recent = weekly_history.slice(0, 4);
    const oldest = recent[recent.length - 1].avg_calories;
    const newest = recent[0].avg_calories;
    const delta = newest - oldest;
    if (Math.abs(delta) > 200) {
      alerts.push({
        level: delta < 0 ? 'warning' : 'ok',
        title: delta < 0 ? 'Queda progressiva de calorias' : 'Aumento progressivo de calorias',
        detail: `Variação de ${Math.abs(delta)} kcal nas últimas 4 semanas.`,
      });
    }
  }

  // Sintomas recorrentes
  if (symptom_checkins.length > 0) {
    const symptomsFlat = symptom_checkins.flatMap(c => c.symptoms);
    const freq: Record<string, number> = {};
    symptomsFlat.forEach(s => { freq[s] = (freq[s] ?? 0) + 1; });
    const topSymptom = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (topSymptom && topSymptom[1] >= 3) {
      const name = topSymptom[0].replace(/_/g, ' ');
      alerts.push({
        level: ['fadiga', 'náusea', 'tontura', 'dor_de_cabeca'].includes(topSymptom[0]) ? 'warning' : 'ok',
        title: `Sintoma recorrente: ${name}`,
        detail: `Relatado ${topSymptom[1]} vezes nos últimos check-ins.`,
      });
    }
  }

  return alerts;
}

// ─── Alert card ──────────────────────────────────────

const LEVEL_STYLES = {
  critical: { bg: 'bg-red-50 border-red-200',   icon: <AlertTriangle className="w-4 h-4 text-red-500" />,    text: 'text-red-800' },
  warning:  { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, text: 'text-amber-800' },
  ok:       { bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4 text-green-500" />,  text: 'text-green-800' },
};

const AlertCard: React.FC<{ alert: Alert }> = ({ alert }) => {
  const s = LEVEL_STYLES[alert.level];
  return (
    <div className={`flex gap-2.5 p-3 rounded-xl border ${s.bg}`}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div>
        <p className={`text-xs font-semibold ${s.text}`}>{alert.title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{alert.detail}</p>
      </div>
    </div>
  );
};

// ─── Trend indicator ─────────────────────────────────

const Trend: React.FC<{ values: number[]; label: string; unit: string }> = ({ values, label, unit }) => {
  if (values.length < 2) return null;
  const delta = values[0] - values[values.length - 1];
  const pct = Math.abs(Math.round((delta / (values[values.length - 1] || 1)) * 100));
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta < 0 ? 'text-green-600' : delta > 0 ? 'text-amber-600' : 'text-gray-500';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <div className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {pct > 0 ? `${pct}%` : '—'} <span className="font-normal text-gray-400">{unit}</span>
      </div>
    </div>
  );
};

// ─── Collapsible AI block ────────────────────────────

const AIBlock: React.FC<{
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  loading: boolean;
  content: string | null;
  open: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
  cta: string;
}> = ({ title, icon, accentClass, loading, content, open, onToggle, onRegenerate, cta }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r ${accentClass} hover:opacity-90 transition`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-gray-700">{title}</span>
      </div>
      {loading
        ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-500" />
        : content
          ? (open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />)
          : <Zap className="w-3.5 h-3.5 text-gray-500" />
      }
    </button>

    {!content && !loading && (
      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 mb-2">{cta}</p>
        <button
          onClick={onRegenerate}
          className="text-xs font-medium text-[#7d4a3c] hover:underline flex items-center gap-1"
        >
          <Zap className="w-3 h-3" /> Gerar agora
        </button>
      </div>
    )}

    {loading && (
      <div className="flex items-center gap-2 px-4 py-3">
        <RefreshCw className="w-3.5 h-3.5 text-[#7d4a3c] animate-spin" />
        <p className="text-xs text-gray-500">Analisando dados…</p>
      </div>
    )}

    {open && content && (
      <div className="px-4 pb-4 pt-2 space-y-2">
        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] text-[#7d4a3c] hover:underline disabled:opacity-50"
        >
          <RefreshCw className="w-3 h-3" /> Regerar
        </button>
      </div>
    )}
  </div>
);

// ─── Main component ──────────────────────────────────

export const AIInsightsSidebar: React.FC<Props> = ({ patient, patientId }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Caramel quick briefing state
  const [caramelText, setCaramelText] = useState<string | null>(null);
  const [caramelLoading, setCaramelLoading] = useState(false);
  const [caramelOpen, setCaramelOpen] = useState(false);


  useEffect(() => {
    setAlerts(deriveAlerts(patient));
  }, [patient]);

  const generateCaramelBriefing = async () => {
    setCaramelLoading(true);
    try {
      const text = await generateDoctorBriefing(patient);
      setCaramelText(text);
      setCaramelOpen(true);
    } catch {
      setCaramelText('Não foi possível gerar o resumo agora. Tente novamente em instantes.');
      setCaramelOpen(true);
    } finally {
      setCaramelLoading(false);
    }
  };


  const calTrend  = patient.weekly_history.map(w => w.avg_calories);
  const protTrend = patient.weekly_history.map(w => w.avg_protein);
  const adhrTrend = patient.weekly_history.map(w => w.adherence_percent);

  const critical = alerts.filter(a => a.level === 'critical').length;
  const warnings = alerts.filter(a => a.level === 'warning').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-[#7d4a3c]" />
        <h3 className="text-sm font-bold text-gray-800">Insights de IA</h3>
        {critical > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
            {critical} crítico{critical > 1 ? 's' : ''}
          </span>
        )}
        {critical === 0 && warnings > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
            {warnings} alerta{warnings > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Alertas */}
      <div className="space-y-2">
        {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
      </div>

      {/* Tendências */}
      {patient.weekly_history.length >= 2 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-700">Tendências (8 semanas)</p>
          </div>
          <Trend values={calTrend}  label="Calorias"  unit="kcal" />
          <Trend values={protTrend} label="Proteína"  unit="g" />
          <Trend values={adhrTrend} label="Adesão"    unit="%" />
        </div>
      )}

      <AIBlock
        title="Resumo Rápido"
        icon={<Brain className="w-4 h-4 text-[#7d4a3c]" />}
        accentClass="from-[#7d4a3c]/5 to-transparent"
        loading={caramelLoading}
        content={caramelText}
        open={caramelOpen}
        onToggle={() => caramelText ? setCaramelOpen(o => !o) : generateCaramelBriefing()}
        onRegenerate={generateCaramelBriefing}
        cta="Análise rápida dos dados nutricionais e check-ins."
      />

    </div>
  );
};
