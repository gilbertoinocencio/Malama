// =====================================================
// Malama — Painel de Informações do Paciente (consulta)
// Prontuário ao vivo: peso (weight_logs), composição corporal (body scan),
// atividade (Health Connect/HealthKit), adesão alimentar, humor/energia,
// anamnese, histórico de consultas e GLP-1 — tudo visível durante a chamada.
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  TrendingDown, TrendingUp, Minus, Activity, Heart,
  Zap, Pill, AlertTriangle, ToggleRight, Scan, Footprints,
  Moon, HeartPulse, Utensils, ClipboardList, CalendarCheck,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { glp1DoctorService, patientService, clinicalNoteService } from '../../services/doctorPortalService';
import {
  MeasurementSnapshotService, HealthMetricsService,
  type BodyMeasurementSnapshot, type HealthDailyMetric,
} from '../../services/weightLogService';
import type { PatientFullProfile, ClinicalNote } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

interface Props {
  patientId: string;
  doctorId: string;
  doctorName: string;
  patientData: any; // profile row
  consultationId?: string; // consulta atual — excluída da busca pela nota anterior
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

// Check-ins usam escala 1–10; comprime para os 5 buckets de cor/label
const bucket = (v: number) => Math.min(5, Math.max(1, Math.ceil(v / 2)));

const DIARY_ENERGY_COLOR: Record<string, string> = {
  Baixa: '#f97316', 'Média': '#eab308', Boa: '#84cc16', Flow: '#22c55e',
};

interface DiaryEntryLite {
  date: string;
  energy_level: string | null;
  mood: string | null;
  notes: string | null;
}

function MoodEnergyBlock({ checkins, diary }: { checkins: any[]; diary: DiaryEntryLite[] }) {
  const last7 = checkins.slice(0, 7).reverse();

  // Sem check-ins: cai no diário do paciente (daily_logs), que o médico pode ler
  if (last7.length === 0) {
    const entries = diary.filter(d => d.energy_level || d.mood || d.notes).slice(0, 5);
    if (entries.length === 0) {
      return <p className="text-xs text-gray-500 italic">Paciente ainda não registrou check-ins nem diário.</p>;
    }
    return (
      <div className="space-y-1.5">
        {entries.map((d, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-gray-700/60 rounded-lg">
            <span className="text-[9px] text-gray-400 shrink-0 mt-0.5 w-12">{d.date?.slice(0, 5)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1">
                {d.energy_level && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-gray-900"
                    style={{ backgroundColor: DIARY_ENERGY_COLOR[d.energy_level] || '#94a3b8' }}>
                    ⚡ {d.energy_level}
                  </span>
                )}
                {d.mood && <span className="px-1.5 py-0.5 bg-gray-600 rounded text-[9px] text-gray-200">{d.mood}</span>}
              </div>
              {d.notes && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{d.notes}</p>}
            </div>
          </div>
        ))}
        <p className="text-[9px] text-gray-500">Fonte: diário do paciente</p>
      </div>
    );
  }

  const lastCheckin = last7[last7.length - 1];
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {last7.map((c, i) => {
          const mood = typeof c.mood === 'number' ? bucket(c.mood) : null;
          const color = mood ? MOOD_COLORS[mood] : '#374151';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={mood ? `${MOOD_LABEL[mood]} (${c.mood}/10)` : '—'}>
              <div className="w-full h-8 rounded-md" style={{ backgroundColor: color, opacity: mood ? 1 : 0.2 }} />
              <span className="text-[9px] text-gray-400">{c.date?.slice(5).split('-').reverse().join('/') || '—'}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Humor — últimos check-ins</span>
        {typeof lastCheckin?.mood === 'number' && (
          <span className="font-medium" style={{ color: MOOD_COLORS[bucket(lastCheckin.mood)] }}>
            Último: {MOOD_LABEL[bucket(lastCheckin.mood)]} ({lastCheckin.mood}/10)
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-400">
        {typeof lastCheckin?.energy === 'number' && (
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            Energia: <strong className="text-gray-200">{lastCheckin.energy}/10</strong>
          </span>
        )}
        {typeof lastCheckin?.sleep_hours === 'number' && (
          <span className="flex items-center gap-1">
            <Moon className="w-3 h-3 text-indigo-400" />
            Sono: <strong className="text-gray-200">{lastCheckin.sleep_hours}h</strong>
          </span>
        )}
      </div>
      {lastCheckin?.notes && (
        <p className="text-[10px] text-gray-400 italic line-clamp-2">"{lastCheckin.notes}"</p>
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

const MANIPULADO = 'Manipulado';

const GLP1_MEDICATIONS = [
  { label: 'Ozempic (semaglutida)', value: 'Ozempic' },
  { label: 'Mounjaro (tirzepatida)', value: 'Mounjaro' },
  { label: 'Wegovy (semaglutida)', value: 'Wegovy' },
  { label: 'Saxenda (liraglutida)', value: 'Saxenda' },
  { label: 'Victoza (liraglutida)', value: 'Victoza' },
  { label: 'Rybelsus (semaglutida oral)', value: 'Rybelsus' },
  { label: 'Manipulado (fórmula personalizada)', value: MANIPULADO },
];

const GLP1_DOSES: Record<string, number[]> = {
  Ozempic:  [0.25, 0.5, 1.0],
  Mounjaro: [2.5, 5, 7.5, 10, 12.5, 15],
  Wegovy:   [0.25, 0.5, 1.0, 1.7, 2.4],
  Saxenda:  [0.6, 1.2, 1.8, 2.4, 3.0],
  Victoza:  [0.6, 1.2, 1.8],
  Rybelsus: [3, 7, 14],
};

// Defaults de macros por medicamento (kcal, proteína g)
const GLP1_MACRO_DEFAULTS: Record<string, { calories: number; protein: number }> = {
  Ozempic:    { calories: 1600, protein: 100 },
  Mounjaro:   { calories: 1500, protein: 110 },
  Wegovy:     { calories: 1400, protein: 100 },
  Saxenda:    { calories: 1500, protein: 100 },
  Victoza:    { calories: 1600, protein: 100 },
  Rybelsus:   { calories: 1600, protein: 100 },
  Manipulado: { calories: 1500, protein: 100 },
};

function ActivateGlp1Form({
  patientId, doctorId, doctorName, onActivated,
}: {
  patientId: string;
  doctorId: string;
  doctorName: string;
  onActivated: (updated: any) => void;
}) {
  const [medication, setMedication] = useState('Ozempic');
  const [customMedName, setCustomMedName] = useState('');
  const [dose, setDose] = useState<number>(0.25);
  const [customDose, setCustomDose] = useState<string>('');
  const [phase, setPhase] = useState<'start' | 'adjust' | 'maintain'>('start');
  const [calories, setCalories] = useState<string>(String(GLP1_MACRO_DEFAULTS.Ozempic.calories));
  const [protein, setProtein] = useState<string>(String(GLP1_MACRO_DEFAULTS.Ozempic.protein));
  const [saving, setSaving] = useState(false);

  const isManipulado = medication === MANIPULADO;
  const doses = GLP1_DOSES[medication] || [];
  const effectiveMedName = isManipulado ? (customMedName.trim() || 'Manipulado') : medication;
  const effectiveDose = isManipulado ? (parseFloat(customDose) || 0) : dose;

  const handleMedChange = (med: string) => {
    setMedication(med);
    if (med !== MANIPULADO) setDose((GLP1_DOSES[med] || [])[0] || 0);
    const def = GLP1_MACRO_DEFAULTS[med];
    if (def) { setCalories(String(def.calories)); setProtein(String(def.protein)); }
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Ativa os flags de GLP-1 no perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          glp1_mode: true,
          glp1_mode_active: true,
          glp1_phase: phase,
          glp1_start_date: today,
        })
        .eq('id', patientId)
        .select()
        .single();
      if (profileError) throw profileError;

      // 2. Aplica a prescrição completa (medication, dose, macros, schedule)
      await glp1DoctorService.prescribeGlp1(patientId, {
        doctor_id:       doctorId,
        doctor_name:     doctorName,
        medication:      effectiveMedName,
        current_dose_mg: effectiveDose || undefined,
        frequency:       'weekly',
        day_of_week:     1,
        time:            '08:00',
        macro_calories:  calories ? Number(calories) : undefined,
        macro_protein_g: protein  ? Number(protein)  : undefined,
      });

      toast.success(`GLP-1 ativado: ${effectiveMedName}${effectiveDose ? ` ${effectiveDose} mg` : ''}`);
      onActivated({ ...profileData, glp1_medication: medication, glp1_current_dose_mg: dose });
    } catch (err: any) {
      if (err?.code === '42501') {
        toast.error('Sem permissão para atualizar o perfil do paciente. Verifique a RLS.');
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
          Paciente não está em tratamento medicamentoso. Ative e configure o GLP-1 diretamente por aqui.
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

      {/* Nome do manipulado */}
      {isManipulado && (
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Nome da fórmula</label>
          <input
            type="text"
            value={customMedName}
            onChange={e => setCustomMedName(e.target.value)}
            placeholder="Ex: Semaglutida 0,5mg manipulada"
            className="w-full bg-gray-700 text-white rounded-lg px-2.5 py-1.5 text-xs border border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
          />
        </div>
      )}

      {/* Dose inicial */}
      <div>
        <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Dose inicial</label>
        {isManipulado ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customDose}
              onChange={e => setCustomDose(e.target.value)}
              placeholder="0.00"
              min={0}
              step={0.01}
              className="w-full bg-gray-700 text-white rounded-lg px-2.5 py-1.5 text-xs border border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <span className="text-xs text-gray-400 shrink-0">mg</span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Meta calórica (kcal)</label>
          <input type="number" value={calories} onChange={e => setCalories(e.target.value)} min={800} max={4000}
            className="w-full bg-gray-700 text-white rounded-lg px-2.5 py-1.5 text-xs border border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Meta proteína (g)</label>
          <input type="number" value={protein} onChange={e => setProtein(e.target.value)} min={40} max={300}
            className="w-full bg-gray-700 text-white rounded-lg px-2.5 py-1.5 text-xs border border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500" />
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
        {saving ? 'Ativando...' : `Ativar ${effectiveMedName}${effectiveDose ? ` ${effectiveDose} mg` : ''}`}
      </button>
    </div>
  );
}

// ─── Composição corporal (Body Scan) ─────────────────

function BodyCompositionCard({ snap }: { snap: BodyMeasurementSnapshot }) {
  const rcq = snap.waist_cm && snap.hip_cm ? (snap.waist_cm / snap.hip_cm).toFixed(2) : null;
  const scanDate = new Date(snap.snapped_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Gordura" value={snap.avg_body_fat_pct != null ? `${snap.avg_body_fat_pct.toFixed(1)}%` : '—'} />
        <StatCard label="M. magra" value={snap.avg_muscle_mass_kg != null ? `${snap.avg_muscle_mass_kg.toFixed(1)} kg` : '—'} />
        <StatCard label="RCQ" value={rcq || '—'} highlight={rcq ? parseFloat(rcq) >= 0.9 : false} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Cintura" value={snap.waist_cm ? `${snap.waist_cm} cm` : '—'} />
        <StatCard label="Quadril" value={snap.hip_cm ? `${snap.hip_cm} cm` : '—'} />
        <StatCard label="Biotipo" value={snap.detected_biotype || '—'} />
      </div>
      <p className="text-[9px] text-gray-500">Body Scan de {scanDate}</p>
    </div>
  );
}

// ─── Atividade (dispositivos) ────────────────────────

function ActivitySummary({ metrics }: { metrics: HealthDailyMetric[] }) {
  const avg = (vals: (number | null | undefined)[]) => {
    const v = vals.filter((x): x is number => typeof x === 'number' && x > 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const steps = avg(metrics.map(m => m.steps));
  const sleepMin = avg(metrics.map(m => m.sleep_minutes));
  const restHr = [...metrics].reverse().find(m => m.resting_heart_rate)?.resting_heart_rate ?? null;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-gray-700 rounded-xl p-2.5 text-center">
        <Footprints className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
        <p className="text-sm font-bold text-white">{steps != null ? Math.round(steps).toLocaleString('pt-BR') : '—'}</p>
        <p className="text-[9px] text-gray-400">passos/dia</p>
      </div>
      <div className="bg-gray-700 rounded-xl p-2.5 text-center">
        <Moon className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
        <p className="text-sm font-bold text-white">{sleepMin != null ? `${(sleepMin / 60).toFixed(1)}h` : '—'}</p>
        <p className="text-[9px] text-gray-400">sono/noite</p>
      </div>
      <div className="bg-gray-700 rounded-xl p-2.5 text-center">
        <HeartPulse className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
        <p className="text-sm font-bold text-white">{restHr != null ? `${Math.round(restHr)} bpm` : '—'}</p>
        <p className="text-[9px] text-gray-400">FC repouso</p>
      </div>
    </div>
  );
}

// ─── Adesão alimentar ────────────────────────────────

function AdherenceCard({ adherence }: { adherence: PatientFullProfile['adherence'] }) {
  const pctColor = adherence.registration_percentage >= 70 ? '#4ade80'
    : adherence.registration_percentage >= 40 ? '#eab308' : '#f87171';
  const Bar = ({ value, goal }: { value: number; goal: number }) => (
    <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, goal > 0 ? (value / goal) * 100 : 0)}%` }} />
    </div>
  );
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Dias com registro (30d)</span>
        <span className="text-sm font-bold" style={{ color: pctColor }}>{adherence.registration_percentage}%</span>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Calorias</span>
          <span><strong className="text-gray-200">{adherence.average_calories}</strong> / {adherence.calorie_goal} kcal</span>
        </div>
        <Bar value={adherence.average_calories} goal={adherence.calorie_goal} />
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Proteína</span>
          <span><strong className="text-gray-200">{adherence.average_protein}</strong> / {adherence.protein_goal} g</span>
        </div>
        <Bar value={adherence.average_protein} goal={adherence.protein_goal} />
      </div>
    </div>
  );
}

// ─── Anamnese ────────────────────────────────────────

function AnamnesisCard({ p }: { p: PatientFullProfile }) {
  const rows: { label: string; value: string | null }[] = [
    { label: 'Objetivo', value: p.health_goal },
    { label: 'Nível de atividade', value: p.activity_level },
    { label: 'Tipo de dieta', value: p.diet_type },
    { label: 'Refeições/dia', value: p.meals_per_day ? String(p.meals_per_day) : null },
    {
      label: 'Janela alimentar',
      value: p.eating_window_start && p.eating_window_end ? `${p.eating_window_start} – ${p.eating_window_end}` : null,
    },
    { label: 'Onde come', value: p.eating_location },
    { label: 'Hidratação', value: p.drinks_enough_water },
  ];
  const filled = rows.filter(r => r.value);
  const restrictions = [
    ...(p.dietary_restrictions || []),
    ...(p.dietary_restrictions_detail ? [p.dietary_restrictions_detail] : []),
  ];

  if (filled.length === 0 && restrictions.length === 0 && (p.additional_goals || []).length === 0) {
    return <p className="text-xs text-gray-500 italic">Paciente ainda não completou o onboarding.</p>;
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {filled.map(r => (
          <div key={r.label}>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">{r.label}</p>
            <p className="text-[11px] font-medium text-gray-200">{r.value}</p>
          </div>
        ))}
      </div>
      {restrictions.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Restrições alimentares
          </p>
          <div className="flex flex-wrap gap-1">
            {restrictions.map(r => (
              <span key={r} className="px-1.5 py-0.5 bg-amber-900/30 border border-amber-700/50 text-amber-300 rounded text-[10px]">{r}</span>
            ))}
          </div>
        </div>
      )}
      {(p.additional_goals || []).length > 0 && (
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Metas adicionais</p>
          <div className="flex flex-wrap gap-1">
            {p.additional_goals.map(g => (
              <span key={g} className="px-1.5 py-0.5 bg-gray-600 rounded text-[10px] text-gray-300">{g}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Consulta anterior (sinais vitais + conduta) ─────

function PreviousConsultationCard({ note, currentWeight }: { note: ClinicalNote; currentWeight: number | null }) {
  const noteDate = note.finalized_at
    ? new Date(note.finalized_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;
  const weightDelta = note.weight_kg != null && currentWeight != null
    ? currentWeight - note.weight_kg : null;

  const vitals: { label: string; value: string; delta?: string; deltaColor?: string }[] = [];
  if (note.weight_kg != null) {
    vitals.push({
      label: 'Peso',
      value: `${note.weight_kg} kg`,
      delta: weightDelta != null && Math.abs(weightDelta) >= 0.1
        ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg hoje`
        : undefined,
      deltaColor: weightDelta != null ? (weightDelta > 0 ? '#f87171' : '#4ade80') : undefined,
    });
  }
  if (note.blood_pressure_sys != null && note.blood_pressure_dia != null) {
    vitals.push({ label: 'PA', value: `${note.blood_pressure_sys}/${note.blood_pressure_dia}` });
  }
  if (note.heart_rate != null) vitals.push({ label: 'FC', value: `${note.heart_rate} bpm` });
  if (note.waist_cm != null) vitals.push({ label: 'Cintura', value: `${note.waist_cm} cm` });

  return (
    <div className="space-y-2.5">
      {vitals.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {vitals.map(v => (
            <div key={v.label} className="bg-gray-700 rounded-xl p-2.5">
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">{v.label}</p>
              <p className="text-sm font-bold text-white">{v.value}</p>
              {v.delta && <p className="text-[10px] font-semibold" style={{ color: v.deltaColor }}>{v.delta}</p>}
            </div>
          ))}
        </div>
      )}
      {note.diagnosis && (
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Diagnóstico</p>
          <p className="text-[11px] text-gray-200 line-clamp-2">{note.diagnosis}</p>
        </div>
      )}
      {note.plan && (
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Conduta combinada</p>
          <p className="text-[11px] text-gray-200 line-clamp-3">{note.plan}</p>
        </div>
      )}
      {noteDate && <p className="text-[9px] text-gray-500">Finalizada em {noteDate}</p>}
    </div>
  );
}

// ─── Alertas proativos ───────────────────────────────

interface PanelAlert { text: string; severity: 'high' | 'medium' }

function computeAlerts(input: {
  fullProfile: PatientFullProfile | null;
  lastNote: ClinicalNote | null;
  checkins: any[];
  currentWeight: number | null;
}): PanelAlert[] {
  const { fullProfile, lastNote, checkins, currentWeight } = input;
  const alerts: PanelAlert[] = [];

  // Peso contra o objetivo: baseline = consulta anterior; sem nota, o registro
  // mais antigo dos últimos 90 dias
  const baseline = lastNote?.weight_kg
    ?? (fullProfile?.weight_history && fullProfile.weight_history.length > 1
      ? fullProfile.weight_history[0].weight : null);
  if (baseline != null && currentWeight != null) {
    const diff = currentWeight - baseline;
    const since = lastNote?.weight_kg != null ? 'desde a última consulta' : 'nos últimos 90 dias';
    const wantsGain = fullProfile?.health_goal === 'Ganho de massa';
    if (!wantsGain && diff >= 2) {
      alerts.push({ text: `Peso subiu ${diff.toFixed(1)} kg ${since} (${baseline} → ${currentWeight} kg)`, severity: 'high' });
    } else if (wantsGain && diff <= -2) {
      alerts.push({ text: `Peso caiu ${Math.abs(diff).toFixed(1)} kg ${since} — objetivo é ganho de massa`, severity: 'high' });
    }
  }

  // Adesão alimentar
  const adherence = fullProfile?.adherence?.registration_percentage;
  if (adherence != null && adherence < 40) {
    alerts.push({ text: `Baixa adesão alimentar: registrou apenas ${adherence}% dos dias no último mês`, severity: adherence < 20 ? 'high' : 'medium' });
  }

  // Humor em queda: 3 check-ins consecutivos piorando, ou os 2 últimos ≤ 3/10
  const moods = checkins
    .filter(c => typeof c.mood === 'number')
    .slice(0, 3)
    .map(c => c.mood as number); // mais recente primeiro
  if (moods.length >= 3 && moods[0] < moods[1] && moods[1] < moods[2]) {
    alerts.push({ text: `Humor em queda nos últimos 3 check-ins (${moods[2]} → ${moods[1]} → ${moods[0]}/10)`, severity: 'medium' });
  } else if (moods.length >= 2 && moods[0] <= 3 && moods[1] <= 3) {
    alerts.push({ text: `Humor muito baixo nos últimos check-ins (${moods[1]} e ${moods[0]}/10)`, severity: 'high' });
  }

  return alerts;
}

function AlertsBanner({ alerts }: { alerts: PanelAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {alerts.map((a, i) => (
        <div key={i}
          className={`flex items-start gap-2 p-2.5 rounded-xl border ${
            a.severity === 'high'
              ? 'bg-red-900/25 border-red-700/50'
              : 'bg-amber-900/25 border-amber-700/50'
          }`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
          <p className={`text-[11px] font-medium ${a.severity === 'high' ? 'text-red-200' : 'text-amber-200'}`}>{a.text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────

export const PatientInfoPanel: React.FC<Props> = ({ patientId, doctorId, doctorName, patientData, consultationId, onPatientUpdated }) => {
  const [fullProfile, setFullProfile] = useState<PatientFullProfile | null>(null);
  const [bodySnap, setBodySnap] = useState<BodyMeasurementSnapshot | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthDailyMetric[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [lastDose, setLastDose] = useState<any>(null);
  const [lastNote, setLastNote] = useState<ClinicalNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [profileRes, snapRes, metricsRes, checkinRes, doseRes, noteRes] = await Promise.allSettled([
        // Perfil completo — mesma fonte da página de perfil do paciente:
        // anamnese, peso via weight_logs, metas, adesão (meals), diário e consultas
        patientService.getPatientFullProfile(patientId, doctorId),

        // Última composição corporal do Body Scan
        MeasurementSnapshotService.getLatestSnapshot(patientId),

        // Agregados de dispositivos (Health Connect / HealthKit) — 7 dias
        HealthMetricsService.getDailyMetrics(patientId, 7),

        // Check-ins de humor/energia (escala 1–10)
        supabase
          .from('daily_checkins')
          .select('checkin_date, mood, energy_level, sleep_hours, notes')
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

        // Sinais vitais e conduta da consulta anterior
        clinicalNoteService.getLastFinalizedForPatient(patientId, consultationId),
      ]);

      if (profileRes.status === 'fulfilled') setFullProfile(profileRes.value);
      else console.error('getPatientFullProfile:', profileRes.reason);
      if (snapRes.status === 'fulfilled') setBodySnap(snapRes.value);
      if (metricsRes.status === 'fulfilled') setHealthMetrics(metricsRes.value);
      if (checkinRes.status === 'fulfilled') {
        setCheckins((checkinRes.value.data || []).map((c: any) => ({
          date: c.checkin_date,
          mood: c.mood,
          energy: c.energy_level,
          sleep_hours: c.sleep_hours,
          notes: c.notes,
        })));
      }
      if (doseRes.status === 'fulfilled') setLastDose((doseRes.value as any)?.data || null);
      if (noteRes.status === 'fulfilled') setLastNote(noteRes.value);
      setLoading(false);
    };

    if (patientId) load();
  }, [patientId, doctorId, consultationId, patientData?.glp1_mode]);

  const weight = fullProfile?.current_weight ?? patientData?.weight;
  const height = fullProfile?.height ?? patientData?.height;
  const bmi = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : null;
  const age = fullProfile?.age ?? patientData?.age;

  const weightHistory: WeightEntry[] = (fullProfile?.weight_history || []).map(w => ({
    date: new Date(`${w.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    weight: Number(w.weight),
  }));

  const hasActivityData = healthMetrics.some(m => m.steps || m.sleep_minutes || m.resting_heart_rate);
  const pastConsultations = (fullProfile?.past_consultations || []).filter((c: any) => c.status === 'completed');
  const lastConsultation = pastConsultations[0] as any;

  const alerts = computeAlerts({ fullProfile, lastNote, checkins, currentWeight: weight ?? null });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Alertas proativos — o que mudou desde a última consulta */}
      <AlertsBanner alerts={alerts} />

      {/* Dados básicos */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Peso" value={weight ? `${weight} kg` : '—'} />
        <StatCard label="Altura" value={height ? `${height} cm` : '—'} />
        <StatCard label="IMC" value={bmi || '—'} highlight={bmi ? parseFloat(bmi) > 25 : false} />
        <StatCard label="Meta cal." value={fullProfile?.current_goals?.calories ? `${fullProfile.current_goals.calories} kcal` : (patientData?.target_calories ? `${patientData.target_calories} kcal` : '—')} />
        <StatCard label="Meta prot." value={fullProfile?.current_goals?.protein ? `${fullProfile.current_goals.protein} g` : (patientData?.target_protein ? `${patientData.target_protein} g` : '—')} />
        <StatCard label="Idade" value={age ? `${age} anos` : '—'} />
      </div>

      {/* Objetivo + histórico de consultas */}
      {(fullProfile?.health_goal || pastConsultations.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {fullProfile?.health_goal && (
            <span className="px-2 py-1 bg-blue-900/30 border border-blue-700/50 text-blue-300 rounded-lg text-[10px] font-semibold">
              🎯 {fullProfile.health_goal}
            </span>
          )}
          {pastConsultations.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-lg text-[10px] text-gray-300">
              <CalendarCheck className="w-3 h-3 text-gray-400" />
              {pastConsultations.length}ª consulta
              {lastConsultation?.scheduled_at && (
                <> · última em {new Date(lastConsultation.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</>
              )}
            </span>
          )}
        </div>
      )}

      {/* Sinais vitais e conduta da consulta anterior */}
      {lastNote && (
        <Section title="Consulta Anterior" icon={<CalendarCheck className="w-3.5 h-3.5 text-teal-400" />}>
          <PreviousConsultationCard note={lastNote} currentWeight={weight ?? null} />
        </Section>
      )}

      {/* Gráfico de Peso */}
      <Section title="Evolução do Peso" icon={<Activity className="w-3.5 h-3.5 text-blue-400" />}>
        <WeightSparkline data={weightHistory} />
      </Section>

      {/* Composição corporal (Body Scan) */}
      {bodySnap && (
        <Section title="Composição Corporal" icon={<Scan className="w-3.5 h-3.5 text-cyan-400" />}>
          <BodyCompositionCard snap={bodySnap} />
        </Section>
      )}

      {/* Atividade & sono (dispositivos) */}
      {hasActivityData && (
        <Section title="Atividade — 7 dias" icon={<Footprints className="w-3.5 h-3.5 text-emerald-400" />}>
          <ActivitySummary metrics={healthMetrics} />
        </Section>
      )}

      {/* Adesão alimentar */}
      {fullProfile?.adherence && (
        <Section title="Adesão Alimentar — 30 dias" icon={<Utensils className="w-3.5 h-3.5 text-orange-400" />}>
          <AdherenceCard adherence={fullProfile.adherence} />
        </Section>
      )}

      {/* Humor & Energia */}
      <Section title="Humor & Energia" icon={<Heart className="w-3.5 h-3.5 text-pink-400" />}>
        <MoodEnergyBlock checkins={checkins} diary={fullProfile?.diary_entries || []} />
      </Section>

      {/* Anamnese */}
      {fullProfile && (
        <Section title="Anamnese" icon={<ClipboardList className="w-3.5 h-3.5 text-violet-400" />}>
          <AnamnesisCard p={fullProfile} />
        </Section>
      )}

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
          <ActivateGlp1Form
            patientId={patientId}
            doctorId={doctorId}
            doctorName={doctorName}
            onActivated={onPatientUpdated}
          />
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
