// =====================================================
// Malama — Timeline Conduta → Desfecho (pilar do loop fechado)
// Mostra cada conduta registrada e o desfecho medido em T+N.
// =====================================================

import React, { useEffect, useState } from 'react';
import { Activity, TrendingDown, TrendingUp, Minus, Brain, Stethoscope, User, Cog } from 'lucide-react';
import { ClinicalLoopService } from '../../services/clinicalLoopService';
import type { ConductWithOutcomes, ConductType } from '../../types/clinicalLoop';

interface Props { patientId: string; }

const CONDUCT_LABEL: Record<ConductType, string> = {
  macro_target:      'Meta de macros',
  glp1_prescription: 'Prescrição GLP-1',
  glp1_dose:         'Dose GLP-1',
  diagnosis:         'Diagnóstico',
  therapeutic_plan:  'Plano terapêutico',
  activity_goal:     'Meta de atividade',
  hydration_goal:    'Meta de hidratação',
};

const METRIC_LABEL: Record<string, string> = {
  weight_kg:    'Peso',
  body_fat_pct: 'Gordura',
  waist_cm:     'Cintura',
  bmi:          'IMC',
};

const ACTOR_ICON: Record<string, React.ReactNode> = {
  ai_agent: <Brain className="w-3.5 h-3.5 text-purple-500" />,
  doctor:   <Stethoscope className="w-3.5 h-3.5 text-blue-500" />,
  patient:  <User className="w-3.5 h-3.5 text-gray-500" />,
  system:   <Cog className="w-3.5 h-3.5 text-gray-400" />,
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const summarizePayload = (type: ConductType, payload: Record<string, unknown>): string => {
  if (type === 'macro_target') {
    return `${payload.calories ?? '—'} kcal · P ${payload.protein ?? '—'}g · C ${payload.carbs ?? '—'}g · G ${payload.fats ?? '—'}g`;
  }
  if (type === 'glp1_dose')         return `${payload.dose_mg ?? '—'} mg`;
  if (type === 'diagnosis')         return String(payload.diagnosis ?? '');
  if (type === 'therapeutic_plan')  return String(payload.plan ?? '');
  return JSON.stringify(payload).slice(0, 120);
};

const OutcomeChip: React.FC<{ metric: string; horizon: number; delta: number | null; deltaPct: number | null }> = ({ metric, horizon, delta, deltaPct }) => {
  const down = (delta ?? 0) < 0;
  const flat = (delta ?? 0) === 0;
  const Icon = flat ? Minus : down ? TrendingDown : TrendingUp;
  // p/ peso/gordura/cintura/IMC, queda = bom (verde)
  const color = flat ? 'text-gray-500 bg-gray-100' : down ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {METRIC_LABEL[metric] ?? metric} {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
      {deltaPct != null ? ` (${deltaPct > 0 ? '+' : ''}${deltaPct}%)` : ''} · {horizon}d
    </span>
  );
};

export const ClinicalTimeline: React.FC<Props> = ({ patientId }) => {
  const [items, setItems] = useState<ConductWithOutcomes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await ClinicalLoopService.getPatientTimeline(patientId);
        if (active) setItems(data);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="w-9 h-9 text-gray-200 mb-2" />
        <p className="text-sm font-semibold text-gray-600">Sem condutas registradas</p>
        <p className="text-xs text-gray-400 mt-1">Condutas e desfechos aparecem aqui conforme o tratamento evolui.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[#7d4a3c]" />
        <p className="text-sm font-semibold text-gray-700">Evolução: conduta → desfecho</p>
      </div>

      <ol className="relative border-l border-gray-200 ml-2 space-y-4">
        {items.map(item => (
          <li key={item.id} className="ml-4">
            <span className="absolute -left-1.5 w-3 h-3 bg-[#7d4a3c] rounded-full mt-1.5" />
            <div className="flex items-center gap-2 flex-wrap">
              {ACTOR_ICON[item.actor_role]}
              <span className="text-xs font-semibold text-gray-700">{CONDUCT_LABEL[item.conduct_type]}</span>
              <span className="text-[10px] text-gray-400">{fmtDate(item.effective_from)}</span>
              {item.source_report_id && (
                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-semibold rounded-full">via IA</span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{summarizePayload(item.conduct_type, item.payload)}</p>
            {item.rationale && <p className="text-[11px] text-gray-400 italic mt-0.5">{item.rationale}</p>}
            {item.outcomes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {item.outcomes
                  .sort((a, b) => a.horizon_days - b.horizon_days)
                  .map(o => (
                    <OutcomeChip key={o.id} metric={o.metric} horizon={o.horizon_days} delta={o.delta} deltaPct={o.delta_pct} />
                  ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
