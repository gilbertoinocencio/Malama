import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { glp1Service } from '../services/glp1Service';
import { NotificationService } from '../services/notificationService';
import { AppView, type GLP1Dose, type GLP1ApplicationSchedule } from '../types';
import {
  GLP1_PROTOCOLS,
  GLP1_MEDICATION_LIST,
  APPLICATION_SITES,
  SIDE_EFFECTS,
  getNextApplicationDate,
  getWeeksElapsed,
} from '../constants/glp1Protocols';

interface GLP1DashboardProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

interface WeightEntry {
  date: string;
  weight: number;
}

// ─── Static data ────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  start:    { label: 'Início',      emoji: '🌱', desc: 'Menos de 1 mês' },
  adjust:   { label: 'Ajuste',      emoji: '⚖️', desc: '1 a 3 meses' },
  maintain: { label: 'Manutenção',  emoji: '🚀', desc: 'Mais de 3 meses' },
};

const SYMPTOM_LABELS: Record<string, { emoji: string; label: string }> = {
  nausea:       { emoji: '🤢', label: 'Náusea' },
  satiety:      { emoji: '🍽️', label: 'Saciedade rápida' },
  constipation: { emoji: '💣', label: 'Constipação' },
  fatigue:      { emoji: '😴', label: 'Fadiga' },
  reflux:       { emoji: '🔥', label: 'Refluxo' },
  well:         { emoji: '😊', label: 'Bem' },
};

const AI_TIPS: Record<string, string[]> = {
  start: [
    'Priorize refeições pequenas e ricas em proteína para minimizar a náusea.',
    'Coma devagar e pare quando sentir saciedade — seu corpo está se adaptando.',
    'Beba água entre as refeições, não durante.',
    'Evite alimentos muito gordurosos ou fritos nas primeiras semanas.',
  ],
  adjust: [
    'Mantenha a proteína alta para preservar massa muscular.',
    'Distribua a proteína por todas as refeições do dia.',
    'Se sentir constipação, aumente fibras e água.',
    'Caminhadas leves após as refeições ajudam na digestão.',
  ],
  maintain: [
    'Consolide os hábitos alimentares para manter o resultado a longo prazo.',
    'Treino de força é essencial para preservar massa muscular.',
    'Experimente porções um pouco maiores e observe como seu corpo reage.',
    'Planeje as refeições da semana para manter a consistência.',
  ],
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Sub-components ──────────────────────────────────────────────────────────

const GoalCard: React.FC<{ icon: string; label: string; value: string; sub: string; prescribed?: boolean }> = ({
  icon, label, value, sub, prescribed,
}) => (
  <div className="bg-gray-50 rounded-xl p-3 relative">
    {prescribed && (
      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-purple-600 bg-purple-100 px-1 py-0.5 rounded-full leading-none">
        Dr.
      </span>
    )}
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <p className="text-base font-bold text-gray-800">{value}</p>
    <p className="text-[10px] text-gray-400">{sub}</p>
  </div>
);

const EnergyBar: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700">{value}/5</span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${(value / 5) * 100}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const GLP1Dashboard: React.FC<GLP1DashboardProps> = ({ onBack, onNavigate }) => {
  const { profile, user, updateProfile } = useAuth();

  // State
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [doseHistory, setDoseHistory]     = useState<GLP1Dose[]>([]);
  const [baselineWeight, setBaselineWeight] = useState<number | null>(null);
  const [checkinSymptoms, setCheckinSymptoms] = useState<string[]>([]);
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinDone, setCheckinDone]     = useState(false);
  const [activeTab, setActiveTab]         = useState<'overview' | 'doses' | 'config'>('overview');
  const [showLogDoseModal, setShowLogDoseModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [logDoseSaving, setLogDoseSaving] = useState(false);

  // Dose log form state
  const [logSite, setLogSite]   = useState('');
  const [logEffects, setLogEffects] = useState<string[]>([]);
  const [logEnergy, setLogEnergy] = useState(3);
  const [logMood, setLogMood]   = useState(3);
  const [logNotes, setLogNotes] = useState('');

  // Schedule config form
  const [schedFreq, setSchedFreq] = useState<'weekly' | 'daily'>(
    profile?.glp1_application_schedule?.frequency || 'weekly'
  );
  const [schedDay, setSchedDay]   = useState(profile?.glp1_application_schedule?.day_of_week ?? 1);
  const [schedTime, setSchedTime] = useState(profile?.glp1_application_schedule?.time || '09:00');
  const [schedSaving, setSchedSaving] = useState(false);

  // ── Derived values ─────────────────────────────────────────────────────────
  const medication  = profile?.glp1_medication || '';
  const medicationKey = GLP1_MEDICATION_LIST.find(m =>
    m.label.toLowerCase().includes(medication.toLowerCase()) ||
    medication.toLowerCase().includes(m.value)
  )?.value || '';
  const protocol    = GLP1_PROTOCOLS[medicationKey];
  const phase       = profile?.glp1_phase || 'start';
  const phaseInfo   = PHASE_LABELS[phase];
  const weightKg    = profile?.weight || 70;
  const startDate   = profile?.glp1_start_date;
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

  // Next application date
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

  // Suggested site
  const lastDose = doseHistory[0] ?? null;
  const suggestedSite = useMemo(() =>
    glp1Service.suggestNextSite(lastDose),
    [lastDose?.application_site]
  );

  // Goals — doctor prescription takes priority, then profile, then calculated
  const goals = useMemo(() => {
    const calories = prescription?.macro_calories || profile?.target_calories || 1800;
    const protein  = prescription?.macro_protein_g || profile?.target_protein || Math.round(weightKg * 1.8);
    const carbs    = prescription?.macro_carbs_g   || profile?.target_carbs   || 180;
    const fats     = prescription?.macro_fats_g    || profile?.target_fats    || 60;
    const hydration = Math.round(weightKg * 35);
    return { calories, protein, carbs, fats, hydration };
  }, [prescription, profile, weightKg]);

  // Daily tip
  const dailyTip = useMemo(() => {
    const tips = AI_TIPS[phase];
    return tips[new Date().getDate() % tips.length];
  }, [phase]);

  // Weight delta since baseline
  const weightDelta = useMemo(() => {
    const current = weightHistory[weightHistory.length - 1]?.weight;
    if (!baselineWeight || !current) return null;
    return +(current - baselineWeight).toFixed(1);
  }, [baselineWeight, weightHistory]);

  // ── Data loading ───────────────────────────────────────────────────────────
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

  // Check if weekly checkin done
  useEffect(() => {
    const checkins = profile?.glp1_weekly_checkins || [];
    if (checkins.length === 0) return;
    const last = new Date(checkins[checkins.length - 1].date);
    if ((Date.now() - last.getTime()) / 86400000 < 7) setCheckinDone(true);
  }, [profile?.glp1_weekly_checkins]);

  // ── Handlers ───────────────────────────────────────────────────────────────
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

      // Write to glp1_doses (AI chat history + push notification scheduling)
      // saveFullDose also mirrors into glp1_dose_logs + sets the localStorage
      // confirmed-today flag, so no separate markGlp1DoseConfirmed() call needed.
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

  // ── Weight chart ───────────────────────────────────────────────────────────
  const renderWeightChart = () => {
    const data = startDate
      ? weightHistory.filter(w => w.date >= startDate)
      : weightHistory;

    if (data.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="material-symbols-outlined text-gray-300 mb-2" style={{ fontSize: 36 }}>monitoring</span>
          <p className="text-sm text-gray-400">Registre seu peso no diário para ver a curva aqui.</p>
        </div>
      );
    }

    const weights = data.map(w => w.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const range = maxW - minW || 1;
    const H = 100, W = 280;
    const step = W / (weights.length - 1);
    const pts = weights.map((w, i) => ({ x: i * step, y: H - ((w - minW) / range) * H }));
    const pathD = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaD = pathD + ` L ${pts[pts.length-1].x} ${H} L 0 ${H} Z`;

    return (
      <div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-800">{weights[weights.length-1]}kg</span>
            {weightDelta !== null && (
              <span className={`ml-2 text-sm font-semibold ${weightDelta <= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                {weightDelta <= 0 ? '↓' : '↑'}{Math.abs(weightDelta)}kg
              </span>
            )}
          </div>
          {baselineWeight && (
            <span className="text-xs text-gray-400">Início: {baselineWeight}kg</span>
          )}
        </div>
        <svg viewBox={`-5 -5 ${W+10} ${H+10}`} className="w-full h-28">
          <defs>
            <linearGradient id="glp1-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#glp1-grad)" />
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={4} fill="#10b981" />
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{data[0].date.slice(5)}</span>
          <span>{data[data.length-1].date.slice(5)}</span>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EEEFF4] font-display text-gray-900 pb-32">
      {/* Header */}
      <header className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Programa GLP-1</h1>
            <p className="text-xs text-gray-500">{medication || 'Medicamento não configurado'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Semana</p>
            <p className="text-2xl font-bold text-emerald-600 leading-none">{weeksOfUse}</p>
          </div>
        </div>

        {/* Doctor prescription badge */}
        {prescription && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-xl border border-purple-100">
            <span className="material-symbols-outlined text-purple-600 text-base">medical_services</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-purple-800 truncate">
                Prescrito por {prescription.doctor_name}
              </p>
              <p className="text-[10px] text-purple-500">
                Atualizado {new Date(prescription.prescribed_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {(['overview', 'doses', 'config'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t === 'overview' ? 'Visão Geral' : t === 'doses' ? 'Aplicações' : 'Configurar'}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">

        {/* ─── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Next application */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="col-span-2 bg-white rounded-2xl p-4 shadow-sm"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Próxima aplicação</p>
                {nextApplicationDate ? (
                  <>
                    <p className="text-lg font-bold text-gray-800">
                      {daysUntilApplication === 0 ? 'Hoje!' :
                       daysUntilApplication === 1 ? 'Amanhã' :
                       `Em ${daysUntilApplication} dias`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {nextApplicationDate.toLocaleDateString('pt-BR', {
                        weekday: 'short', day: '2-digit', month: '2-digit',
                      })} · {nextApplicationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                      {suggestedSite.emoji} {suggestedSite.label}
                    </p>
                  </>
                ) : (
                  <button
                    onClick={() => { setActiveTab('config'); setShowScheduleModal(true); }}
                    className="text-sm text-emerald-600 font-semibold mt-1"
                  >
                    Configurar horário →
                  </button>
                )}
              </motion.div>

              {/* Dose */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Dose</p>
                <p className="text-lg font-bold text-gray-800 leading-tight">
                  {currentDoseMg ? `${currentDoseMg}mg` : '—'}
                </p>
                {nextEscalationStep && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    Próxima: {nextEscalationStep.dose_mg}mg
                  </p>
                )}
              </motion.div>
            </div>

            {/* Prescription expiry */}
            {daysUntilExpiry !== null && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                  daysUntilExpiry <= 14
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-amber-50 border border-amber-100'
                }`}
              >
                <span className="material-symbols-outlined text-amber-500">event</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Renovação da receita</p>
                  <p className="text-xs text-gray-500">
                    {daysUntilExpiry === 0 ? 'Vencida hoje' : `Vence em ${daysUntilExpiry} dias`}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(AppView.GLP1_CONSULTA)}
                  className="text-xs font-bold text-emerald-600 whitespace-nowrap"
                >
                  Renovar →
                </button>
              </motion.div>
            )}

            {/* Goals card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-gray-800">Metas {prescription ? 'prescritas' : 'ajustadas'}</h3>
                {prescription?.macro_calories && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-full">
                    Dr. {prescription.doctor_name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GoalCard
                  icon="🔥" label="Calorias" value={`${goals.calories} kcal`}
                  sub="Meta diária"
                  prescribed={!!prescription?.macro_calories}
                />
                <GoalCard
                  icon="🥩" label="Proteína" value={`${goals.protein}g`}
                  sub="Preservar músculo"
                  prescribed={!!prescription?.macro_protein_g}
                />
                <GoalCard
                  icon="🥬" label="Fibras" value="25g/dia"
                  sub="Anti-constipação"
                />
                <GoalCard
                  icon="💧" label="Hidratação" value={`${(goals.hydration / 1000).toFixed(1)}L`}
                  sub={`35ml × ${weightKg}kg`}
                />
              </div>
              {prescription?.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Orientações do médico</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{prescription.notes}</p>
                </div>
              )}
            </motion.div>

            {/* Dose escalation tracker */}
            {protocol && currentDoseMg && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-sm font-bold text-gray-800 mb-3">Progressão de dose</h3>
                <div className="relative flex items-center gap-1">
                  {protocol.dose_steps.map((step, i) => {
                    const isActive = step.dose_mg === currentDoseMg;
                    const isPast   = step.dose_mg < currentDoseMg;
                    const isNext   = nextEscalationStep?.dose_mg === step.dose_mg;
                    return (
                      <React.Fragment key={step.dose_mg}>
                        {i > 0 && (
                          <div className={`flex-1 h-0.5 ${isPast || isActive ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                        )}
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
                            isActive
                              ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                              : isPast
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                : isNext
                                  ? 'bg-amber-100 border-amber-300 text-amber-700'
                                  : 'bg-gray-100 border-gray-200 text-gray-400'
                          }`}>
                            {isPast ? '✓' : `${step.dose_mg}`}
                          </div>
                          <span className="text-[8px] text-gray-400 mt-0.5 w-10 text-center leading-tight">
                            {step.dose_mg}mg
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
                {protocol.escalation_note && (
                  <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">{protocol.escalation_note}</p>
                )}
              </motion.div>
            )}

            {/* Weight evolution */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Evolução de peso</h3>
                {baselineWeight && weightDelta !== null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    weightDelta <= 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {weightDelta <= 0 ? '▼' : '▲'} {Math.abs(weightDelta)}kg vs início
                  </span>
                )}
              </div>
              {renderWeightChart()}
            </motion.div>

            {/* Weekly checkin */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-gray-800 mb-3">Check-in semanal de sintomas</h3>
              {checkinDone ? (
                <div className="flex items-center gap-3 py-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Check-in registrado!</p>
                    <p className="text-xs text-gray-400">Próximo disponível em 7 dias</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-3">Como você se sentiu esta semana?</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(SYMPTOM_LABELS).map(([id, s]) => (
                      <button
                        key={id}
                        onClick={() => toggleCheckinSymptom(id)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          checkinSymptoms.includes(id)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCheckin}
                    disabled={checkinSymptoms.length === 0 || checkinSaving}
                    className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
                  >
                    {checkinSaving ? 'Registrando...' : 'Registrar check-in'}
                  </button>
                </>
              )}
              {/* History */}
              {(profile?.glp1_weekly_checkins || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {[...(profile?.glp1_weekly_checkins || [])].reverse().slice(0, 3).map((c: any, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-12 flex-shrink-0">{c.date?.slice(5)}</span>
                      <div className="flex flex-wrap gap-1">
                        {(c.symptoms || []).map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600">
                            {SYMPTOM_LABELS[s]?.emoji} {SYMPTOM_LABELS[s]?.label || s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* AI tip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🧠</span>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Dica para hoje</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{dailyTip}</p>
                </div>
              </div>
            </motion.div>

            {/* Storage reminder */}
            {protocol && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                className="bg-blue-50 rounded-2xl p-4 border border-blue-100"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">🌡️</span>
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Armazenamento</p>
                    <p className="text-xs text-gray-600">
                      <strong>Frasco lacrado:</strong> {protocol.storage_sealed}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      <strong>Após abertura:</strong> {protocol.storage_open}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Consult CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-blue-600">videocam</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Teleconsulta médica</p>
                <p className="text-xs text-gray-500">Renovar receita ou tirar dúvidas</p>
              </div>
              <button
                onClick={() => onNavigate(AppView.GLP1_CONSULTA)}
                className="px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs font-semibold text-gray-700"
              >
                Agendar
              </button>
            </motion.div>
          </>
        )}

        {/* ─── DOSES TAB ────────────────────────────────────────────────── */}
        {activeTab === 'doses' && (
          <>
            {/* Log dose button */}
            <motion.button
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowLogDoseModal(true)}
              className="w-full py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Registrar aplicação de hoje
            </motion.button>

            {/* Application site rotation guide */}
            {lastDose?.application_site && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-amber-50 rounded-2xl p-4 border border-amber-100"
              >
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Rotação de local</p>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Última</p>
                    <p className="text-sm font-semibold">
                      {APPLICATION_SITES.find(s => s.value === lastDose.application_site)?.label || lastDose.application_site}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-amber-400">arrow_forward</span>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Sugerida</p>
                    <p className="text-sm font-semibold text-emerald-700">
                      {suggestedSite.emoji} {suggestedSite.label}
                    </p>
                  </div>
                </div>
                {protocol?.site_rotation_note && (
                  <p className="text-[10px] text-gray-400 mt-2">{protocol.site_rotation_note}</p>
                )}
              </motion.div>
            )}

            {/* Dose history list */}
            {doseHistory.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Histórico de aplicações</h3>
                <div className="space-y-4">
                  {doseHistory.map((dose, i) => {
                    const site = APPLICATION_SITES.find(s => s.value === dose.application_site);
                    return (
                      <div key={dose.id || i} className="relative">
                        {i < doseHistory.length - 1 && (
                          <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-100" />
                        )}
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5 z-10">
                            <span className="text-xs">💉</span>
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">
                                  {dose.medication} {dose.dose_mg ? `${dose.dose_mg}mg` : ''}
                                  {dose.is_first && (
                                    <span className="ml-2 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                      1ª dose
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(dose.applied_at).toLocaleDateString('pt-BR', {
                                    weekday: 'short', day: '2-digit', month: '2-digit',
                                  })} · {new Date(dose.applied_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {site && (
                                <span className="text-xs text-gray-500 flex-shrink-0">{site.emoji} {site.label}</span>
                              )}
                            </div>

                            {/* Side effects */}
                            {dose.side_effects && dose.side_effects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {dose.side_effects.map(e => {
                                  const s = SIDE_EFFECTS.find(x => x.value === e);
                                  return (
                                    <span key={e} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                                      {s?.emoji} {s?.label || e}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Energy & mood */}
                            {(dose.energy_level || dose.mood_level) && (
                              <div className="mt-2 flex gap-4">
                                {dose.energy_level && (
                                  <div className="text-[10px] text-gray-500">
                                    ⚡ Energia {dose.energy_level}/5
                                  </div>
                                )}
                                {dose.mood_level && (
                                  <div className="text-[10px] text-gray-500">
                                    😊 Humor {dose.mood_level}/5
                                  </div>
                                )}
                              </div>
                            )}

                            {dose.notes && (
                              <p className="text-[10px] text-gray-400 italic mt-1">{dose.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <span className="text-4xl mb-3 block">💉</span>
                <p className="text-sm text-gray-500">Nenhuma aplicação registrada ainda.</p>
                <p className="text-xs text-gray-400 mt-1">Clique em "Registrar aplicação" acima.</p>
              </div>
            )}
          </>
        )}

        {/* ─── CONFIG TAB ───────────────────────────────────────────────── */}
        {activeTab === 'config' && (
          <>
            {/* Current medication */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-gray-800 mb-3">Medicamento atual</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Medicamento</span>
                  <span className="font-semibold">{medication || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dose atual</span>
                  <span className="font-semibold">
                    {currentDoseMg ? `${currentDoseMg}mg` : '—'}
                    {prescription?.locked_fields?.includes('current_dose_mg') && (
                      <span className="ml-1 text-purple-600 text-[10px]">🔒</span>
                    )}
                  </span>
                </div>
                {protocol && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frequência</span>
                    <span className="font-semibold">
                      {protocol.frequency === 'weekly' ? 'Semanal' : 'Diária'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Fase</span>
                  <span className="font-semibold">{phaseInfo.emoji} {phaseInfo.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Início do tratamento</span>
                  <span className="font-semibold">
                    {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
                {weeksOfUse > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Semanas de uso</span>
                    <span className="font-semibold text-emerald-600">{weeksOfUse} semanas</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Application schedule */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Horário de aplicação</h3>
                {!prescription?.locked_fields?.includes('glp1_application_schedule') && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="text-xs text-emerald-600 font-semibold"
                  >
                    Editar
                  </button>
                )}
                {prescription?.locked_fields?.includes('glp1_application_schedule') && (
                  <span className="text-[10px] text-purple-600">🔒 Definido pelo médico</span>
                )}
              </div>

              {profile?.glp1_application_schedule ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frequência</span>
                    <span className="font-semibold">
                      {profile.glp1_application_schedule.frequency === 'weekly' ? 'Semanal' : 'Diária'}
                    </span>
                  </div>
                  {profile.glp1_application_schedule.frequency === 'weekly' &&
                   profile.glp1_application_schedule.day_of_week !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dia</span>
                      <span className="font-semibold">{DAY_NAMES[profile.glp1_application_schedule.day_of_week]}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Horário</span>
                    <span className="font-semibold">{profile.glp1_application_schedule.time}</span>
                  </div>
                  {nextApplicationDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Próxima aplicação</span>
                      <span className="font-semibold text-emerald-600">
                        {nextApplicationDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 font-medium"
                >
                  + Configurar horário de aplicação
                </button>
              )}
            </motion.div>

            {/* Safety rules */}
            {protocol && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="bg-red-50 rounded-2xl p-4 border border-red-100"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Regra de segurança</p>
                    <p className="text-xs text-gray-700">
                      Se você esqueceu a aplicação há mais de <strong>{protocol.max_skip_days} dias</strong>, não aplique a dose — consulte seu médico antes de retomar.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Deactivate */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-gray-800 mb-1">Encerrar programa</h3>
              <p className="text-xs text-gray-500 mb-3">
                Se você parou de usar o medicamento, registre aqui para que o app ajuste seus planos.
              </p>
              <button
                onClick={async () => {
                  if (!user) return;
                  if (confirm('Tem certeza que deseja encerrar o Modo GLP-1? Isso registrará a data de saída e reverterá as metas nutricionais.')) {
                    await glp1Service.deactivateGlp1(user.id);
                    await updateProfile({ glp1_mode: false, glp1_mode_active: false, glp1_end_date: new Date().toISOString().split('T')[0] });
                    onBack();
                  }
                }}
                className="w-full py-2 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Encerrar Modo GLP-1
              </button>
            </motion.div>
          </>
        )}
      </main>

      {/* ─── LOG DOSE MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogDoseModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogDoseModal(false)} />
            <motion.div
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <h3 className="text-base font-bold text-gray-800 mb-4">Registrar aplicação</h3>

              {/* Dose info */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl mb-4">
                <span className="text-2xl">💉</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{medication} {currentDoseMg ? `${currentDoseMg}mg` : ''}</p>
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                </div>
              </div>

              {/* Application site */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Local de aplicação</p>
                <div className="grid grid-cols-3 gap-2">
                  {APPLICATION_SITES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setLogSite(s.value)}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center ${
                        logSite === s.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="block text-lg mb-0.5">{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">
                  Sugerido: {suggestedSite.emoji} {suggestedSite.label}
                </p>
              </div>

              {/* Side effects */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Efeitos colaterais hoje</p>
                <div className="flex flex-wrap gap-2">
                  {SIDE_EFFECTS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => {
                        if (s.value === 'well') { setLogEffects(['well']); return; }
                        setLogEffects(prev =>
                          prev.includes(s.value)
                            ? prev.filter(x => x !== s.value)
                            : [...prev.filter(x => x !== 'well'), s.value]
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        logEffects.includes(s.value)
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy & mood */}
              <div className="mb-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Como está sua energia? ⚡</p>
                  <div className="flex gap-2 justify-between">
                    {[1,2,3,4,5].map(v => (
                      <button
                        key={v}
                        onClick={() => setLogEnergy(v)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                          logEnergy === v
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Como está seu humor? 😊</p>
                  <div className="flex gap-2 justify-between">
                    {[1,2,3,4,5].map(v => (
                      <button
                        key={v}
                        onClick={() => setLogMood(v)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                          logMood === v
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-700 mb-2">Observações (opcional)</p>
                <textarea
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  rows={2}
                  placeholder="Algo incomum nessa aplicação?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <button
                onClick={handleLogDose}
                disabled={logDoseSaving}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-40"
              >
                {logDoseSaving ? 'Registrando...' : 'Registrar aplicação'}
              </button>
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
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <h3 className="text-base font-bold text-gray-800 mb-4">Configurar horário de aplicação</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Frequência</p>
                  <div className="flex gap-2">
                    {[{value: 'weekly', label: 'Semanal'}, {value: 'daily', label: 'Diária'}].map(o => (
                      <button
                        key={o.value}
                        onClick={() => setSchedFreq(o.value as any)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          schedFreq === o.value
                            ? 'bg-gray-900 border-gray-900 text-white'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {schedFreq === 'weekly' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Dia da semana</p>
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_NAMES.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setSchedDay(i)}
                          className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                            schedDay === i
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Horário</p>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveSchedule}
                disabled={schedSaving}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-40"
              >
                {schedSaving ? 'Salvando...' : 'Salvar configuração'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GLP1Dashboard;
