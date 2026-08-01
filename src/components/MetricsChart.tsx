import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  WeightLogService,
  MeasurementSnapshotService,
  HealthMetricsService,
  WeightLog,
  BodyMeasurementSnapshot,
  HealthDailyMetric,
} from '../services/weightLogService';
import { WeightLogModal } from './WeightLogModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type LineTab = 'weight' | 'body_fat' | 'muscle' | 'steps' | 'heart_rate' | 'sleep';
type MetricTab = LineTab;
type ChartPeriod = '30d' | '90d' | '180d';

interface MetricsChartProps {
  onClose: () => void;
}

interface ChartPoint { label: string; value: number; date: string; }

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Parse 'YYYY-MM-DD' como data local (evita off-by-one); ISO completo via Date normal. */
const toDate = (s: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
};
const fmtDay = (s: string) => toDate(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

// ─── Metric configuration (data-viz semantics, paleta quente alinhada à marca) ──
const METRICS: Record<LineTab, {
  label: string;
  icon: string;
  color: string;
  unit: string;
  good: 'down' | 'up' | 'neutral';
  fmtValue: (v: number) => string;
  fmtAxis?: (v: number) => string;
  emptyIcon: string;
  emptyText: string;
}> = {
  weight:     { label: 'Peso',       icon: 'monitor_weight', color: '#8c473e', unit: 'kg',  good: 'down',    fmtValue: v => v.toFixed(1), emptyIcon: 'monitor_weight', emptyText: 'Nenhum registro de peso ainda.' },
  body_fat:   { label: 'Gordura',    icon: 'opacity',        color: '#d47311', unit: '%',   good: 'down',    fmtValue: v => v.toFixed(1), emptyIcon: 'opacity',        emptyText: 'Faça um Body Scan ou conecte o Health Connect.' },
  muscle:     { label: 'Massa magra', icon: 'fitness_center', color: '#7E9B5B', unit: 'kg',  good: 'up',      fmtValue: v => v.toFixed(1), emptyIcon: 'fitness_center', emptyText: 'Faça seu primeiro Body Scan para ver a evolução.' },
  steps:      { label: 'Passos',     icon: 'directions_walk',color: '#C4856A', unit: '',    good: 'up',      fmtValue: v => Math.round(v).toLocaleString('pt-BR'), fmtAxis: v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0), emptyIcon: 'directions_walk', emptyText: 'Conecte o Health Connect (em Integrações) para ver seus passos.' },
  heart_rate: { label: 'Batimentos', icon: 'cardiology',     color: '#C0392B', unit: 'bpm', good: 'neutral', fmtValue: v => v.toFixed(0), emptyIcon: 'cardiology',     emptyText: 'Conecte o Health Connect para acompanhar sua frequência cardíaca.' },
  sleep:      { label: 'Sono',       icon: 'bedtime',        color: '#7C6BA6', unit: 'h',   good: 'neutral', fmtValue: v => v.toFixed(1), emptyIcon: 'bedtime',        emptyText: 'Conecte o Health Connect para ver seu histórico de sono.' },
};

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
const LineChart: React.FC<{
  data: ChartPoint[];
  color: string;
  height?: number;
  formatAxis?: (v: number) => string;
}> = ({ data, color, height = 180, formatAxis }) => {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-Malama-muted/70 dark:text-white/50">Registre mais dados para ver o gráfico</p>
      </div>
    );
  }

  const W = 320;
  const H = height;
  const PAD = { top: 12, right: 16, bottom: 28, left: 40 };

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) => PAD.top + (1 - (v - minVal) / range) * (H - PAD.top - PAD.bottom);

  let path = `M ${toX(0)} ${toY(data[0].value)}`;
  for (let i = 1; i < data.length; i++) {
    const x0 = toX(i - 1), y0 = toY(data[i - 1].value);
    const x1 = toX(i), y1 = toY(data[i].value);
    const cx = (x0 + x1) / 2;
    path += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  const areaPath = path + ` L ${toX(data.length - 1)} ${H - PAD.bottom} L ${toX(0)} ${H - PAD.bottom} Z`;

  const fmt = formatAxis ?? ((v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)));
  const ticks = [minVal, minVal + range / 2, maxVal].map(v => ({ v, y: toY(v) }));

  const xLabels = data.filter((_, i) => {
    const step = Math.max(1, Math.floor(data.length / 5));
    return i % step === 0 || i === data.length - 1;
  });

  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y}
            className="stroke-Malama-border dark:stroke-white/10" strokeWidth="1" />
          <text x={PAD.left - 6} y={t.y + 4} textAnchor="end"
            className="fill-Malama-muted/70 dark:fill-white/40" fontSize="9">{fmt(t.v)}</text>
        </g>
      ))}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

      {data.map((pt, i) => (
        <circle key={i} cx={toX(i)} cy={toY(pt.value)} r="3.5"
          fill={color} className="stroke-white dark:stroke-surface-dark" strokeWidth="1.5" />
      ))}

      {xLabels.map((pt, i) => (
        <text key={i} x={toX(data.indexOf(pt))} y={H - PAD.bottom + 16}
          textAnchor="middle" className="fill-Malama-muted/60 dark:fill-white/40" fontSize="9">
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
  const isGood = diff !== null && diff < 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-Malama-border dark:border-white/5 last:border-0">
      <div className="w-20 flex-shrink-0">
        <span className="text-xs text-Malama-muted dark:text-white/60">{label}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-Malama-main dark:text-white">{current.toFixed(1)} cm</span>
          {diff !== null && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isGood ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-Malama-petrol-light dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, current / 1.5)}%`, background: color }} />
        </div>
      </div>
    </div>
  );
};

const CARD = 'rounded-2xl border border-Malama-border dark:border-white/5 bg-white dark:bg-surface-dark shadow-sm dark:shadow-none';

// ─── Circular goal ring (reaproveitado da casca "Renovação de Plano") ───────────
const GoalRing: React.FC<{ percent: number; color: string }> = ({ percent, color }) => (
  <div className="relative w-[68px] h-[68px] flex items-center justify-center shrink-0">
    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
      <path
        className="text-Malama-border dark:text-white/10"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none" stroke="currentColor" strokeWidth="3"
      />
      <path
        style={{ color }}
        strokeDasharray={`${percent}, 100`}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      />
    </svg>
    <div className="absolute flex flex-col items-center leading-none">
      <span className="text-sm font-bold text-Malama-main dark:text-white">{Math.round(percent)}%</span>
      <span className="text-[7px] font-semibold uppercase tracking-wider text-Malama-muted dark:text-white/50 mt-0.5">meta</span>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export const MetricsChart: React.FC<MetricsChartProps> = ({ onClose }) => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<MetricTab>('weight');
  const [period, setPeriod] = useState<ChartPeriod>('90d');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [snapshots, setSnapshots] = useState<BodyMeasurementSnapshot[]>([]);
  const [daily, setDaily] = useState<HealthDailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const periodDays = period === '30d' ? 30 : period === '90d' ? 90 : 180;

  const loadData = (userId: string, days: number) => {
    setLoading(true);
    Promise.all([
      WeightLogService.getWeightHistoryForChart(userId, days),
      MeasurementSnapshotService.getSnapshotHistory(userId, days),
      HealthMetricsService.getDailyMetrics(userId, days),
    ]).then(([wl, sn, dm]) => {
      setWeightLogs(wl);
      setSnapshots(sn);
      setDaily(dm);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadData(user.id, periodDays);
  }, [user, periodDays]);

  // ── Séries por aba ──────────────────────────────────────────────────────────
  const series: Record<LineTab, ChartPoint[]> = useMemo(() => {
    const pt = (value: number, date: string): ChartPoint => ({ value, date, label: fmtDay(date) });
    const byDate = (a: ChartPoint, b: ChartPoint) => toDate(a.date).getTime() - toDate(b.date).getTime();

    return {
      weight: weightLogs.map(l => pt(l.weight_kg, l.logged_at)),
      // % gordura: funde Body Scan (snapshots) + Health Connect (daily)
      body_fat: [
        ...snapshots.filter(s => s.avg_body_fat_pct != null).map(s => pt(s.avg_body_fat_pct!, s.snapped_at)),
        ...daily.filter(d => d.body_fat_pct != null).map(d => pt(d.body_fat_pct!, d.metric_date)),
      ].sort(byDate),
      muscle: snapshots.filter(s => s.avg_muscle_mass_kg != null).map(s => pt(s.avg_muscle_mass_kg!, s.snapped_at)),
      steps: daily.filter(d => d.steps != null).map(d => pt(d.steps!, d.metric_date)),
      heart_rate: daily.filter(d => d.avg_heart_rate != null).map(d => pt(d.avg_heart_rate!, d.metric_date)),
      sleep: daily.filter(d => d.sleep_minutes != null).map(d => pt(+(d.sleep_minutes! / 60).toFixed(1), d.metric_date)),
    };
  }, [weightLogs, snapshots, daily]);

  // Circumferences inferred from the camera are model inputs, not measurements.
  // Keep the legacy renderer for manually sourced historical data, but do not
  // expose a BodyScan "Medidas" tab to users.
  const tabs: MetricTab[] = ['weight', 'body_fat', 'muscle', 'steps', 'heart_rate', 'sleep'];

  // Métricas primárias usadas no grid-resumo (cards h-36 estilo "Análise Trimestral")
  const PRIMARY: LineTab[] = ['weight', 'body_fat', 'muscle'];

  // ── Renderer compartilhado para as abas de linha ──────────────────────────────
  const renderLineTab = (key: LineTab) => {
    const cfg = METRICS[key];
    const data = series[key];
    const latest = data.length ? data[data.length - 1] : null;
    const change = data.length >= 2 ? data[data.length - 1].value - data[0].value : null;
    const changeGood = change !== null && cfg.good !== 'neutral'
      ? (cfg.good === 'down' ? change < 0 : change > 0)
      : null;

    // Anel circular — progresso real rumo à meta de peso (profiles.target_weight_kg).
    const goalWeight = key === 'weight' ? (profile?.target_weight_kg ?? null) : null;
    const startVal = data.length ? data[0].value : null;
    let goalRing: number | null = null;
    if (goalWeight && startVal != null && latest != null && startVal !== goalWeight) {
      const losing = goalWeight < startVal;
      const progressed = losing ? startVal - latest.value : latest.value - startVal;
      goalRing = Math.max(0, Math.min(100, (progressed / Math.abs(startVal - goalWeight)) * 100));
    }

    // Cards-resumo: as outras métricas primárias (troca o gráfico em destaque ao tocar)
    const summary = PRIMARY.filter(k => k !== key).map(k => {
      const c = METRICS[k];
      const d = series[k];
      const last = d.length ? d[d.length - 1] : null;
      const ch = d.length >= 2 ? d[d.length - 1].value - d[0].value : null;
      const good = ch !== null && c.good !== 'neutral' ? (c.good === 'down' ? ch < 0 : ch > 0) : null;
      return { k, c, last, ch, good };
    });

    return (
      <div className="space-y-5">
        {/* Card-herói editorial */}
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-Malama-border dark:border-white/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-10" style={{ background: cfg.color }} />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px]" style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-Malama-muted dark:text-slate-400">{cfg.label}</span>
              </div>
              {latest ? (
                <div className="flex items-end gap-1.5">
                  <span className="text-[44px] leading-none font-light tracking-tight text-Malama-main dark:text-white">{cfg.fmtValue(latest.value)}</span>
                  {cfg.unit && <span className="text-base font-semibold text-Malama-muted dark:text-slate-400 pb-1.5">{cfg.unit}</span>}
                </div>
              ) : (
                <span className="text-3xl font-light text-Malama-muted/40 dark:text-white/30">—</span>
              )}
              {latest && (
                <p className="text-xs text-Malama-muted dark:text-slate-500 mt-2">
                  {toDate(latest.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
              )}
            </div>
            {goalRing !== null ? (
              <GoalRing percent={goalRing} color={cfg.color} />
            ) : change !== null ? (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                changeGood === null ? 'bg-Malama-petrol-light text-Malama-muted dark:bg-white/10 dark:text-slate-300'
                  : changeGood ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}>
                {change > 0 ? '+' : ''}{cfg.fmtValue(change)}{cfg.unit && ` ${cfg.unit}`}
              </span>
            ) : null}
          </div>
        </div>

        {/* Card terracota de destaque — variação no período (métrica-chave) */}
        {change !== null && (
          <div className="bg-Malama-petrol dark:bg-primary rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 size-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
                  Variação · {periodDays === 30 ? '30 dias' : periodDays === 90 ? '90 dias' : '6 meses'}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-white font-serif text-3xl italic tracking-wide">
                    {change > 0 ? '+' : ''}{cfg.fmtValue(change)}
                  </span>
                  {cfg.unit && <span className="text-white/80 text-sm font-medium">{cfg.unit}</span>}
                </div>
                {goalWeight && (
                  <p className="text-white/70 text-xs mt-1 font-light">rumo à sua meta de {goalWeight} kg</p>
                )}
              </div>
              <div className="size-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                <span className="material-symbols-outlined text-white text-2xl">
                  {changeGood === null ? 'trending_flat' : changeGood ? 'trending_up' : 'trending_down'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chart card */}
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-Malama-border dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-Malama-main dark:text-white">Evolução</h3>
            <span className="text-xs text-Malama-muted/70 dark:text-white/40">{data.length} {data.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          {data.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center gap-2">
              <span className="material-symbols-outlined text-3xl text-Malama-muted/30 dark:text-white/20">{cfg.emptyIcon}</span>
              <p className="text-xs text-Malama-muted dark:text-white/40 max-w-[15rem]">{cfg.emptyText}</p>
              {key === 'weight' && (
                <button onClick={() => setShowWeightModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-Malama-petrol/10 text-Malama-petrol dark:bg-primary/15 dark:text-primary">
                  Registrar agora
                </button>
              )}
            </div>
          ) : (
            <LineChart data={data} color={cfg.color} formatAxis={cfg.fmtAxis} />
          )}
        </div>

        {/* Grid-resumo — outras métricas primárias (cards h-36, troca o destaque) */}
        {summary.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {summary.map(({ k, c, last, ch, good }) => (
              <button
                key={k}
                onClick={() => setActiveTab(k)}
                className="text-left bg-white dark:bg-surface-dark p-5 rounded-2xl shadow-sm border border-Malama-border dark:border-white/10 flex flex-col justify-between h-36 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-4xl" style={{ color: c.color }}>{c.icon}</span>
                </div>
                <div className="size-10 rounded-full bg-Malama-bg dark:bg-Malama-dark border border-Malama-border dark:border-white/10 flex items-center justify-center mb-2" style={{ color: c.color }}>
                  <span className="material-symbols-outlined text-xl">{c.icon}</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-semibold text-Malama-main dark:text-white">
                      {last ? c.fmtValue(last.value) : '—'}
                    </span>
                    {last && c.unit && <span className="text-xs font-medium text-Malama-muted">{c.unit}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-medium text-Malama-muted">{c.label}</p>
                    {ch !== null && (
                      <span className={`text-[10px] font-bold ${
                        good === null ? 'text-Malama-muted' : good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {ch > 0 ? '+' : ''}{c.fmtValue(ch)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Histórico recente (só peso) */}
        {key === 'weight' && weightLogs.length > 0 && (
          <div className={`${CARD} p-4`}>
            <h3 className="text-sm font-bold text-Malama-main dark:text-white mb-3">Histórico recente</h3>
            <div className="space-y-1">
              {weightLogs.slice(-8).reverse().map((log, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? log.weight_kg - prev.weight_kg : null;
                return (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-Malama-border dark:border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-Malama-main dark:text-white">{log.weight_kg.toFixed(1)} kg</p>
                      <p className="text-xs text-Malama-muted/80 dark:text-white/40">
                        {toDate(log.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {log.source === 'body_scan' && ' · Body Scan'}
                        {log.source === 'wearable' && ' · Health Connect'}
                      </p>
                    </div>
                    {diff !== null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${diff < 0 ? 'bg-green-500/15 text-green-600 dark:text-green-400' : diff > 0 ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'text-Malama-muted dark:text-white/40'}`}>
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
    );
  };

  // Range de datas do herói editorial (— 30 MAR — 28 JUN —)
  const rangeEnd = new Date();
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - periodDays);
  const fmtRange = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();
  const dateRange = `${fmtRange(rangeStart)} — ${fmtRange(rangeEnd)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white font-display animate-fade-in pt-safe">

      {/* Header editorial */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 bg-Malama-bg/90 dark:bg-background-dark/90 backdrop-blur-sm border-b border-Malama-border dark:border-white/5">
        <button
          onClick={onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-Malama-main dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        </button>
        <h1 className="text-xs font-bold uppercase tracking-[0.18em] text-Malama-muted dark:text-gray-400">Evolução</h1>
        <button
          onClick={() => setShowWeightModal(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-Malama-petrol dark:text-primary hover:bg-Malama-petrol/10 transition-colors"
          aria-label="Registrar peso"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
        </button>
      </div>

      {/* Herói editorial */}
      <div className="flex flex-col items-center px-6 pt-6 pb-2 animate-fade-in-up">
        <h2 className="text-[34px] font-light leading-tight tracking-tight text-Malama-main dark:text-white text-center">
          Sua <span className="font-serif italic text-Malama-petrol dark:text-primary">Evolução</span>
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-px w-6 bg-Malama-border dark:bg-white/15" />
          <p className="text-Malama-muted dark:text-gray-400 text-[11px] font-semibold tracking-wider uppercase">{dateRange}</p>
          <span className="h-px w-6 bg-Malama-border dark:bg-white/15" />
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {(['30d', '90d', '180d'] as ChartPeriod[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              period === p
                ? 'bg-Malama-petrol text-white dark:bg-primary'
                : 'bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/10 text-Malama-muted dark:text-slate-400'
            }`}
          >
            {p === '30d' ? '30 dias' : p === '90d' ? '90 dias' : '6 meses'}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {tabs.map(id => {
          const cfg = METRICS[id];
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border"
              style={{
                background: active ? cfg.color + '1f' : 'transparent',
                color: active ? cfg.color : undefined,
                borderColor: active ? cfg.color + '55' : 'transparent',
              }}
            >
              <span className={`material-symbols-outlined text-[16px] ${active ? '' : 'text-Malama-muted dark:text-slate-400'}`}>{cfg.icon}</span>
              <span className={active ? '' : 'text-Malama-muted dark:text-slate-400'}>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 rounded-full animate-spin border-2 border-Malama-petrol/30 border-t-Malama-petrol dark:border-primary/30 dark:border-t-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderLineTab(activeTab)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Weight Log Modal */}
      {showWeightModal && (
        <WeightLogModal
          onClose={() => setShowWeightModal(false)}
          onSaved={() => { if (user) loadData(user.id, periodDays); }}
        />
      )}
    </div>
  );
};
