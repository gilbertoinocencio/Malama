import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { DailyStats, AppView } from '../types';
import { USER_AVATAR } from '../constants';
import { useLanguage } from '../i18n';
import { GamificationService, GamificationStats } from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Confetti } from './Confetti';

interface FlowDashboardProps {
  stats: DailyStats;
  onFabClick: () => void;
  onShareClick: () => void;
  onNavClick: (view: AppView) => void;
  activeView: AppView;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type PeriodTab = 'day' | 'week' | 'month';

export const FlowDashboard: React.FC<FlowDashboardProps> = ({
  stats,
  onFabClick,
  onShareClick,
  onNavClick,
  activeView,
  isDarkMode,
  onToggleTheme
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<PeriodTab>('week');
  const [gameStats, setGameStats] = useState<GamificationStats | null>(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [weeklyScores, setWeeklyScores] = useState<{ date: string, score: number }[]>([]);

  useEffect(() => {
    if (user) {
      loadGameStats();
    }
  }, [user]);

  const loadGameStats = async () => {
    if (!user) return;
    // We try to get stats from service, which updates them if needed, or fallback to profile
    // Ideally we subscribe to realtime changes, but for now fetch on load
    const result = await GamificationService.updateStats(user.id);
    if (result) {
      setGameStats(result.stats);
    }
  };

  useEffect(() => {
    if (user) {
      loadDailyData();
      loadWeeklyScores();
    }
  }, [user]);

  const loadDailyData = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_logs')
      .select('water_intake')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
    if (data) setWaterIntake(data.water_intake || 0);
  };

  const loadWeeklyScores = async () => {
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const { data } = await supabase
      .from('flow_stats')
      .select('date, flow_score')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });
    if (data) setWeeklyScores(data.map(d => ({ date: d.date, score: d.flow_score || 0 })));
  };

  // Flow score calculated from consumed vs target (demo)
  const flowScore = stats.flowScore ?? 0;
  const scoreIsOptimized = flowScore >= 75;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (flowScore >= 80) {
      setShowConfetti(true);
    }
  }, [flowScore]);

  // SVG gauge calculations
  const circumference = 2 * Math.PI * 42;
  const gaugeOffset = circumference - (flowScore / 100) * circumference;

  // Calorie progress for Day view
  const caloriePercent = Math.min((stats.consumedCalories / stats.targetCalories) * 100, 100);

  const getLevelLabel = (level: string) => {
    const levels: Record<string, string> = {
      seed: t.dashboard.levelSeed,
      root: t.dashboard.levelRoot,
      stem: t.dashboard.levelStem,
      flower: t.dashboard.levelFlower,
      fruit: t.dashboard.levelFruit,
    };
    return levels[level] || t.dashboard.levelSeed;
  };

  const generateChartPath = () => {
    const scores = weeklyScores.length > 0 ? weeklyScores.map(s => s.score) : [0];
    const width = 350;
    const height = 150;
    const points = scores.map((score, i) => ({
      x: scores.length === 1 ? width / 2 : (i / (scores.length - 1)) * width,
      y: height - (score / 100) * (height - 10) - 5
    }));
    if (points.length === 1) {
      return { line: `M${points[0].x} ${points[0].y}`, area: `M${points[0].x} ${points[0].y} L${points[0].x} ${height} Z` };
    }
    let line = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const midX = (points[i - 1].x + points[i].x) / 2;
      line += ` C ${midX} ${points[i - 1].y}, ${midX} ${points[i].y}, ${points[i].x} ${points[i].y}`;
    }
    const area = line + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    return { line, area };
  };

  const getConsistency = () => {
    if (weeklyScores.length < 2) return { label: '—', isPositive: true };
    const flowDays = weeklyScores.filter(d => d.score >= 75).length;
    const ratio = flowDays / weeklyScores.length;
    if (ratio >= 0.7) return { label: t.dashboard.consistencyHigh, isPositive: true };
    if (ratio >= 0.4) return { label: t.dashboard.consistencyMedium, isPositive: true };
    return { label: t.dashboard.consistencyLow, isPositive: false };
  };

  const chartPaths = generateChartPath();
  const consistency = getConsistency();
  const waterIntakeL = (waterIntake / 1000).toFixed(1);
  const waterPercent = Math.min((waterIntake / 2500) * 100, 100);
  const proteinPercent = stats.targetMacros.protein > 0 ? Math.min((stats.macros.protein / stats.targetMacros.protein) * 100, 100) : 0;
  const energyPercent = caloriePercent;
  const displayName = profile?.display_name || user?.email?.split('@')[0] || t.dashboard.defaultUser;

  // Use profile level as fallback if gameStats is not yet loaded
  const currentLevel = gameStats?.level || profile?.level || 'seed';
  const currentStreak = gameStats?.currentStreak || profile?.current_streak || 0;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white animate-fade-in transition-colors duration-300">
      <Confetti active={showConfetti} />

      {/* Header */}
      <header className="flex items-center px-6 py-5 justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-nura-petrol/20 dark:border-primary/20"
              style={{ backgroundImage: `url("${USER_AVATAR}")` }}
            />
            {currentStreak > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-background-dark flex items-center gap-0.5 animate-pulse">
                <span className="material-symbols-outlined text-[10px]">local_fire_department</span>
                {currentStreak}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-nura-muted dark:text-slate-400 font-medium tracking-wide uppercase">
              {`${t.dashboard.levelPrefix} ${getLevelLabel(currentLevel)}`}
            </span>
            <h2 className="text-nura-main dark:text-white text-lg font-bold leading-tight">{displayName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavClick(AppView.FLOW_ADAPTATION)}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-nura-border dark:border-transparent hover:bg-nura-petrol-light dark:hover:bg-primary/10 transition-colors text-nura-petrol dark:text-primary relative animate-pulse shadow-sm dark:shadow-none"
            title="Simulate Activity Detected"
          >
            <span className="material-symbols-outlined text-[20px]">sync</span>
            <span className="absolute top-2 right-2 size-2 bg-nura-petrol dark:bg-primary rounded-full" />
          </button>
          <button
            onClick={() => onNavClick(AppView.FEED)}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-nura-border dark:border-transparent hover:bg-nura-petrol-light dark:hover:bg-primary/10 transition-colors text-nura-petrol dark:text-primary shadow-sm dark:shadow-none"
            title="Community Feed"
          >
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-nura-border dark:border-transparent hover:bg-nura-petrol-light dark:hover:bg-primary/10 transition-colors text-nura-muted dark:text-slate-300 shadow-sm dark:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8 pb-24">

        <LayoutGroup>
          <div className="px-6">
            <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-white dark:bg-surface-dark p-1 border border-nura-border dark:border-white/5 relative overflow-hidden">
              {(['day', 'week', 'month'] as PeriodTab[]).map((tab) => (
                <label
                  key={tab}
                  className={`relative flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl transition-all text-sm font-semibold z-10 ${period === tab
                    ? 'text-nura-petrol dark:text-white'
                    : 'text-nura-muted dark:text-white/40 hover:text-nura-petrol/60 dark:hover:text-white/60'
                    }`}
                >
                  <span className="relative z-10">{t.flowScore[tab]}</span>
                  {period === tab && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0 bg-nura-petrol/10 dark:bg-white/10 z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <input
                    className="invisible w-0"
                    name="period"
                    type="radio"
                    value={tab}
                    checked={period === tab}
                    onChange={() => setPeriod(tab)}
                  />
                </label>
              ))}
            </div>
          </div>
        </LayoutGroup>

        {/* Conditional Content Based on Period */}
        {period === 'day' ? (
          /* ——— DAY VIEW: Calorie Ring + Macros (original dashboard) ——— */
          <>
            <div className="flex flex-col items-center justify-center px-6 py-4">
              <div className="relative size-64">
                <svg className="circular-chart transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="circle-bg dark:stroke-[#18282e] stroke-gray-200 light-circle-bg" d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    className="circle"
                    strokeDasharray={`${caloriePercent}, 100`}
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-bold tracking-tighter text-nura-main dark:text-white">
                    {stats.consumedCalories.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-nura-muted dark:text-slate-400 mt-1">
                    / {stats.targetCalories.toLocaleString()} {t.dashboard.kcal}
                  </span>
                </div>
              </div>
            </div>

            {/* Motivational Text */}
            <div className="text-center space-y-2 mb-4 px-6">
              <h2 className="text-2xl font-bold tracking-tight text-nura-main dark:text-white">{t.dashboard.keepTheFlow}</h2>
              <p className="text-sm text-nura-muted dark:text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                {t.dashboard.fuelingPotential}
              </p>
            </div>

            {/* Macro Stats */}
            <div className="grid grid-cols-3 gap-3 w-full px-6">
              {/* Protein */}
              <div className="bg-white dark:bg-surface-dark rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-nura-border dark:border-transparent transition-colors duration-300">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wider">{t.dashboard.protein}</span>
                  <span className="text-[10px] text-nura-petrol dark:text-primary font-bold">
                    {Math.round((stats.macros.protein / stats.targetMacros.protein) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-nura-main dark:text-white">
                    {Math.round(stats.macros.protein)}
                    <span className="text-xs font-normal text-nura-muted dark:text-slate-500 ml-0.5">/{stats.targetMacros.protein}g</span>
                  </span>
                  <div className="h-1.5 w-full bg-nura-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-nura-petrol dark:bg-primary rounded-full" style={{ width: `${Math.min((stats.macros.protein / stats.targetMacros.protein) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Carbs */}
              <div className="bg-white dark:bg-surface-dark rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-nura-border dark:border-transparent transition-colors duration-300">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wider">{t.dashboard.carbs}</span>
                  <span className="text-[10px] text-orange-400 font-bold">
                    {Math.round((stats.macros.carbs / stats.targetMacros.carbs) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-nura-main dark:text-white">
                    {Math.round(stats.macros.carbs)}
                    <span className="text-xs font-normal text-nura-muted dark:text-slate-500 ml-0.5">/{stats.targetMacros.carbs}g</span>
                  </span>
                  <div className="h-1.5 w-full bg-nura-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min((stats.macros.carbs / stats.targetMacros.carbs) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Fats (pink instead of purple per P2 fix) */}
              <div className="bg-white dark:bg-surface-dark rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-nura-border dark:border-transparent transition-colors duration-300">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-wider">{t.dashboard.fats}</span>
                  <span className="text-[10px] text-pink-400 font-bold">
                    {Math.round((stats.macros.fats / stats.targetMacros.fats) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-nura-main dark:text-white">
                    {Math.round(stats.macros.fats)}
                    <span className="text-xs font-normal text-nura-muted dark:text-slate-500 ml-0.5">/{stats.targetMacros.fats}g</span>
                  </span>
                  <div className="h-1.5 w-full bg-nura-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-400 rounded-full" style={{ width: `${Math.min((stats.macros.fats / stats.targetMacros.fats) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ——— WEEK/MONTH VIEW: Flow Score + Weekly Rhythm (Stitch hero) ——— */
          <>
            {/* Flow Score Gauge */}
            <div className="flex flex-col items-center justify-center relative px-6 py-4">
              {/* Background Glow Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none dark:block hidden" />

              <div className="relative size-64 flex items-center justify-center">
                {/* SVG Gauge */}
                <svg className="size-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                    className="text-gray-200 dark:text-[#1f2f36]" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#0a90bd" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={gaugeOffset}
                    className="drop-shadow-[0_0_8px_rgba(10,144,189,0.8)] transition-all duration-1000" />
                  {/* Decorative inner ring */}
                  <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-nura-muted dark:text-white/50 text-sm font-medium tracking-widest uppercase mb-1">{t.flowScore.flowScore}</span>
                  <span className="text-6xl font-bold text-nura-main dark:text-white tracking-tighter" style={{ textShadow: isDarkMode ? '0 0 10px rgba(10, 144, 189, 0.5)' : 'none' }}>
                    {flowScore}
                  </span>
                  {scoreIsOptimized && (
                    <div className="mt-2 px-3 py-1 rounded-full bg-nura-petrol/10 dark:bg-primary/10 border border-nura-petrol/20 dark:border-primary/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[14px]">bolt</span>
                      <span className="text-nura-petrol dark:text-primary text-xs font-bold uppercase tracking-wide">{t.flowScore.optimized}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Insight Pill */}
              <div className="mt-4 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-nura-border dark:border-white/5 rounded-xl p-4 w-full max-w-sm flex items-start gap-3 transition-transform hover:scale-[1.02]">
                <div className="mt-0.5 size-5 shrink-0 rounded-full bg-nura-petrol/20 dark:bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[14px]">auto_graph</span>
                </div>
                <div className="flex-1">
                  <p className="text-nura-main dark:text-white text-sm font-medium leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: t.flowScore.insightText.replace(/<b>/g, '<span class="text-nura-petrol dark:text-primary font-bold">').replace(/<\/b>/g, '</span>') }}
                  />
                </div>
              </div>
            </div>

            {/* Weekly Rhythm Chart */}
            <div className="px-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-nura-main dark:text-white text-lg font-bold">{t.flowScore.weeklyRhythm}</h2>
                <button className="text-nura-muted dark:text-white/40 hover:text-nura-main dark:hover:text-white transition-colors">
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              </div>
              <div className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-nura-border dark:border-white/5 rounded-2xl p-5 w-full">
                <div className="flex items-end justify-between gap-4 mb-2">
                  <div>
                    <p className="text-nura-muted dark:text-white/40 text-xs font-medium uppercase tracking-wider">{t.flowScore.consistency}</p>
                    <p className="text-2xl font-bold text-nura-main dark:text-white">{consistency.label}</p>
                  </div>
                  <div className={`flex gap-1 items-center px-2 py-1 rounded-lg ${consistency.isPositive ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                    <span className={`material-symbols-outlined text-[16px] ${consistency.isPositive ? 'text-green-500 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
                      {consistency.isPositive ? 'trending_up' : 'trending_down'}
                    </span>
                    <span className={`text-xs font-bold ${consistency.isPositive ? 'text-green-500 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>{t.flowScore.steady}</span>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="w-full h-40 mt-4 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 350 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0a90bd" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0a90bd" stopOpacity="0" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1="150" x2="350" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="0" y1="75" x2="350" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                    {/* Area fill */}
                    <path d={chartPaths.area} fill="url(#gradient-fill)" />
                    {/* Line */}
                    <path d={chartPaths.line} fill="none" stroke="#0a90bd" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
                    {/* Current Point */}
                    {weeklyScores.length > 0 && (() => {
                      const lastScore = weeklyScores[weeklyScores.length - 1].score;
                      const cy = 150 - (lastScore / 100) * 140 - 5;
                      return <circle cx="350" cy={cy} r="4" fill="#fff" />;
                    })()}
                  </svg>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between mt-4 text-nura-muted dark:text-white/30 text-xs font-semibold uppercase px-1">
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>
              </div>
            </div>

            {/* Horizontal Scroll Metrics Cards */}
            <div className="flex flex-col gap-4">
              <div className="px-6 flex items-center justify-between">
                <h2 className="text-nura-main dark:text-white text-lg font-bold">{t.flowScore.metrics}</h2>
                <span className="text-nura-petrol dark:text-primary text-sm font-medium cursor-pointer">{t.flowScore.viewAll}</span>
              </div>
              <div className="flex overflow-x-auto px-6 pb-4 gap-4 no-scrollbar snap-x">
                {/* Hydration Card */}
                <div className="snap-start min-w-[160px] bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-nura-border dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl translate-x-4 translate-y-4" />
                  <div className="size-10 rounded-full bg-white dark:bg-surface-dark border border-nura-border dark:border-white/10 flex items-center justify-center text-blue-400">
                    <span className="material-symbols-outlined">water_drop</span>
                  </div>
                  <div>
                    <p className="text-nura-muted dark:text-white/50 text-xs font-medium mb-1">{t.flowScore.hydration}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-nura-main dark:text-white group-hover:text-blue-400 transition-colors">{waterIntakeL}</span>
                      <span className="text-sm text-nura-muted dark:text-white/60">L</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-1">
                    <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${waterPercent}%`, boxShadow: '0 0 8px rgba(96,165,250,0.5)' }} />
                  </div>
                </div>

                {/* Protein Card */}
                <div className="snap-start min-w-[160px] bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-nura-border dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl translate-x-4 translate-y-4" />
                  <div className="size-10 rounded-full bg-white dark:bg-surface-dark border border-nura-border dark:border-white/10 flex items-center justify-center text-orange-400">
                    <span className="material-symbols-outlined">egg</span>
                  </div>
                  <div>
                    <p className="text-nura-muted dark:text-white/50 text-xs font-medium mb-1">{t.dashboard.protein}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-nura-main dark:text-white group-hover:text-orange-400 transition-colors">
                        {Math.round(stats.macros.protein)}
                      </span>
                      <span className="text-sm text-nura-muted dark:text-white/60">g</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-1">
                    <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${proteinPercent}%`, boxShadow: '0 0 8px rgba(251,146,60,0.5)' }} />
                  </div>
                </div>

                {/* Energy Card */}
                <div className="snap-start min-w-[160px] bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-nura-border dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl translate-x-4 translate-y-4" />
                  <div className="size-10 rounded-full bg-white dark:bg-surface-dark border border-nura-border dark:border-white/10 flex items-center justify-center text-yellow-400">
                    <span className="material-symbols-outlined">local_fire_department</span>
                  </div>
                  <div>
                    <p className="text-nura-muted dark:text-white/50 text-xs font-medium mb-1">{t.flowScore.energy}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-nura-main dark:text-white group-hover:text-yellow-400 transition-colors">{(stats.consumedCalories / 1000).toFixed(1)}</span>
                      <span className="text-sm text-nura-muted dark:text-white/60">kCal</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-1">
                    <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${energyPercent}%`, boxShadow: '0 0 8px rgba(250,204,21,0.5)' }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="w-full mt-auto mb-6 flex flex-col gap-4 px-6">
          <div className="flex gap-4">
            <button
              onClick={onFabClick}
              className="flex-1 bg-nura-petrol dark:bg-primary hover:bg-nura-petrol/90 dark:hover:bg-primary/90 text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-nura-petrol/20 dark:shadow-primary/20 transition-all transform active:scale-[0.99]"
            >
              <span className="material-symbols-outlined">add_circle</span>
              {t.dashboard.logMeal}
            </button>
            <button
              onClick={() => onNavClick(AppView.HYDRATION)}
              className="w-14 bg-white dark:bg-surface-dark hover:bg-nura-petrol-light dark:hover:bg-white/5 text-nura-petrol dark:text-primary font-bold h-14 rounded-xl flex items-center justify-center shadow-lg shadow-black/5 transition-all transform active:scale-[0.99] border border-transparent dark:border-white/5"
            >
              <span className="material-symbols-outlined text-[24px]">water_drop</span>
            </button>
          </div>

          <button
            onClick={onShareClick}
            className="w-full bg-transparent hover:bg-white/40 dark:hover:bg-white/5 text-nura-muted dark:text-slate-400 font-semibold h-12 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
            {t.dashboard.shareMyDay}
          </button>
        </div>
      </main>
    </div>
  );
};