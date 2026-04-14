import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { glp1Service } from '../services/glp1Service';
import type { GLP1Dose, GLP1ApplicationSchedule } from '../types';
import {
  GLP1_PROTOCOLS,
  GLP1_MEDICATION_LIST,
  APPLICATION_SITES,
  SIDE_EFFECTS,
  getNextApplicationDate,
  getWeeksElapsed,
} from '../constants/glp1Protocols';

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
    'Nos primeiros dias, priorize refeições pequenas e ricas em proteína para minimizar a náusea.',
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

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Sub-components
const GoalCard: React.FC<{ icon: string; label: string; value: string; sub: string; prescribed?: boolean }> = ({
  icon, label, value, sub, prescribed,
}) => (
  <div className="bg-nura-bg dark:bg-background-dark rounded-lg p-2.5 relative">
    {prescribed && (
      <span className="absolute top-1 right-1 text-[7px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 px-1 py-0.5 rounded-full leading-none">
        Dr.
      </span>
    )}
    <div className="flex items-center gap-1 mb-0.5">
      <span className="text-xs">{icon}</span>
      <span className="text-[10px] text-nura-muted dark:text-slate-500 font-medium">{label}</span>
    </div>
    <p className="text-sm font-bold text-nura-main dark:text-white leading-none">{value}</p>
    <p className="text-[9px] text-nura-muted dark:text-slate-500 mt-0.5">{sub}</p>
  </div>
);

const EnergyBar: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-0.5">
      <span className="text-nura-muted dark:text-slate-500">{label}</span>
      <span className="font-semibold text-nura-main dark:text-white">{value}/5</span>
    </div>
    <div className="h-1.5 bg-nura-bg dark:bg-background-dark rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${(value / 5) * 100}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

// Main component
export const GLP1Section: React.FC<GLP1SectionProps> = ({ className }) => {
  const { profile, user, updateProfile } = useAuth();

  // State
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [doseHistory, setDoseHistory] = useState<GLP1Dose[]>([]);
  const [baselineWeight, setBaselineWeight] = useState<number | null>(null);
  const [checkinSymptoms, setCheckinSymptoms] = useState<string[]>([]);
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Dose log modal state
  const [showLogDoseModal, setShowLogDoseModal] = useState(false);
  const [logDoseSaving, setLogDoseSaving] = useState(false);
  const [logSite, setLogSite] = useState('');
  const [logEffects, setLogEffects] = useState<string[]>([]);
  const [logEnergy, setLogEnergy] = useState(3);
  const [logMood, setLogMood] = useState(3);
  const [logNotes, setLogNotes] = useState('');

  // Schedule config
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedFreq, setSchedFreq] = useState<'weekly' | 'daily'>(
    profile?.glp1_application_schedule?.frequency || 'weekly'
  );
  const [schedDay, setSchedDay] = useState(profile?.glp1_application_schedule?.day_of_week ?? 1);
  const [schedTime, setSchedTime] = useState(profile?.glp1_application_schedule?.time || '09:00');
  const [schedSaving, setSchedSaving] = useState(false);
  const [pushActive, setPushActive] = useState(false);

  // Derived values
  const medication = profile?.glp1_medication || '';
  const medicationKey = GLP1_MEDICATION_LIST.find(m =>
    m.label.toLowerCase().includes(medication.toLowerCase()) ||
    medication.toLowerCase().includes(m.value)
  )?.value || '';
  const protocol = GLP1_PROTOCOLS[medicationKey];
  const phase = profile?.glp1_phase || 'start';
  const phaseInfo = PHASE_LABELS[phase];
  const weightKg = profile?.weight || 70;
  const startDate = profile?.glp1_start_date;
  const prescription = profile?.glp1_doctor_prescription;

  const weeksOfUse = useMemo(() =>
    startDate ? getWeeksElapsed(startDate) : 0,
    [startDate]
  );

  const daysUntilExpiry = useMemo(() => {
    if (!profile?.glp1_prescription_expiry) return null;
    const expiry = new Date(profile.glp1_prescription_expiry);
    return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86400000));
  }, [profile?.glp1_prescription_expiry]);

  const currentDoseMg = profile?.glp1_current_dose_mg ??
    (protocol ? protocol.dose_steps[0].dose_mg : null);

  const nextEscalationStep = useMemo(() => {
    if (!medicationKey || !currentDoseMg) return null;
    return glp1Service.getNextEscalationStep(medicationKey, currentDoseMg);
  }, [medicationKey, currentDoseMg]);

  const nextApplicationDate = useMemo(() => {
    const schedule = prescription?.frequency && prescription?.time
      ? { frequency: prescription.frequency, day_of_week: prescription.day_of_week, time: prescription.time }
      : profile?.glp1_application_schedule;
    if (!schedule) return null;
    return getNextApplicationDate(schedule as GLP1ApplicationSchedule);
  }, [profile?.glp1_application_schedule, prescription]);

  const daysUntilApplication = useMemo(() => {
    if (!nextApplicationDate) return null;
    const diff = nextApplicationDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [nextApplicationDate]);

  const lastDose = doseHistory[0] ?? null;
  const suggestedSite = useMemo(() =>
    glp1Service.suggestNextSite(lastDose),
    [lastDose?.application_site]
  );

  const goals = useMemo(() => {
    const calories = prescription?.macro_calories || profile?.target_calories || 1800;
    const protein = prescription?.macro_protein_g || profile?.target_protein || Math.round(weightKg * 1.8);
    const carbs = prescription?.macro_carbs_g || profile?.target_carbs || 180;
    const fats = prescription?.macro_fats_g || profile?.target_fats || 60;
    const hydration = Math.round(weightKg * 35);
    return { calories, protein, carbs, fats, hydration };
  }, [prescription, profile, weightKg]);

  const dailyTip = useMemo(() => {
    const tips = AI_TIPS[phase];
    return tips[new Date().getDate() % tips.length];
  }, [phase]);

  const weightDelta = useMemo(() => {
    const current = weightHistory[weightHistory.length - 1]?.weight;
    if (!baselineWeight || !current) return null;
    return +(current - baselineWeight).toFixed(1);
  }, [baselineWeight, weightHistory]);

  const nextDose = useMemo(() => {
    const now = Date.now();
    return doseHistory.find(d =>
      d.next_dose_scheduled_at && new Date(d.next_dose_scheduled_at).getTime() > now
    ) || null;
  }, [doseHistory]);

  const daysUntilNextDose = useMemo(() => {
    if (!nextDose?.next_dose_scheduled_at) return null;
    const diff = new Date(nextDose.next_dose_scheduled_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [nextDose]);

  // Data loading
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [weights, doses] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('date, weight')
          .eq('user_id', user.id)
          .not('weight', 'is', null)
          .order('date', { ascending: true })
          .limit(90)
          .then(r => r.data || []),
        glp1Service.getDoseHistory(user.id, 20),
      ]);
      setWeightHistory(weights.map((d: any) => ({ date: d.date, weight: d.weight })));
      setDoseHistory(doses);
      if (startDate) {
        const bw = await glp1Service.getBaselineWeight(user.id, startDate);
        setBaselineWeight(bw);
      }
    };
    load().catch(console.error);
  }, [user, startDate]);

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
    setPushActive(
      'Notification' in window && Notification.permission === 'granted' &&
      !!localStorage.getItem('notifications_enabled')
    );
  }, [user]);

  // Handlers
  const toggleCheckinSymptom = (s: string) => {
    if (s === 'well') { setCheckinSymptoms(['well']); return; }
    setCheckinSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev.filter(x => x !== 'well'), s]
    );
  };

  const handleCheckin = async () => {
    if (!user) return;
    setCheckinSaving(true);
    try {
      const entry = { date: new Date().toISOString().split('T')[0], symptoms: checkinSymptoms };
      const updated = [...(profile?.glp1_weekly_checkins || []), entry];
      await supabase.from('profiles').update({ glp1_weekly_checkins: updated }).eq('id', user.id);
      await updateProfile({ glp1_weekly_checkins: updated });
      setCheckinDone(true);
    } finally {
      setCheckinSaving(false);
    }
  };

  const handleLogDose = async () => {
    if (!user || !medication) return;
    setLogDoseSaving(true);
    try {
      const appliedAt = new Date().toISOString();
      await glp1Service.saveFullDose(user.id, {
        medication,
        dose_mg: currentDoseMg,
        applied_at: appliedAt,
        is_first: doseHistory.length === 0,
        phase,
        application_site: logSite || null,
        side_effects: logEffects.length > 0 ? logEffects : null,
        energy_level: logEnergy,
        mood_level: logMood,
        notes: logNotes || null,
        next_dose_scheduled_at: nextApplicationDate?.toISOString() || null,
      });
      const updated = await glp1Service.getDoseHistory(user.id, 20);
      setDoseHistory(updated);
      setShowLogDoseModal(false);
      setLogSite('');
      setLogEffects([]);
      setLogEnergy(3);
      setLogMood(3);
      setLogNotes('');
    } finally {
      setLogDoseSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!user) return;
    setSchedSaving(true);
    try {
      const schedule: GLP1ApplicationSchedule = {
        frequency: schedFreq,
        day_of_week: schedFreq === 'weekly' ? schedDay : undefined,
        time: schedTime,
      };
      await glp1Service.saveApplicationSchedule(user.id, schedule);
      await updateProfile({ glp1_application_schedule: schedule });
    } finally {
      setSchedSaving(false);
      setShowScheduleModal(false);
    }
  };

  const recentCheckins = (profile?.glp1_weekly_checkins || []).slice(-3).reverse();

  // Weight chart
  const renderWeightChart = () => {
    const data = startDate ? weightHistory.filter(w => w.date >= startDate) : weightHistory;
    if (data.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <span className="material-symbols-outlined text-nura-muted dark:text-slate-500 mb-1" style={{ fontSize: 28 }}>monitoring</span>
          <p className="text-xs text-nura-muted dark:text-slate-400">Registre peso no diário para ver a curva.</p>
        </div>
      );
    }
    const weights = data.map(w => w.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const range = maxW - minW || 1;
    const chartH = 80, chartW = 280;
    const step = chartW / (weights.length - 1);
    const points = weights.map((w, i) => ({ x: i * step, y: chartH - ((w - minW) / range) * chartH }));
    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${chartH} L ${points[0].x} ${chartH} Z`;
    return (
      <div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-xl font-bold text-nura-main dark:text-white">{weights[weights.length - 1]}kg</span>
          {weightDelta !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${weightDelta <= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
              {weightDelta <= 0 ? '▼' : '▲'} {Math.abs(weightDelta)}kg
            </span>
          )}
        </div>
        <svg viewBox={`-5 -5 ${chartW + 10} ${chartH + 10}`} className="w-full h-20">
          <defs>
            <linearGradient id="glp1-sec-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#glp1-sec-grad)" />
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill="#10b981" />
        </svg>
        <div className="flex justify-between text-[10px] text-nura-muted dark:text-slate-500">
          <span>{data[0].date.slice(5)}</span>
          <span>{data[data.length - 1].date.slice(5)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`px-6 flex flex-col gap-3 ${className || ''}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">💊</span>
          <div>
            <h3 className="text-sm font-bold text-nura-main dark:text-white">Programa GLP-1</h3>
            <p className="text-[10px] text-nura-muted dark:text-slate-500">Semana {weeksOfUse}</p>
          </div>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
            {phaseInfo.emoji} {phaseInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Log dose button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowLogDoseModal(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          <span
            className="material-symbols-outlined text-nura-muted dark:text-slate-400 text-sm transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Prescription badge */}
      {prescription && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
          <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-sm">medical_services</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 truncate">
              Prescrito por {prescription.doctor_name}
            </p>
            <p className="text-[10px] text-purple-500 dark:text-purple-400">
              Atualizado {new Date(prescription.prescribed_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      <div className={`overflow-hidden transition-all duration-400 ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-3">

          {/* Quick stats row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Next application */}
            <div className="bg-white dark:bg-surface-dark rounded-xl p-3 shadow-sm border border-nura-border dark:border-transparent">
              <p className="text-[10px] text-nura-muted dark:text-slate-500 uppercase tracking-wide mb-1">Próxima aplicação</p>
              {nextApplicationDate ? (
                <>
                  <p className="text-base font-bold text-nura-main dark:text-white">
                    {daysUntilApplication === 0 ? 'Hoje!' : daysUntilApplication === 1 ? 'Amanhã' : `Em ${daysUntilApplication} dias`}
                  </p>
                  <p className="text-[10px] text-nura-muted dark:text-slate-400 mt-0.5">
                    {nextApplicationDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {suggestedSite.emoji} {suggestedSite.label}
                  </p>
                </>
              ) : (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-1"
                >
                  Configurar horário →
                </button>
              )}
            </div>

            {/* Dose */}
            <div className="bg-white dark:bg-surface-dark rounded-xl p-3 shadow-sm border border-nura-border dark:border-transparent">
              <p className="text-[10px] text-nura-muted dark:text-slate-500 uppercase tracking-wide mb-1">Dose atual</p>
              <p className="text-base font-bold text-nura-main dark:text-white leading-tight">
                {currentDoseMg ? `${currentDoseMg}mg` : '—'}
              </p>
              {nextEscalationStep && (
                <p className="text-[10px] text-amber-500 mt-1">
                  Próxima: {nextEscalationStep.dose_mg}mg
                </p>
              )}
            </div>
          </div>

          {/* Prescription expiry */}
          {daysUntilExpiry !== null && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${daysUntilExpiry <= 14 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30'}`}>
              <span className="material-symbols-outlined text-amber-500 dark:text-amber-400">event</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-nura-main dark:text-white">Renovação da receita</p>
                <p className="text-xs text-nura-muted dark:text-slate-400">
                  {daysUntilExpiry === 0 ? 'Vencida hoje' : `Vence em ${daysUntilExpiry} dias`}
                </p>
              </div>
            </div>
          )}

          {/* Goals card */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-nura-main dark:text-white">
                Metas {prescription ? 'prescritas' : 'ajustadas'}
              </h3>
              {prescription?.macro_calories && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[9px] font-bold rounded-full">
                  Dr. {prescription.doctor_name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GoalCard icon="🔥" label="Calorias" value={`${goals.calories} kcal`} sub="Meta diária" prescribed={!!prescription?.macro_calories} />
              <GoalCard icon="🥩" label="Proteína" value={`${goals.protein}g`} sub="Preservar músculo" prescribed={!!prescription?.macro_protein_g} />
              <GoalCard icon="🥬" label="Fibras" value="25g/dia" sub="Anti-constipação" />
              <GoalCard icon="💧" label="Hidratação" value={`${(goals.hydration / 1000).toFixed(1)}L`} sub={`35ml × ${weightKg}kg`} />
            </div>
            {prescription?.notes && (
              <div className="mt-3 pt-3 border-t border-nura-border dark:border-white/10">
                <p className="text-[10px] text-nura-muted dark:text-slate-500 font-semibold uppercase tracking-wide mb-1">Orientações do médico</p>
                <p className="text-xs text-nura-muted dark:text-slate-400 leading-relaxed">{prescription.notes}</p>
              </div>
            )}
          </div>

          {/* Dose escalation tracker */}
          {protocol && currentDoseMg && (
            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
              <h3 className="text-sm font-bold text-nura-main dark:text-white mb-3">Progressão de dose</h3>
              <div className="relative flex items-center gap-1">
                {protocol.dose_steps.map((step, i) => {
                  const isActive = step.dose_mg === currentDoseMg;
                  const isPast = step.dose_mg < currentDoseMg;
                  const isNext = nextEscalationStep?.dose_mg === step.dose_mg;
                  return (
                    <React.Fragment key={step.dose_mg}>
                      {i > 0 && (
                        <div className={`flex-1 h-0.5 ${isPast || isActive ? 'bg-emerald-400' : 'bg-nura-border dark:bg-slate-600'}`} />
                      )}
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${isActive ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : isPast ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' : isNext ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' : 'bg-nura-bg dark:bg-slate-700 border-nura-border dark:border-slate-600 text-nura-muted dark:text-slate-500'}`}>
                          {isPast ? '✓' : `${step.dose_mg}`}
                        </div>
                        <span className="text-[8px] text-nura-muted dark:text-slate-500 mt-0.5 w-10 text-center leading-tight">
                          {step.dose_mg}mg
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              {protocol.escalation_note && (
                <p className="text-[10px] text-nura-muted dark:text-slate-500 mt-3 leading-relaxed">{protocol.escalation_note}</p>
              )}
            </div>
          )}

          {/* Weight evolution */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-nura-main dark:text-white">Evolução de peso</h3>
            </div>
            {renderWeightChart()}
          </div>

          {/* Weekly checkin */}
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wide">Check-in semanal de sintomas</span>
              {checkinDone && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Feito</span>}
            </div>
            {checkinDone ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm">✅</span>
                <p className="text-xs text-nura-muted dark:text-slate-400">Check-in registrado. Próximo em 7 dias.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-nura-muted dark:text-slate-400 mb-2">Como você se sentiu esta semana?</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(SYMPTOM_LABELS).map(([id, s]) => (
                    <button
                      key={id}
                      onClick={() => toggleCheckinSymptom(id)}
                      className={`px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all ${checkinSymptoms.includes(id)
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400 hover:border-nura-petrol/30 dark:hover:border-white/20'
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
                  {checkinSaving ? 'Registrando...' : 'Registrar check-in'}
                </button>
              </>
            )}
            {recentCheckins.length > 0 && (
              <div className="mt-3 pt-3 border-t border-nura-border dark:border-white/10 space-y-2">
                {recentCheckins.map((c: any, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="text-nura-muted dark:text-slate-500 w-12 flex-shrink-0">{c.date?.slice(5)}</span>
                    <div className="flex flex-wrap gap-1">
                      {(c.symptoms || []).map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 bg-nura-pastel-orange dark:bg-slate-700/50 rounded-full text-nura-muted dark:text-slate-400">
                          {SYMPTOM_LABELS[s]?.emoji} {SYMPTOM_LABELS[s]?.label || s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application site rotation */}
          {lastDose?.application_site && protocol && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Rotação de local</p>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-nura-muted dark:text-slate-500">Última</p>
                  <p className="text-xs font-semibold text-nura-main dark:text-white">
                    {APPLICATION_SITES.find(s => s.value === lastDose.application_site)?.label || lastDose.application_site}
                  </p>
                </div>
                <span className="material-symbols-outlined text-amber-400 dark:text-amber-500 text-sm">arrow_forward</span>
                <div className="text-center">
                  <p className="text-[10px] text-nura-muted dark:text-slate-500">Sugerida</p>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {suggestedSite.emoji} {suggestedSite.label}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dose history */}
          {doseHistory.length > 0 && (
            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-nura-border dark:border-transparent">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wide">Histórico de aplicações</span>
                {pushActive && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                    <span className="material-symbols-outlined text-[11px]">notifications_active</span>
                    Alertas ativos
                  </span>
                )}
              </div>
              {/* Next dose countdown */}
              {nextDose && daysUntilNextDose !== null && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-nura-pastel-orange dark:bg-slate-700/40 rounded-xl">
                  <span className="text-xl">💉</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-nura-main dark:text-white">Próxima dose</p>
                    <p className="text-[11px] text-nura-muted dark:text-slate-400">
                      {nextDose.medication}{nextDose.dose_mg ? ` ${nextDose.dose_mg}mg` : ''} — {daysUntilNextDose === 0 ? 'Hoje!' : daysUntilNextDose === 1 ? 'Amanhã' : `em ${daysUntilNextDose} dias`}
                    </p>
                    <p className="text-[10px] text-nura-muted dark:text-slate-500">
                      {new Date(nextDose.next_dose_scheduled_at!).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {/* Past doses */}
              <div className="space-y-3">
                {doseHistory.slice(0, 5).map((dose, i) => {
                  const site = APPLICATION_SITES.find(s => s.value === dose.application_site);
                  return (
                    <div key={dose.id || i} className="relative">
                      {i < doseHistory.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-px bg-nura-border dark:bg-slate-700" />
                      )}
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 z-10">
                          <span className="text-xs">💉</span>
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-semibold text-nura-main dark:text-white">
                                {dose.medication} {dose.dose_mg ? `${dose.dose_mg}mg` : ''}
                                {dose.is_first && (
                                  <span className="ml-1.5 text-[8px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                                    1ª dose
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-nura-muted dark:text-slate-500 mt-0.5">
                                {new Date(dose.applied_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {new Date(dose.applied_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {site && (
                              <span className="text-[10px] text-nura-muted dark:text-slate-500 flex-shrink-0">{site.emoji} {site.label}</span>
                            )}
                          </div>
                          {dose.side_effects && dose.side_effects.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {dose.side_effects.map(e => {
                                const s = SIDE_EFFECTS.find(x => x.value === e);
                                return (
                                  <span key={e} className="text-[9px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full">
                                    {s?.emoji} {s?.label || e}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {(dose.energy_level || dose.mood_level) && (
                            <div className="mt-1.5 flex gap-3">
                              {dose.energy_level && <span className="text-[9px] text-nura-muted dark:text-slate-500">⚡ {dose.energy_level}/5</span>}
                              {dose.mood_level && <span className="text-[9px] text-nura-muted dark:text-slate-500">😊 {dose.mood_level}/5</span>}
                            </div>
                          )}
                          {dose.notes && <p className="text-[9px] text-nura-muted dark:text-slate-500 italic mt-1">{dose.notes}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Safety rules */}
          {protocol && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800/30">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Regra de segurança</p>
                  <p className="text-xs text-nura-muted dark:text-slate-400">
                    Se você esqueceu a aplicação há mais de <strong>{protocol.max_skip_days} dias</strong>, não aplique a dose — consulte seu médico antes de retomar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Storage reminder */}
          {protocol && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-start gap-3">
                <span className="text-lg">🌡️</span>
                <div>
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Armazenamento</p>
                  <p className="text-xs text-nura-muted dark:text-slate-400">
                    <strong>Frasco lacrado:</strong> {protocol.storage_sealed}
                  </p>
                  <p className="text-xs text-nura-muted dark:text-slate-400 mt-0.5">
                    <strong>Após abertura:</strong> {protocol.storage_open}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI tip */}
          <div className="bg-emerald-50/60 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">🧠</span>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Dica para hoje</p>
                <p className="text-xs text-nura-main dark:text-white leading-relaxed">{dailyTip}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── LOG DOSE MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogDoseModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogDoseModal(false)} />
            <motion.div
              className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-nura-border dark:bg-slate-600 rounded-full mx-auto mb-5" />
              <h3 className="text-base font-bold text-nura-main dark:text-white mb-4">Registrar aplicação</h3>

              {/* Dose info */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl mb-4">
                <span className="text-2xl">💉</span>
                <div>
                  <p className="text-sm font-bold text-nura-main dark:text-white">{medication} {currentDoseMg ? `${currentDoseMg}mg` : ''}</p>
                  <p className="text-xs text-nura-muted dark:text-slate-400">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                </div>
              </div>

              {/* Application site */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-nura-main dark:text-white mb-2">Local de aplicação</p>
                <div className="grid grid-cols-3 gap-2">
                  {APPLICATION_SITES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setLogSite(s.value)}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center ${logSite === s.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400'}`}
                    >
                      <span className="block text-lg mb-0.5">{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Sugerido: {suggestedSite.emoji} {suggestedSite.label}
                </p>
              </div>

              {/* Side effects */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-nura-main dark:text-white mb-2">Efeitos colaterais hoje</p>
                <div className="flex flex-wrap gap-2">
                  {SIDE_EFFECTS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => {
                        if (s.value === 'well') { setLogEffects(['well']); return; }
                        setLogEffects(prev => prev.includes(s.value) ? prev.filter(x => x !== s.value) : [...prev.filter(x => x !== 'well'), s.value]);
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${logEffects.includes(s.value) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400'}`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy & mood */}
              <div className="mb-4 space-y-3">
                <EnergyBar value={logEnergy} label="Energia" color="#10b981" />
                <EnergyBar value={logMood} label="Humor" color="#f59e0b" />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-nura-muted dark:text-slate-500 mb-1">Energia</p>
                    <input type="range" min="1" max="5" value={logEnergy} onChange={e => setLogEnergy(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-nura-muted dark:text-slate-500 mb-1">Humor</p>
                    <input type="range" min="1" max="5" value={logMood} onChange={e => setLogMood(Number(e.target.value))} className="w-full accent-amber-500" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-nura-main dark:text-white mb-2">Observações</p>
                <textarea
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="Como foi a aplicação? Alguma observação?"
                  className="w-full p-3 bg-nura-bg dark:bg-background-dark border border-nura-border dark:border-white/10 rounded-xl text-xs text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-slate-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogDoseModal(false)}
                  className="flex-1 py-3 rounded-xl border border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogDose}
                  disabled={logDoseSaving || !logSite}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {logDoseSaving ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SCHEDULE MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowScheduleModal(false)} />
            <motion.div
              className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl p-6 pb-10"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-nura-border dark:bg-slate-600 rounded-full mx-auto mb-5" />
              <h3 className="text-base font-bold text-nura-main dark:text-white mb-4">Horário de aplicação</h3>

              {/* Frequency */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-nura-main dark:text-white mb-2">Frequência</p>
                <div className="flex gap-2">
                  {(['weekly', 'daily'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSchedFreq(f)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${schedFreq === f ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400'}`}
                    >
                      {f === 'weekly' ? 'Semanal' : 'Diária'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of week */}
              {schedFreq === 'weekly' && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-nura-main dark:text-white mb-2">Dia da semana</p>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => setSchedDay(i)}
                        className={`py-2 rounded-xl text-[10px] font-medium transition-all ${schedDay === i ? 'bg-emerald-500 text-white' : 'bg-nura-bg dark:bg-background-dark text-nura-muted dark:text-slate-400'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-nura-main dark:text-white mb-2">Horário</p>
                <input
                  type="time"
                  value={schedTime}
                  onChange={e => setSchedTime(e.target.value)}
                  className="w-full p-3 bg-nura-bg dark:bg-background-dark border border-nura-border dark:border-white/10 rounded-xl text-sm text-nura-main dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 rounded-xl border border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={schedSaving}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {schedSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GLP1Section;
