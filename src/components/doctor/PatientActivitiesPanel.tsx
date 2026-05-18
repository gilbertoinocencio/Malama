import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity, Flame, Clock, Route, Brain, RefreshCw } from 'lucide-react';
import { patientActivitiesService } from '../../services/doctorPortalService';
import type { PatientActivity } from '../../services/doctorPortalService';

interface Props {
  patientId: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  Run: 'Corrida', VirtualRun: 'Corrida Virtual', Ride: 'Ciclismo',
  VirtualRide: 'Ciclismo Virtual', MountainBikeRide: 'MTB', Walk: 'Caminhada',
  Hike: 'Trilha', Swim: 'Natação', WeightTraining: 'Musculação',
  Workout: 'Treino', Yoga: 'Yoga', Crossfit: 'CrossFit',
  Rowing: 'Remo', Soccer: 'Futebol', Tennis: 'Tênis',
};

const MET_BY_TYPE: Record<string, number> = {
  Walk: 3.5, Hike: 5.5, Run: 9.0, VirtualRun: 8.0,
  Ride: 6.0, VirtualRide: 5.5, MountainBikeRide: 8.5,
  Swim: 6.0, WeightTraining: 4.5, Workout: 4.5,
  Yoga: 2.5, Crossfit: 7.0, Rowing: 7.0, Soccer: 7.0, Tennis: 6.0,
};

function estimateCaloriesMET(type: string, durationSeconds: number): number {
  const met = MET_BY_TYPE[type] ?? 4.0;
  return Math.round(met * 70 * (durationSeconds / 3600));
}

function getEffectiveCalories(a: PatientActivity): { kcal: number; estimated: boolean } {
  if (a.calories_burned > 0) return { kcal: a.calories_burned, estimated: false };
  return { kcal: estimateCaloriesMET(a.activity_type, a.duration_seconds ?? 0), estimated: true };
}

function fmt(label: string) { return ACTIVITY_LABELS[label] ?? label; }
function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function buildWeeklyChart(activities: PatientActivity[]) {
  const weeks: { week: string; kcal: number; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end   = new Date(Date.now() - i * 7 * 86_400_000);
    const start = new Date(end.getTime() - 7 * 86_400_000);
    const label = `${start.getDate()}/${start.getMonth() + 1}`;
    const slice = activities.filter(a => {
      const d = new Date(a.activity_date);
      return d >= start && d < end;
    });
    weeks.push({
      week: label,
      kcal: slice.reduce((s, a) => s + getEffectiveCalories(a).kcal, 0),
      count: slice.length,
    });
  }
  return weeks;
}

export const PatientActivitiesPanel: React.FC<Props> = ({ patientId }) => {
  const [activities, setActivities]     = useState<PatientActivity[]>([]);
  const [loading, setLoading]           = useState(true);
  const [insights, setInsights]         = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [period, setPeriod]             = useState<7 | 30>(30);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await patientActivitiesService.getPatientActivities(patientId, period);
    setActivities(data);
    setLoading(false);
  }, [patientId, period]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateInsights = async () => {
    try {
      setInsightsLoading(true);
      const text = await patientActivitiesService.getActivityHealthInsights(patientId);
      setInsights(text);
    } catch {
      setInsights('Não foi possível gerar a análise. Tente novamente.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // Estatísticas derivadas (usa estimativa MET quando calories_burned = 0)
  const totalKcal    = activities.reduce((s, a) => s + getEffectiveCalories(a).kcal, 0);
  const totalMin     = Math.round(activities.reduce((s, a) => s + (a.duration_seconds ?? 0), 0) / 60);
  const totalKm      = activities.reduce((s, a) => s + ((a.distance_meters ?? 0) / 1000), 0);
  const typeFreq     = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.activity_type] = (acc[a.activity_type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topType      = (Object.entries(typeFreq) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
  const weeklyChart  = buildWeeklyChart(activities);
  const weeksWithActivity = weeklyChart.filter(w => w.count > 0).length;

  return (
    <div className="space-y-6">

      {/* Cabeçalho + seletor de período */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#7d4a3c]" />
          Atividades Físicas
        </h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([7, 30] as const).map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                period === d
                  ? 'bg-white text-[#7d4a3c] font-semibold shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Activity className="w-5 h-5 text-[#7d4a3c]" />}
              label="Atividades"
              value={String(activities.length)}
              sub={`${weeksWithActivity} sem. ativas`}
            />
            <StatCard
              icon={<Flame className="w-5 h-5 text-orange-500" />}
              label="Calorias queimadas"
              value={totalKcal.toLocaleString('pt-BR')}
              sub="kcal no período"
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-blue-500" />}
              label="Tempo total"
              value={totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}min` : `${totalMin}min`}
              sub="de treino"
            />
            <StatCard
              icon={<Route className="w-5 h-5 text-green-500" />}
              label={topType ? fmt(topType[0]) : 'Tipo'}
              value={topType ? String(topType[1]) : '—'}
              sub={topType ? 'atividade mais frequente' : 'nenhuma atividade'}
            />
          </div>

          {/* Gráfico semanal */}
          {activities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Calorias queimadas por semana</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [`${v} kcal`, 'Calorias']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="kcal" fill="#7d4a3c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista de atividades recentes */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Atividades recentes</h4>
            {activities.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhuma atividade registrada nos últimos {period} dias.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {activities.slice(0, 15).map(a => {
                  const { kcal, estimated } = getEffectiveCalories(a);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7d4a3c]/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-[#7d4a3c]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{a.name}</p>
                          <p className="text-xs text-gray-500">
                            {fmt(a.activity_type)} · {new Date(a.activity_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="hidden sm:block text-gray-400">{fmtDuration(a.duration_seconds)}</span>
                        {a.distance_meters && a.distance_meters > 0 && (
                          <span className="hidden md:block text-gray-400">{(a.distance_meters / 1000).toFixed(1)} km</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-orange-600">{kcal} kcal</span>
                          {estimated && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              est.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activities.length > 15 && (
                  <div className="px-4 py-2 text-center text-xs text-gray-400 bg-gray-50">
                    +{activities.length - 15} atividades não exibidas
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Análise de IA */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#7d4a3c]" />
                <span className="text-sm font-semibold text-gray-700">Análise IA — Saúde e Nutrição</span>
              </div>
              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading || activities.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#7d4a3c] text-white rounded-lg hover:bg-[#623a2f] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                {insightsLoading ? 'Gerando...' : insights ? 'Regenerar' : 'Gerar análise'}
              </button>
            </div>
            <div className="p-4 bg-white min-h-[80px]">
              {insightsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7d4a3c]" />
                  Analisando atividades e padrão alimentar...
                </div>
              ) : insights ? (
                <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {insights}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  {activities.length === 0
                    ? 'Nenhuma atividade registrada no período para analisar.'
                    : 'Clique em "Gerar análise" para obter um resumo clínico do impacto das atividades na saúde e alimentação do paciente.'}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
