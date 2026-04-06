import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface GLP1SectionProps {
  className?: string;
}

interface WeightEntry {
  date: string;
  weight: number;
}

const PHASE_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  start: { label: 'Início', emoji: '🌱', desc: 'Menos de 1 mês' },
  adjust: { label: 'Ajuste', emoji: '⚖️', desc: '1 a 3 meses' },
  maintain: { label: 'Manutenção', emoji: '🚀', desc: 'Mais de 3 meses' },
};

const SYMPTOM_LABELS: Record<string, { emoji: string; label: string }> = {
  nausea: { emoji: '🤢', label: 'Náusea' },
  satiety: { emoji: '🍽️', label: 'Saciedade rápida' },
  constipation: { emoji: '💣', label: 'Constipação' },
  fatigue: { emoji: '😴', label: 'Fadiga' },
  reflux: { emoji: '🔥', label: 'Refluxo' },
  well: { emoji: '😊', label: 'Bem' },
};

const AI_TIPS: Record<string, string[]> = {
  start: [
    'Nos primeiros dias, prioriza refeições pequenas e ricas em proteína para minimizar a náusea.',
    'Coma devagar e pare quando sentir saciedade — seu corpo está se adaptando.',
    'Beba água entre as refeições, não durante. Isso ajuda na digestão.',
    'Evite alimentos muito gordurosos ou fritos — podem piorar a náusea inicial.',
  ],
  adjust: [
    'Na fase de ajuste, mantenha a proteína alta para preservar massa muscular.',
    'Tente distribuir a proteína por todas as refeições do dia.',
    'Se sentir constipação, aumente o consumo de fibras e água.',
    'Caminhadas leves após as refeições ajudam na digestão.',
  ],
  maintain: [
    'Na fase de manutenção, foque em consolidar os hábitos alimentares para manter o resultado.',
    'Treino de força é essencial para preservar massa muscular durante a perda de peso.',
    'Você já pode experimentar porções um pouco maiores — observe como seu corpo reage.',
    'Planeje as refeições da semana para manter a consistência.',
  ],
};

export const GLP1Section: React.FC<GLP1SectionProps> = ({ className }) => {
  const { profile, user, updateProfile } = useAuth();
  const [checkinSymptoms, setCheckinSymptoms] = useState<string[]>([]);
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [expanded, setExpanded] = useState(true);

  const phaseInfo = PHASE_LABELS[profile?.glp1_phase || 'start'];
  const weightKg = profile?.weight || 70;

  const targets = useMemo(() => {
    const proteinTarget = Math.round(weightKg * 1.2);
    const fiberTarget = 25;
    const hydrationTarget = Math.round(weightKg * 35);
    const calorieTarget = profile?.target_calories ? profile.target_calories - 300 : 1800;
    return { proteinTarget, fiberTarget, hydrationTarget, calorieTarget };
  }, [weightKg, profile?.target_calories]);

  const daysUntilExpiry = useMemo(() => {
    if (!profile?.glp1_prescription_expiry) return null;
    const expiry = new Date(profile.glp1_prescription_expiry);
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [profile?.glp1_prescription_expiry]);

  const dailyTip = useMemo(() => {
    const tips = AI_TIPS[profile?.glp1_phase || 'start'];
    const dayIndex = new Date().getDate() % tips.length;
    return tips[dayIndex];
  }, [profile?.glp1_phase]);

  useEffect(() => {
    const checkins = profile?.glp1_weekly_checkins || [];
    if (checkins.length > 0) {
      const lastCheckin = new Date(checkins[checkins.length - 1].date);
      const daysSince = (Date.now() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) setCheckinDone(true);
    }
  }, [profile?.glp1_weekly_checkins]);

  useEffect(() => {
    if (!user) return;
    const loadWeights = async () => {
      const { data } = await supabase
        .from('daily_logs')
        .select('date, weight')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('date', { ascending: true })
        .limit(90);

      if (data) {
        setWeightHistory(data.filter((d: any) => d.weight).map((d: any) => ({ date: d.date, weight: d.weight })));
      }
    };
    loadWeights();
  }, [user]);

  const toggleCheckinSymptom = (s: string) => {
    if (s === 'well') {
      setCheckinSymptoms(['well']);
      return;
    }
    setCheckinSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev.filter(x => x !== 'well'), s]
    );
  };

  const handleCheckin = async () => {
    if (!user) return;
    setCheckinSaving(true);
    try {
      const newCheckin = {
        date: new Date().toISOString().split('T')[0],
        symptoms: checkinSymptoms,
      };
      const existing = profile?.glp1_weekly_checkins || [];
      const updated = [...existing, newCheckin];

      await supabase.from('profiles').update({
        glp1_weekly_checkins: updated,
      }).eq('id', user.id);

      await updateProfile({ glp1_weekly_checkins: updated });
      setCheckinDone(true);
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setCheckinSaving(false);
    }
  };

  const recentCheckins = (profile?.glp1_weekly_checkins || []).slice(-3).reverse();

  const renderWeightChart = () => {
    if (weightHistory.length < 2) {
      return (
        <div className="flex items-center gap-2 py-3 text-center justify-center">
          <span className="material-symbols-outlined text-nura-muted dark:text-slate-500 text-xl">monitoring</span>
          <p className="text-xs text-nura-muted dark:text-slate-400">Registre peso no diário para ver a curva.</p>
        </div>
      );
    }

    const weights = weightHistory.map(w => w.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    const chartH = 100;
    const chartW = 280;
    const step = chartW / (weights.length - 1);

    const points = weights.map((w, i) => ({
      x: i * step,
      y: chartH - ((w - minW) / range) * chartH,
    }));

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const midX = (points[i - 1].x + points[i].x) / 2;
      pathD += ` C ${midX} ${points[i - 1].y}, ${midX} ${points[i].y}, ${points[i].x} ${points[i].y}`;
    }

    const areaD = pathD + ` L ${points[points.length - 1].x} ${chartH} L ${points[0].x} ${chartH} Z`;

    const firstW = weights[0];
    const lastW = weights[weights.length - 1];
    const diff = lastW - firstW;

    return (
      <div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-nura-main dark:text-white">{lastW}kg</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            diff <= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
          }`}>
            {diff <= 0 ? '↓' : '↑'} {Math.abs(diff).toFixed(1)}kg
          </span>
        </div>
        <svg viewBox={`-5 -5 ${chartW + 10} ${chartH + 15}`} className="w-full h-24">
          <defs>
            <linearGradient id="glp1-weight-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className="text-emerald-500" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-emerald-500" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#glp1-weight-gradient)" />
          <path d={pathD} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-emerald-500" />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3.5} fill="currentColor" className="text-emerald-500" />
        </svg>
        <div className="flex justify-between text-[10px] text-nura-muted dark:text-slate-500">
          <span>{weightHistory[0].date.slice(5)}</span>
          <span>{weightHistory[weightHistory.length - 1].date.slice(5)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="px-6 flex flex-col gap-3">
      {/* Section Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💊</span>
          <h3 className="text-sm font-bold text-nura-main dark:text-white">Programa GLP-1</h3>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
            {phaseInfo.emoji} {phaseInfo.label}
          </span>
        </div>
        <span
          className="material-symbols-outlined text-nura-muted dark:text-slate-400 text-sm transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </div>

      <div className={`overflow-hidden transition-all duration-400 ${expanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-3">

          {/* Treatment Status — Compact Row */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">{phaseInfo.emoji}</span>
                <div>
                  <p className="font-semibold text-nura-main dark:text-white text-xs">{profile?.glp1_medication || '—'}</p>
                  <p className="text-[10px] text-nura-muted dark:text-slate-500">{phaseInfo.label} · {phaseInfo.desc}</p>
                </div>
              </div>
              {daysUntilExpiry !== null && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                  daysUntilExpiry <= 14
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'bg-nura-pastel-orange dark:bg-slate-700/50 text-nura-muted dark:text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-[12px]">event</span>
                  {daysUntilExpiry}d receita
                </div>
              )}
            </div>
          </div>

          {/* Adjusted Goals — 2x2 Grid */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wide">Metas GLP-1</span>
              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded-full">Ajustadas</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GoalCard icon="🔥" label="Calorias" value={`${targets.calorieTarget}`} unit="kcal" sub="-300 déficit" />
              <GoalCard icon="🥩" label="Proteína" value={`${targets.proteinTarget}`} unit="g" sub={`1.2×${weightKg}kg`} />
              <GoalCard icon="🥬" label="Fibras" value={`${targets.fiberTarget}`} unit="g/dia" sub="Anti constipação" />
              <GoalCard icon="💧" label="Água" value={`${(targets.hydrationTarget / 1000).toFixed(1)}`} unit="L" sub={`35ml×${weightKg}kg`} />
            </div>
          </div>

          {/* Weekly Symptom Check-in */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wide">Check-in semanal</span>
              {checkinDone && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Feito</span>}
            </div>

            {checkinDone ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm">✅</span>
                <p className="text-xs text-nura-muted dark:text-slate-400">Check-in registrado. Próximo em 7 dias.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-nura-muted dark:text-slate-400 mb-2">Como se sentiu esta semana?</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(SYMPTOM_LABELS).map(([id, s]) => (
                    <button
                      key={id}
                      onClick={() => toggleCheckinSymptom(id)}
                      className={`px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all ${
                        checkinSymptoms.includes(id)
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'border-nura-border dark:border-white/10 bg-white dark:bg-surface-dark text-nura-muted dark:text-slate-400 hover:border-nura-petrol/30 dark:hover:border-white/20'
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCheckin}
                  disabled={checkinSymptoms.length === 0 || checkinSaving}
                  className="w-full py-2 rounded-xl bg-nura-main dark:bg-white text-white dark:text-nura-main text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-30"
                >
                  {checkinSaving ? 'Registrando...' : 'Registrar'}
                </button>
              </>
            )}

            {recentCheckins.length > 0 && (
              <div className="mt-3 pt-3 border-t border-nura-border dark:border-white/5">
                <div className="flex flex-col gap-1.5">
                  {recentCheckins.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className="text-nura-muted dark:text-slate-500 w-12 flex-shrink-0">{c.date?.slice(5)}</span>
                      <div className="flex flex-wrap gap-1">
                        {(c.symptoms || []).map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 bg-nura-pastel-orange dark:bg-slate-700/50 rounded-full text-nura-muted dark:text-slate-400">
                            {SYMPTOM_LABELS[s]?.emoji || ''} {SYMPTOM_LABELS[s]?.label || s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weight Chart */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wide mb-2 block">Curva de peso</span>
            {renderWeightChart()}
          </div>

          {/* AI Tip */}
          <div className="bg-emerald-50/60 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">🧠</span>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Dica do dia</p>
                <p className="text-xs text-nura-main dark:text-white leading-relaxed">{dailyTip}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const GoalCard: React.FC<{ icon: string; label: string; value: string; unit: string; sub: string }> = ({ icon, label, value, unit, sub }) => (
  <div className="bg-nura-bg dark:bg-background-dark rounded-lg p-2.5">
    <div className="flex items-center gap-1 mb-0.5">
      <span className="text-xs">{icon}</span>
      <span className="text-[10px] text-nura-muted dark:text-slate-500 font-medium">{label}</span>
    </div>
    <p className="text-sm font-bold text-nura-main dark:text-white leading-none">
      {value}<span className="text-[10px] font-normal text-nura-muted dark:text-slate-500 ml-0.5">{unit}</span>
    </p>
    <p className="text-[9px] text-nura-muted dark:text-slate-500 mt-0.5">{sub}</p>
  </div>
);

export default GLP1Section;
