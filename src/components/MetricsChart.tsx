import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { WeightLogService, MeasurementSnapshotService, WeightLog, BodyMeasurementSnapshot } from '../services/weightLogService';

// ─── Types ────────────────────────────────────────────────────────────────────
type MetricTab = 'weight' | 'body_fat' | 'muscle' | 'measurements';
type ChartPeriod = '30d' | '90d' | '180d';

interface MetricsChartProps {
  onClose: () => void;
  onLogWeight?: () => void;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
interface ChartPoint { label: string; value: number; date: string; }

const LineChart: React.FC<{
  data: ChartPoint[];
  color: string;
  unit: string;
  height?: number;
}> = ({ data, color, unit, height = 160 }) => {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs opacity-50">Registre mais dados para ver o gráfico</p>
      </div>
    );
  }

  const W = 320;
  const H = height;
  const PAD = { top: 12, right: 16, bottom: 28, left: 36 };

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) => PAD.top + (1 - (v - minVal) / range) * (H - PAD.top - PAD.bottom);

  // Smooth bezier path
  let path = `M ${toX(0)} ${toY(data[0].value)}`;
  for (let i = 1; i < data.length; i++) {
    const x0 = toX(i - 1), y0 = toY(data[i - 1].value);
    const x1 = toX(i), y1 = toY(data[i].value);
    const cx = (x0 + x1) / 2;
    path += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  const areaPath = path + ` L ${toX(data.length - 1)} ${H - PAD.bottom} L ${toX(0)} ${H - PAD.bottom} Z`;

  // Y axis ticks
  const ticks = [minVal, minVal + range / 2, maxVal].map(v => ({
    v, y: toY(v), label: v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)
  }));

  // X axis labels (show 5 max)
  const xLabels = data.filter((_, i) => {
    const step = Math.max(1, Math.floor(data.length / 5));
    return i % step === 0 || i === data.length - 1;
  });

  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={PAD.left - 4} y={t.y + 4} textAnchor="end"
            fontSize="9" fill="rgba(255,255,255,0.4)">{t.label}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

      {/* Points */}
      {data.map((pt, i) => (
        <circle key={i} cx={toX(i)} cy={toY(pt.value)} r="3.5"
          fill={color} stroke="#0a0f10" strokeWidth="1.5" />
      ))}

      {/* X axis labels */}
      {xLabels.map((pt, i) => (
        <text key={i} x={toX(data.indexOf(pt))} y={H - PAD.bottom + 14}
          textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">
          {pt.label}
        </text>
      ))}
    </svg>
  );
};

// ─── Body Measurements Bar ─────────────────────────────────────────────────────
const MeasurementBar: React.FC<{
  label: string;
  current?: number;
  previous?: number;
  color: string;
}> = ({ label, current, previous, color }) => {
  if (!current) return null;
  const diff = previous ? current - previous : null;
  const isGood = diff !== null && diff < 0; // smaller = better for most measurements

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-20 flex-shrink-0">
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white">{current.toFixed(1)} cm</span>
          {diff !== null && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isGood ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, current / 1.5)}%`, background: color }} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const MetricsChart: React.FC<MetricsChartProps> = ({ onClose, onLogWeight }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<MetricTab>('weight');
  const [period, setPeriod] = useState<ChartPeriod>('90d');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [snapshots, setSnapshots] = useState<BodyMeasurementSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const days = period === '30d' ? 30 : period === '90d' ? 90 : 180;

    Promise.all([
      WeightLogService.getWeightHistoryForChart(user.id, days),
      MeasurementSnapshotService.getSnapshotHistory(user.id, days),
    ]).then(([wl, sn]) => {
      setWeightLogs(wl);
      setSnapshots(sn);
    }).finally(() => setLoading(false));
  }, [user, period]);

  // Period display
  const periodDays = period === '30d' ? 30 : period === '90d' ? 90 : 180;

  // Weight chart data
  const weightChartData = useMemo((): ChartPoint[] =>
    weightLogs.map(log => ({
      value: log.weight_kg,
      date: log.logged_at,
      label: new Date(log.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    })), [weightLogs]);

  // Body fat chart data
  const bodyFatChartData = useMemo((): ChartPoint[] =>
    snapshots.filter(s => s.avg_body_fat_pct != null).map(s => ({
      value: s.avg_body_fat_pct!,
      date: s.snapped_at,
      label: new Date(s.snapped_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    })), [snapshots]);

  // Muscle chart data
  const muscleChartData = useMemo((): ChartPoint[] =>
    snapshots.filter(s => s.avg_muscle_mass_kg != null).map(s => ({
      value: s.avg_muscle_mass_kg!,
      date: s.snapped_at,
      label: new Date(s.snapped_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    })), [snapshots]);

  // Latest vs previous snapshot measurements
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prevSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  // Summary stats
  const weightChange = weightChartData.length >= 2
    ? weightChartData[weightChartData.length - 1].value - weightChartData[0].value
    : null;
  const bfChange = bodyFatChartData.length >= 2
    ? bodyFatChartData[bodyFatChartData.length - 1].value - bodyFatChartData[0].value
    : null;
  const muscleChange = muscleChartData.length >= 2
    ? muscleChartData[muscleChartData.length - 1].value - muscleChartData[0].value
    : null;

  const tabs: { id: MetricTab; label: string; icon: string; color: string }[] = [
    { id: 'weight', label: 'Peso', icon: 'monitor_weight', color: '#1a9aaf' },
    { id: 'body_fat', label: 'Gordura', icon: 'opacity', color: '#f59e0b' },
    { id: 'muscle', label: 'Músculo', icon: 'fitness_center', color: '#10b981' },
    { id: 'measurements', label: 'Medidas', icon: 'straighten', color: '#8b5cf6' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#0a0f10', color: 'white' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: '#111c1e' }}>
        <button onClick={onClose} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: '#1a9aaf' }}>insights</span>
          <h1 className="text-white font-bold">Métricas</h1>
        </div>
        {onLogWeight && (
          <button
            onClick={onLogWeight}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(26,154,175,0.15)', color: '#1a9aaf' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Peso
          </button>
        )}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5"
        style={{ background: 'rgba(17,28,30,0.5)' }}>
        {(['30d', '90d', '180d'] as ChartPeriod[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: period === p ? '#1a9aaf' : 'rgba(255,255,255,0.05)',
              color: period === p ? 'white' : 'rgba(255,255,255,0.5)',
            }}
          >
            {p === '30d' ? '30 dias' : p === '90d' ? '90 dias' : '6 meses'}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
        {[
          { label: 'Peso', value: weightChange, unit: 'kg', invertGood: true },
          { label: 'Gordura', value: bfChange, unit: '%', invertGood: true },
          { label: 'Músculo', value: muscleChange, unit: 'kg', invertGood: false },
        ].map(({ label, value, unit, invertGood }) => (
          <div key={label} className="flex-shrink-0 rounded-xl px-4 py-3"
            style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)', minWidth: 100 }}>
            <p className="text-xs text-white/50 mb-1">{label}</p>
            {value !== null ? (
              <p className={`text-base font-bold ${
                (invertGood ? value < 0 : value > 0) ? 'text-green-400' : value === 0 ? 'text-white/60' : 'text-red-400'
              }`}>
                {value > 0 ? '+' : ''}{value.toFixed(1)}{unit}
              </p>
            ) : (
              <p className="text-white/30 text-sm">—</p>
            )}
            <p className="text-[10px] text-white/30 mt-0.5">{periodDays}d</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: activeTab === tab.id ? tab.color + '22' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.5)',
              border: activeTab === tab.id ? `1px solid ${tab.color}44` : '1px solid transparent',
            }}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full animate-spin border-2 border-t-transparent"
              style={{ borderColor: 'rgba(26,154,175,0.3)', borderTopColor: '#1a9aaf' }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* ── Weight Tab ── */}
              {activeTab === 'weight' && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Evolução do Peso</h3>
                      <span className="text-xs text-white/40">{weightLogs.length} registros</span>
                    </div>
                    {weightChartData.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-white/20">monitor_weight</span>
                        <p className="text-xs text-white/40">Nenhum registro de peso ainda.</p>
                        {onLogWeight && (
                          <button onClick={onLogWeight}
                            className="mt-2 px-4 py-2 rounded-xl text-xs font-medium"
                            style={{ background: '#1a9aaf22', color: '#1a9aaf' }}>
                            Registrar agora
                          </button>
                        )}
                      </div>
                    ) : (
                      <LineChart data={weightChartData} color="#1a9aaf" unit="kg" />
                    )}
                  </div>

                  {/* Recent entries */}
                  {weightLogs.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <h3 className="text-sm font-semibold text-white mb-3">Histórico Recente</h3>
                      <div className="space-y-2">
                        {weightLogs.slice(0, 8).reverse().map((log, i, arr) => {
                          const prev = arr[i - 1];
                          const diff = prev ? log.weight_kg - prev.weight_kg : null;
                          return (
                            <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <div>
                                <p className="text-sm font-semibold text-white">{log.weight_kg.toFixed(1)} kg</p>
                                <p className="text-xs text-white/40">
                                  {new Date(log.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                  {log.source === 'body_scan' && ' · Body Scan'}
                                </p>
                              </div>
                              {diff !== null && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${diff < 0 ? 'bg-green-500/15 text-green-400' : diff > 0 ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-white/40'}`}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Body Fat Tab ── */}
              {activeTab === 'body_fat' && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">% Gordura Corporal</h3>
                      <span className="text-xs text-white/40">{snapshots.length} scans</span>
                    </div>
                    {bodyFatChartData.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-white/20">photo_camera</span>
                        <p className="text-xs text-white/40">Faça seu primeiro Body Scan para ver o gráfico.</p>
                      </div>
                    ) : (
                      <LineChart data={bodyFatChartData} color="#f59e0b" unit="%" />
                    )}
                  </div>

                  {latestSnapshot?.avg_body_fat_pct != null && (
                    <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <h3 className="text-sm font-semibold text-white mb-2">Último Scan</h3>
                      <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold" style={{ color: '#f59e0b' }}>
                          {latestSnapshot.avg_body_fat_pct.toFixed(1)}%
                        </span>
                        <span className="text-xs text-white/40 pb-1">
                          {new Date(latestSnapshot.snapped_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </span>
                      </div>
                      {latestSnapshot.detected_biotype && (
                        <p className="text-xs text-white/50 mt-1 capitalize">Biotipo: {latestSnapshot.detected_biotype}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Muscle Tab ── */}
              {activeTab === 'muscle' && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Massa Muscular Magra</h3>
                      <span className="text-xs text-white/40">{snapshots.length} scans</span>
                    </div>
                    {muscleChartData.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-white/20">fitness_center</span>
                        <p className="text-xs text-white/40">Faça seu primeiro Body Scan para ver o gráfico.</p>
                      </div>
                    ) : (
                      <LineChart data={muscleChartData} color="#10b981" unit="kg" />
                    )}
                  </div>

                  {latestSnapshot?.avg_muscle_mass_kg != null && (
                    <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <h3 className="text-sm font-semibold text-white mb-2">Último Scan</h3>
                      <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold" style={{ color: '#10b981' }}>
                          {latestSnapshot.avg_muscle_mass_kg.toFixed(1)} kg
                        </span>
                        <span className="text-xs text-white/40 pb-1">
                          {new Date(latestSnapshot.snapped_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Measurements Tab ── */}
              {activeTab === 'measurements' && (
                <div className="space-y-4">
                  {!latestSnapshot ? (
                    <div className="flex flex-col items-center py-12 text-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-white/20">straighten</span>
                      <p className="text-sm text-white/50">Nenhum scan realizado ainda.</p>
                      <p className="text-xs text-white/30">Complete um Body Scan para ver suas medidas aqui.</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-white">Medidas Atuais</h3>
                          <span className="text-xs text-white/40">
                            {new Date(latestSnapshot.snapped_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        {[
                          { label: 'Cintura', key: 'waist_cm' as const, color: '#f59e0b' },
                          { label: 'Quadril', key: 'hip_cm' as const, color: '#8b5cf6' },
                          { label: 'Peitoral', key: 'chest_cm' as const, color: '#1a9aaf' },
                          { label: 'Braço E.', key: 'arm_left_cm' as const, color: '#10b981' },
                          { label: 'Braço D.', key: 'arm_right_cm' as const, color: '#10b981' },
                          { label: 'Coxa E.', key: 'thigh_left_cm' as const, color: '#f97316' },
                          { label: 'Coxa D.', key: 'thigh_right_cm' as const, color: '#f97316' },
                          { label: 'Panturrilha E.', key: 'calf_left_cm' as const, color: '#ec4899' },
                          { label: 'Panturrilha D.', key: 'calf_right_cm' as const, color: '#ec4899' },
                        ].map(m => (
                          <MeasurementBar
                            key={m.key}
                            label={m.label}
                            current={latestSnapshot[m.key] ?? undefined}
                            previous={prevSnapshot?.[m.key] ?? undefined}
                            color={m.color}
                          />
                        ))}
                      </div>

                      {/* BMI */}
                      {latestSnapshot.bmi && (
                        <div className="rounded-xl p-4" style={{ background: '#111c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <h3 className="text-sm font-semibold text-white mb-3">IMC & Dados Físicos</h3>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'IMC', value: latestSnapshot.bmi?.toFixed(1), unit: '' },
                              { label: 'Peso', value: latestSnapshot.weight_kg?.toFixed(1), unit: 'kg' },
                              { label: 'Altura', value: latestSnapshot.height_cm?.toFixed(0), unit: 'cm' },
                            ].map(item => (
                              <div key={item.label} className="text-center rounded-lg py-3"
                                style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <p className="text-lg font-bold text-white">{item.value}{item.unit}</p>
                                <p className="text-[10px] text-white/40 mt-0.5">{item.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
