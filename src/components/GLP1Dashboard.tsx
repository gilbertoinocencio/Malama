import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { AppView } from '../types';

interface GLP1DashboardProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
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

const CONCERN_LABELS: Record<string, string> = {
  muscle_loss: 'Perder massa muscular',
  long_term: 'Manter resultado a longo prazo',
  what_to_eat: 'Saber o que comer',
  side_effects: 'Gerir efeitos secundários',
};

const SYMPTOM_LABELS: Record<string, { emoji: string; label: string }> = {
  nausea: { emoji: '🤢', label: 'Náusea' },
  satiety: { emoji: '🍽️', label: 'Saciedade rápida' },
  constipation: { emoji: '💣', label: 'Obstipação' },
  fatigue: { emoji: '😴', label: 'Fadiga' },
  reflux: { emoji: '🔥', label: 'Refluxo' },
  well: { emoji: '😊', label: 'Bem' },
};

const AI_TIPS: Record<string, string[]> = {
  start: [
    'Nos primeiros dias, prioriza refeições pequenas e ricas em proteína para minimizar a náusea.',
    'Come devagar e para quando sentires saciedade — o teu corpo está a adaptar-se.',
    'Hidrata-te bem entre as refeições, não durante. Isto ajuda na digestão.',
    'Evita alimentos muito gordurosos ou fritos — podem agravar a náusea inicial.',
  ],
  adjust: [
    'Na fase de ajuste, mantém a proteína alta para preservar massa muscular.',
    'Tenta distribuir a proteína por todas as refeições do dia.',
    'Se sentires obstipação, aumenta o consumo de fibras e água.',
    'Caminhadas leves após as refeições ajudam na digestão.',
  ],
  maintain: [
    'Na fase de manutenção, foca em consolidar os hábitos alimentares para manter o resultado.',
    'Treino de força é essencial para manter a massa muscular durante a perda de peso.',
    'Já podes experimentar porções ligeiramente maiores — observa como o teu corpo reage.',
    'Planeia as refeições da semana para manter consistência.',
  ],
};

export const GLP1Dashboard: React.FC<GLP1DashboardProps> = ({ onBack, onNavigate }) => {
  const { profile, user, updateProfile } = useAuth();
  const [checkinSymptoms, setCheckinSymptoms] = useState<string[]>([]);
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

  const phaseInfo = PHASE_LABELS[profile?.glp1_phase || 'start'];
  const weightKg = profile?.weight || 70;

  // Calculate GLP-1 adjusted targets
  const targets = useMemo(() => {
    const proteinTarget = Math.round(weightKg * 1.2);
    const fiberTarget = 25;
    const hydrationTarget = Math.round(weightKg * 35);
    const calorieTarget = profile?.target_calories ? profile.target_calories - 300 : 1800;
    return { proteinTarget, fiberTarget, hydrationTarget, calorieTarget };
  }, [weightKg, profile?.target_calories]);

  // Days until prescription expiry
  const daysUntilExpiry = useMemo(() => {
    if (!profile?.glp1_prescription_expiry) return null;
    const expiry = new Date(profile.glp1_prescription_expiry);
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [profile?.glp1_prescription_expiry]);

  // AI tip of the day
  const dailyTip = useMemo(() => {
    const tips = AI_TIPS[profile?.glp1_phase || 'start'];
    const dayIndex = new Date().getDate() % tips.length;
    return tips[dayIndex];
  }, [profile?.glp1_phase]);

  // Check if weekly checkin already done
  useEffect(() => {
    const checkins = profile?.glp1_weekly_checkins || [];
    if (checkins.length > 0) {
      const lastCheckin = new Date(checkins[checkins.length - 1].date);
      const daysSince = (Date.now() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) setCheckinDone(true);
    }
  }, [profile?.glp1_weekly_checkins]);

  // Load weight history
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

  // Simple weight chart renderer
  const renderWeightChart = () => {
    if (weightHistory.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="material-symbols-outlined text-gray-400 mb-2" style={{ fontSize: 40 }}>monitoring</span>
          <p className="text-sm text-gray-500">Regista o teu peso no diário para ver a curva aqui.</p>
        </div>
      );
    }

    const weights = weightHistory.map(w => w.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    const chartH = 120;
    const chartW = 280;
    const step = chartW / (weights.length - 1);

    const points = weights.map((w, i) => ({
      x: i * step,
      y: chartH - ((w - minW) / range) * chartH,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="relative">
        <svg viewBox={`-10 -10 ${chartW + 20} ${chartH + 20}`} className="w-full h-32">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <line
              key={pct}
              x1={0} y1={chartH * (1 - pct)} x2={chartW} y2={chartH * (1 - pct)}
              stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="4,4"
            />
          ))}
          {/* Main line */}
          <path d={pathD} fill="none" stroke="#2ECC71" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2ECC71" />
          ))}
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{weightHistory[0].date.slice(5)}</span>
          <span>{weightHistory[weightHistory.length - 1].date.slice(5)}</span>
        </div>
      </div>
    );
  };

  // Checkin history timeline
  const recentCheckins = (profile?.glp1_weekly_checkins || []).slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[#EEEFF4] font-display text-gray-900 pb-32">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Meu Programa GLP-1</h1>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">💊 GLP-1 Ativo</span>
      </header>

      <main className="px-4 space-y-4">
        {/* Card 1: Treatment Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Status do Tratamento</h3>
            <span className="text-lg">{phaseInfo.emoji}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Medicamento</span>
              <span className="font-semibold">{profile?.glp1_medication || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fase</span>
              <span className="font-semibold">{phaseInfo.label} <span className="text-gray-400 font-normal">({phaseInfo.desc})</span></span>
            </div>
            {daysUntilExpiry !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Renovação da receita</span>
                <span className={`font-semibold ${daysUntilExpiry <= 14 ? 'text-red-500' : 'text-gray-800'}`}>
                  em {daysUntilExpiry} dias {daysUntilExpiry <= 14 ? '⚠️' : ''}
                </span>
              </div>
            )}
            {profile?.glp1_main_concern && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Preocupação</span>
                <span className="font-semibold">{CONCERN_LABELS[profile.glp1_main_concern] || profile.glp1_main_concern}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Card 2: Adjusted Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-800">Metas ajustadas para GLP-1</h3>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">GLP-1</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <GoalCard icon="🔥" label="Calorias" value={`${targets.calorieTarget} kcal`} sub="Déficit suave -300kcal" />
            <GoalCard icon="🥩" label="Proteína" value={`${targets.proteinTarget}g`} sub={`1,2g × ${weightKg}kg`} />
            <GoalCard icon="🥬" label="Fibras" value={`${targets.fiberTarget}g/dia`} sub="Combate obstipação" />
            <GoalCard icon="💧" label="Hidratação" value={`${(targets.hydrationTarget / 1000).toFixed(1)}L`} sub={`35ml × ${weightKg}kg`} />
          </div>
        </motion.div>

        {/* Card 3: Weekly Checkin */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="text-sm font-bold text-gray-800 mb-3">Check-in semanal de sintomas</h3>
          {checkinDone ? (
            <div className="text-center py-4">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-gray-600 mt-2">Check-in desta semana registado!</p>
              <p className="text-xs text-gray-400 mt-1">Próximo disponível em 7 dias</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">Como te sentiste esta semana?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(SYMPTOM_LABELS).map(([id, s]) => (
                  <button
                    key={id}
                    onClick={() => toggleCheckinSymptom(id)}
                    className={`px-3 py-2 rounded-full border-2 text-xs font-medium transition-all ${
                      checkinSymptoms.includes(id)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCheckin}
                disabled={checkinSymptoms.length === 0 || checkinSaving}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {checkinSaving ? 'A registar...' : 'Registar'}
              </button>
            </>
          )}

          {/* History timeline */}
          {recentCheckins.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Histórico</p>
              <div className="space-y-2">
                {recentCheckins.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-16 flex-shrink-0">{c.date?.slice(5)}</span>
                    <div className="flex flex-wrap gap-1">
                      {(c.symptoms || []).map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                          {SYMPTOM_LABELS[s]?.emoji || ''} {SYMPTOM_LABELS[s]?.label || s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Card 4: Weight Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="text-sm font-bold text-gray-800 mb-3">Curva de peso GLP-1</h3>
          {renderWeightChart()}
        </motion.div>

        {/* Card 5: AI Contextual Tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 shadow-sm border border-green-200"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🧠</span>
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">Dica da IA para hoje</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{dailyTip}</p>
            </div>
          </div>
        </motion.div>

        {/* Consulta CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">videocam</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Teleconsulta médica</h3>
              <p className="text-xs text-gray-500">Renova receita ou tira dúvidas</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate(AppView.GLP1_CONSULTA)}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors"
          >
            Agendar consulta
          </button>
        </motion.div>
      </main>
    </div>
  );
};

// Sub-component
const GoalCard: React.FC<{ icon: string; label: string; value: string; sub: string }> = ({ icon, label, value, sub }) => (
  <div className="bg-gray-50 rounded-xl p-3">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <p className="text-base font-bold text-gray-800">{value}</p>
    <p className="text-[10px] text-gray-400">{sub}</p>
  </div>
);

export default GLP1Dashboard;
