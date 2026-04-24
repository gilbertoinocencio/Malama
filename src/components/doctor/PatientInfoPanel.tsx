// =====================================================
// Malama — Painel de Informações do Paciente (consulta)
// Gráfico de peso, humor, GLP-1, ativação pelo médico
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  TrendingDown, TrendingUp, Minus, Activity, Heart,
  Zap, Pill, ChevronRight, AlertTriangle, CheckCircle,
  ToggleRight, Save
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

interface Props {
  patientId: string;
  doctorId: string;
  patientData: any; // profile row
  onPatientUpdated: (updated: any) => void;
}

// ─── Peso ────────────────────────────────────────────

interface WeightEntry { date: string; weight: number }

function WeightSparkline({ data }: { data: WeightEntry[] }) {
  if (data.length < 2) {
    return (
      <p className="text-xs text-gray-500 italic py-2">
        {data.length === 1 ? 'Apenas 1 registro de peso — histórico insuficiente para gráfico.' : 'Sem registros de peso.'}
      </p>
    );
  }

  const W = 280, H = 70, PAD = 6;
  const weights = data.map(d => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const scaleY = (w: number) => H - PAD - ((w - min) / range) * (H - PAD * 2);

  const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.weight)}`).join(' ');
  const first = data[0].weight;
  const last = data[data.length - 1].weight;
  const diff = last - first;
  const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : '0';

  const trendColor = diff < 0 ? '#4ade80' : diff > 0 ? '#f87171' : '#94a3b8';
  const TrendIcon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Evolução do Peso</span>
        <div className="flex items-center gap-1" style={{ color: trendColor }}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">
            {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg ({pct}%)
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t}
            x1={PAD} x2={W - PAD}
            y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)}
            stroke="#374151" strokeWidth="0.5" strokeDasharray="4,4"
          />
        ))}
        {/* Line */}
        <polyline fill="none" stroke={trendColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(d.weight)} r={i === data.length - 1 ? 4 : 2.5}
            fill={i === data.length - 1 ? trendColor : '#1f2937'}
            stroke={trendColor} strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
        <span>{data[0].date}</span>
        <div className="flex gap-2 items-center">
          <span className="text-gray-400">Inicial <strong className="text-gray-200">{first} kg</strong></span>
          <span>→</span>
          <span className="text-gray-400">Atual <strong className="text-gray-200">{last} kg</strong></span>
        </div>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}

// ─── Humor ───────────────────────────────────────────

const MOOD_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e',
};
const MOOD_LABEL: Record<number, string> = {
  1: 'Péssimo', 2: 'Ruim', 3: 'Neutro', 4: 'Bom', 5: 'Excelente',
};
const ENERGY_LABEL: Record<number, string> = {
  1: 'Esgotado', 2: 'Baixa', 3: 'Média', 4: 'Boa', 5: 'Alta',
};

function MoodRow({ checkins }: { checkins: any[] }) {
  const last7 = checkins.slice(0, 7).reverse();
  if (last7.length === 0) {
    return <p className="text-xs text-gray-500 italic">Sem check-ins recentes.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {last7.map((c, i) => {
          const mood = typeof c.mood === 'number' ? c.mood : null;
          const color = mood ? MOOD_COLORS[mood] : '#374151';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={mood ? MOOD_LABEL[mood] : '—'}>
              <div className="w-full h-8 rounded-md" style={{ backgroundColor: color, opacity: mood ? 1 : 0.2 }} />
              <span className="text-[9px] text-gray-400">{c.date?.slice(0, 5) || '—'}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Humor — 7 dias</span>
        {last7[last7.length - 1]?.mood && (
          <span className="font-medium" style={{ color: MOOD_COLORS[last7[last7.length - 1].mood] }}>
            Último: {MOOD_LABEL[last7[last7.length - 1].mood]}
          </span>
        )}
      </div>
      {last7[last7.length - 1]?.energy && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span>Energia: <strong className="text-gray-200">{ENERGY_LABEL[last7[last7.length - 1].energy] || last7[last7.length - 1].energy}</strong></span>
        </div>
      )}
    </div>
  );
}

// ─── GLP-1 Status ────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  start: 'Fase Inicial', adjust: 'Fase de Ajuste', maintain: 'Manutenção',
};
const PHASE_COLOR: Record<string, string> = {
  start: '#60a5fa', adjust: '#f59e0b', maintain: '#4ade80',
};

function Glp1StatusPanel({ profile, lastDose }: { profile: any; lastDose: any }) {
  const phase = profile.glp1_phase || 'start';
  const medication = profile.glp1_medication || '—';
  const dose = profile.glp1_current_dose_mg;
  const startDate = profile.glp1_start_date;
  const daysSinceStart = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000)
    : null;

  return (
    <div className="space-y-3">
      {/* Fase */}
      <div className="flex items-center justify-between p-2.5 bg-gray-700 rounded-xl">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Fase atual</p>
          <p className="text-sm font-bold" style={{ color: PHASE_COLOR[phase] }}>{PHASE_LABEL[phase]}</p>
        </div>
        <div className="flex gap-1">
          {['start', 'adjust', 'maintain'].map((p, i) => (
            <div key={p} className="flex items-center gap-0.5">
              <div className={`w-2.5 h-2.5 rounded-full border-2 ${phase === p ? 'border-current' : 'border-gray-600'}`}
                style={{ backgroundColor: phase === p ? PHASE_COLOR[p] : 'transparent', borderColor: PHASE_COLOR[p] }} />
              {i < 2 && <div className={`w-4 h-0.5 ${['start','adjust'].indexOf(phase) > i ? '' : 'opacity-20'}`}
                style={{ backgroundColor: PHASE_COLOR[['start','adjust','maintain'][i+1]] }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Medicamento e dose */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-gray-700 rounded-xl">
          <p className="text-[10px] text-gray-400 mb-0.5">Medicamento</p>
          <p className="text-xs font-semibold text-white">{medication}</p>
        </div>
        <div className="p-2.5 bg-gray-700 rounded-xl">
          <p className="text-[10px] text-gray-400 mb-0.5">Dose atual</p>
          <p className="text-xs font-semibold text-white">{dose ? `${dose} mg` : '—'}</p>
        </div>
      </div>

      {/* Início e última aplicação */}
      <div className="grid grid-cols-2 gap-2">
        {daysSinceStart !== null && (
          <div className="p-2.5 bg-gray-700 rounded-xl">
            <p className="text-[10px] text-gray-400 mb-0.5">Em tratamento</p>
            <p className="text-xs font-semibold text-white">{daysSinceStart} dias</p>
          </div>
        )}
        {lastDose && (
          <div className="p-2.5 bg-gray-700 rounded-xl">
            <p className="text-[10px] text-gray-400 mb-0.5">Última aplicação</p>
            <p className="text-xs font-semibold text-white">
              {new Date(lastDose.applied_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </p>
            {lastDose.dose_mg && (
              <p className="text-[10px] text-gray-500">{lastDose.dose_mg} mg</p>
            )}
          </div>
        )}
      </div>

      {/* Sintomas/humor da última dose */}
      {lastDose?.symptoms_reported && lastDose.symptoms_reported.length > 0 && (
        <div className="p-2.5 bg-gray-700 rounded-xl">
          <p className="text-[10px] text-gray-400 mb-1.5">Sintomas relatados (última dose)</p>
          <div className="flex flex-wrap gap-1">
            {lastDose.symptoms_reported.map((s: string) => (
              <span key={s} className="px-1.5 py-0.5 bg-gray-600 rounded text-[10px] text-gray-300">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ativar GLP-1 ────────────────────────────────────

const GLP1_MEDICATIONS = [
  { label: 'Ozempic (semaglutida)', value: 'Ozempic' },
  { label: 'Mounjaro (tirzepatida)', value: 'Mounjaro' },
  { label: 'Wegovy (semaglutida)', value: 'Wegovy' },
  { label: 'Saxenda (liraglutida)', value: 'Saxenda' },
  { label: 'Victoza (liraglutida)', value: 'Victoza' },
  { label: 'Rybelsus (semaglutida oral)', value: 'Rybelsus' },
];

const GLP1_DOSES: Record<string, number[]> = {
  Ozempic:  [0.25, 0.5, 1.0],
  Mounjaro: [2.5, 5, 7.5, 10, 12.5, 15],
  Wegovy:   [0.25, 0.5, 1.0, 1.7, 2.4],
  Saxenda:  [0.6, 1.2, 1.8, 2.4, 3.0],
  Victoza:  [0.6, 1.2, 1.8],
  Rybelsus: [3, 7, 14],
};

function ActivateGlp1Form({ patientId, onActivated }: { patientId: string; onActivated: (updated: any) => void }) {
  const [medication, setMedication] = useState('Ozempic');
  const [dose, setDose] = useState<number>(0.25);
  const [phase, setPhase] = useState<'start' | 'adjust' | 'maintain'>('start');
  const [saving, setSaving] = useState(false);

  const doses = GLP1_DOSES[medication] || [];

  const handleMedChange = (med: string) => {
    setMedication(med);
    setDose((GLP1_DOSES[med] || [])[0] || 0);
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('profiles')
        .update({
          glp1_mode: true,
          glp1_mode_active: true,
          glp1_medication: medication,
          glp1_current_dose_mg: dose,
          glp1_phase: phase,
          glp1_start_date: today,
        })
        .eq('id', patientId)
        .select()
        .single();

      if (error) throw error;
      toast.success(`GLP-1 ativado: ${medication} ${dose} mg`);
      onActivated(data);
    } catch (err: any) {
      if (err?.code === '42501') {
        toast.error('Sem permissão para atualizar o perfil do paciente via app. Configure a RLS ou use uma Edge Function.');
      } else {
        toast.error('Erro ao ativar GLP-1');
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-2.5 bg-blue-900/20 border border-blue-700/40 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-300">
          Paciente não está em tratamento medicamentoso. Você pode ativar e configurar o GLP-1 diretamente por aqui.
        </p>
      </div>

      {/* Medicamento */}
      <div>
        <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Medicamento</label>
        <select value={medication} onChange={e => handleMedChange(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs border border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500">
          {GLP1_MEDICATIONS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Dose inicial */}
      <div>
        <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Dose inicial</label>
        <div className="flex flex-wrap gap-1.5">
          {doses.map(d => (
            <button key={d} onClick={() => setDose(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                dose === d
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-green-600'
              }`}>
              {d} mg
            </button>
          ))}
        </div>
      </div>

      {/* Fase */}
      <div>
        <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Fase</label>
        <div className="flex gap-1.5">
          {(['start', 'adjust', 'maintain'] as const).map(p => (
            <button key={p} onClick={() => setPhase(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                phase === p ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-green-600'
              }`}>
              {PHASE_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleActivate} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition">
        <ToggleRight className="w-4 h-4" />
        {saving ? 'Ativando...' : `Ativar ${medication} ${dose} mg`}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────

export const PatientInfoPanel: React.FC<Props> = ({ patientId, doctorId, patientData, onPatientUpdated }) => {
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [lastDose, setLastDose] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [weightRes, checkinRes, doseRes] = await Promise.all([
          // Peso dos últimos 60 dias via daily_logs
          supabase
            .from('daily_logs')
            .select('date, weight')
            .eq('user_id', patientId)
            .not('weight', 'is', null)
            .order('date', { ascending: true })
            .limit(60),

          // Check-ins de humor
          supabase
            .from('daily_checkins')
            .select('checkin_date, mood, energy_level, symptoms')
            .eq('user_id', patientId)
            .order('checkin_date', { ascending: false })
            .limit(14),

          // Última dose GLP-1
          patientData?.glp1_mode
            ? supabase
                .from('glp1_dose_logs')
                .select('applied_at, dose_mg, symptoms_reported, mood_level')
                .eq('user_id', patientId)
                .order('applied_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const rawWeight = (weightRes.data || []).filter((d: any) => d.weight && d.weight > 0);
        setWeightHistory(rawWeight.map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          weight: Number(d.weight),
        })));

        setCheckins((checkinRes.data || []).map((c: any) => ({
          date: c.checkin_date,
          mood: c.mood,
          energy: c.energy_level,
          symptoms: c.symptoms,
        })));

        setLastDose((doseRes as any)?.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) load();
  }, [patientId, patientData?.glp1_mode]);

  const bmi = patientData?.weight && patientData?.height
    ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Dados básicos */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Peso" value={patientData?.weight ? `${patientData.weight} kg` : '—'} />
        <StatCard label="Altura" value={patientData?.height ? `${patientData.height} cm` : '—'} />
        <StatCard label="IMC" value={bmi || '—'} highlight={bmi ? parseFloat(bmi) > 25 : false} />
        <StatCard label="Meta cal." value={patientData?.target_calories ? `${patientData.target_calories} kcal` : '—'} />
        <StatCard label="Meta prot." value={patientData?.target_protein ? `${patientData.target_protein} g` : '—'} />
        <StatCard label="Idade" value={patientData?.age ? `${patientData.age} anos` : '—'} />
      </div>

      {/* Gráfico de Peso */}
      <Section title="Evolução do Peso" icon={<Activity className="w-3.5 h-3.5 text-blue-400" />}>
        <WeightSparkline data={weightHistory} />
      </Section>

      {/* Humor */}
      <Section title="Humor & Energia" icon={<Heart className="w-3.5 h-3.5 text-pink-400" />}>
        <MoodRow checkins={checkins} />
      </Section>

      {/* GLP-1 */}
      <Section
        title={patientData?.glp1_mode ? `GLP-1 Ativo — ${patientData.glp1_medication || ''}` : 'GLP-1 — Inativo'}
        icon={<Pill className={`w-3.5 h-3.5 ${patientData?.glp1_mode ? 'text-green-400' : 'text-gray-500'}`} />}
        badge={patientData?.glp1_mode
          ? <span className="px-1.5 py-0.5 bg-green-900/40 border border-green-700 text-green-400 text-[9px] font-bold rounded-full">ATIVO</span>
          : <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 text-[9px] rounded-full">INATIVO</span>
        }
      >
        {patientData?.glp1_mode ? (
          <Glp1StatusPanel profile={patientData} lastDose={lastDose} />
        ) : (
          <ActivateGlp1Form patientId={patientId} onActivated={onPatientUpdated} />
        )}
      </Section>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="bg-gray-700 rounded-xl p-2.5 text-center">
    <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    <p className={`text-sm font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, badge, children }) => (
  <div className="border border-gray-600 rounded-xl overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/60">
      {icon}
      <span className="text-xs font-semibold text-gray-200 flex-1">{title}</span>
      {badge}
    </div>
    <div className="p-3 bg-gray-800">{children}</div>
  </div>
);
