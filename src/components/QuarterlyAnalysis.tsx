import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { GamificationService, GamificationStats } from '../services/gamificationService';
import { StatsService } from '../services/statsService';
import { supabase } from '../services/supabase';

interface QuarterlyAnalysisProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const QuarterlyAnalysis: React.FC<QuarterlyAnalysisProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [gamification, setGamification] = useState<GamificationStats | null>(null);
  const [flowScore, setFlowScore] = useState(0);
  const [totalMeals, setTotalMeals] = useState(0);
  const [loading, setLoading] = useState(true);

  const qa = t.quarterlyAnalysis;

  useEffect(() => {
    if (user) loadAnalysis();
  }, [user]);

  const loadAnalysis = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [stats, gamStats] = await Promise.all([
        StatsService.getDailyStats(user.id),
        GamificationService.updateStats(user.id),
      ]);
      setFlowScore(stats.flowScore);
      if (gamStats) setGamification(gamStats);

      const { count } = await supabase
        .from('meals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalMeals(count || 0);
    } catch (e) {
      console.error('Error loading analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  const consistencyPercent = gamification
    ? Math.min(Math.round((gamification.totalFlowDays / Math.max(gamification.totalFlowDays + 5, 1)) * 100), 99)
    : 0;

  // Macros hit rate = approximation from flow score
  const macrosHitPercent = Math.max(flowScore - 2, 0);

  // Dynamic quarter dates
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  const monthNameShort = (d: Date) => d.toLocaleString('default', { month: 'short' }).replace('.', '');
  const dateRange = `${monthNameShort(quarterStart)} — ${monthNameShort(quarterEnd)} ${now.getFullYear()}`;

  // Level badge
  const levelMap: Record<string, { title: string; icon: string }> = {
    seed: { title: '🌱 Seed', icon: 'spa' },
    root: { title: '🌿 Root', icon: 'nest_eco_leaf' },
    stem: { title: '🌾 Stem', icon: 'forest' },
    flower: { title: '🌸 Flower', icon: 'local_florist' },
    fruit: { title: '🍎 Fruit', icon: 'nutrition' },
  };
  const currentLevel = levelMap[gamification?.level || 'seed'] || levelMap.seed;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-nura-bg dark:bg-background-dark font-display animate-fade-in text-nura-main dark:text-white transition-colors duration-500">

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors duration-300">
        <button
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-nura-main dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xs font-bold uppercase tracking-widest text-nura-muted dark:text-gray-400">{qa.title}</h1>
        <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-nura-main dark:text-white">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nura-petrol dark:border-primary"></div>
        </div>
      ) : (
        <main className="flex-1 flex flex-col px-6 pb-36 pt-2">

          {/* Title Block */}
          <div className="flex flex-col items-center mb-8 animate-fade-in-up">
            <h2 className="text-4xl font-light text-nura-petrol dark:text-white tracking-tight text-center">
              90 {qa.daysOfFlow.split(' ').slice(0, 1)} <span className="font-serif italic text-nura-main dark:text-gray-200">{qa.daysOfFlow.split(' ').slice(-1)}</span>
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-px w-6 bg-gray-300 dark:bg-gray-700"></span>
              <p className="text-nura-muted dark:text-gray-400 text-xs font-semibold tracking-wider uppercase">{dateRange}</p>
              <span className="h-px w-6 bg-gray-300 dark:bg-gray-700"></span>
            </div>
          </div>

          {/* Body Evolution Chart Card */}
          <div className="animate-fade-in-up bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-nura-border dark:border-gray-800 mb-8 relative" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="block text-[10px] font-bold text-nura-muted uppercase tracking-widest mb-1">{qa.bodyEvolution}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif text-nura-main dark:text-white">{totalMeals}</span>
                  <span className="text-sm font-medium text-nura-muted">{t.profile.meals.toLowerCase()}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <button
                  onClick={() => onNavigate(AppView.VISUAL_EVOLUTION)}
                  className="flex items-center gap-1.5 text-nura-petrol dark:text-primary bg-nura-petrol/5 hover:bg-nura-petrol/10 dark:bg-primary/10 px-3 py-1.5 rounded-full transition-colors mb-2"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  <span className="text-[10px] font-bold uppercase">{qa.viewPhotos}</span>
                </button>
                <div className="flex items-center gap-1 text-nura-petrol dark:text-primary">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span className="text-xs font-bold">{gamification?.currentStreak || 0} {t.quarterlyPlan.streak}</span>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="w-full h-40 relative">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 150">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.15"></stop>
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                <path
                  className="opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards] text-nura-petrol dark:text-primary"
                  d={`M0,150 L0,${130 - consistencyPercent} C75,${120 - consistencyPercent * 0.8} 150,${100 - macrosHitPercent * 0.7} 225,${80 - flowScore * 0.5} L300,${70 - flowScore * 0.4} L300,150 Z`}
                  fill="url(#chartGradient)"
                ></path>
                <path
                  className="chart-path text-nura-petrol dark:text-primary"
                  d={`M0,${130 - consistencyPercent} C75,${120 - consistencyPercent * 0.8} 150,${100 - macrosHitPercent * 0.7} 225,${80 - flowScore * 0.5} L300,${70 - flowScore * 0.4}`}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                ></path>
                <g className="opacity-0 animate-[fadeIn_0.5s_ease-out_1.5s_forwards]">
                  <circle cx="0" cy={130 - consistencyPercent} fill="#fff" r="3" stroke="currentColor" strokeWidth="2" className="text-nura-petrol dark:text-primary"></circle>
                  <circle cx="150" cy={100 - macrosHitPercent * 0.7} fill="#fff" r="3" stroke="currentColor" strokeWidth="2" className="text-nura-petrol dark:text-primary"></circle>
                  <circle cx="300" cy={70 - flowScore * 0.4} fill="currentColor" r="4" stroke="#fff" strokeWidth="2" className="text-nura-petrol dark:text-primary shadow-md"></circle>
                </g>
              </svg>
              <div className="flex justify-between mt-3 text-[10px] text-nura-muted dark:text-gray-400 uppercase font-bold tracking-wide">
                <span>{monthNameShort(quarterStart)}</span>
                <span>{monthNameShort(new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 1, 1))}</span>
                <span>{monthNameShort(quarterEnd)}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 flex flex-col justify-between h-36 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-4xl text-nura-petrol dark:text-primary">calendar_month</span>
              </div>
              <div className="size-10 rounded-full bg-nura-bg dark:bg-gray-800 border border-nura-border dark:border-gray-700 flex items-center justify-center text-nura-petrol dark:text-primary mb-2">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
              <div>
                <span className="text-3xl font-display font-semibold text-nura-main dark:text-white">{consistencyPercent}%</span>
                <p className="text-xs font-medium text-nura-muted mt-1">{qa.consistencyPercent}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 flex flex-col justify-between h-36 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-4xl text-nura-petrol dark:text-primary">data_usage</span>
              </div>
              <div className="size-10 rounded-full bg-nura-bg dark:bg-gray-800 border border-nura-border dark:border-gray-700 flex items-center justify-center text-nura-petrol dark:text-primary mb-2">
                <span className="material-symbols-outlined text-xl">pie_chart</span>
              </div>
              <div>
                <span className="text-3xl font-display font-semibold text-nura-main dark:text-white">{macrosHitPercent}%</span>
                <p className="text-xs font-medium text-nura-muted mt-1">{qa.macrosHit}</p>
              </div>
            </div>
          </div>

          {/* Badge Card */}
          <div className="animate-fade-in-up bg-nura-petrol dark:bg-primary rounded-2xl p-6 shadow-xl shadow-nura-petrol/20 dark:shadow-primary/20 mb-8 relative overflow-hidden group" style={{ animationDelay: '0.3s' }}>
            <div className="absolute -right-10 -top-10 size-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
            <div className="relative z-10 flex items-center gap-5">
              <div className="size-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
                <span className="material-symbols-outlined text-white text-3xl filled" style={{ fontVariationSettings: "'FILL' 1" }}>{currentLevel.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">{qa.evolutionBadge}</p>
                <h3 className="text-white font-serif text-xl italic tracking-wide">{currentLevel.title}</h3>
                <p className="text-white/80 text-xs mt-1 font-light">{gamification?.totalFlowDays || 0} {t.profile.flowDays}</p>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="mb-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-xl animate-pulse">auto_awesome</span>
              <h3 className="text-nura-main dark:text-white font-medium text-sm uppercase tracking-wide">{qa.aiInsights}</h3>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-surface-dark dark:to-background-dark rounded-2xl p-6 border border-nura-border dark:border-gray-700 shadow-sm relative">
              <span className="absolute top-4 right-4 text-gray-200 dark:text-gray-700">
                <span className="material-symbols-outlined">format_quote</span>
              </span>
              <p className="relative z-10 text-nura-main dark:text-gray-300 text-sm leading-relaxed font-medium">
                {flowScore >= 70
                  ? <>{t.quarterlyPlan.onTrack} <span className="text-nura-petrol dark:text-primary font-bold">{flowScore}% Flow Score</span>.</>
                  : <>Your flow score is at <span className="text-nura-petrol dark:text-primary font-bold">{flowScore}%</span>. Keep logging meals consistently to boost your metrics.</>
                }
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div className="h-0.5 w-8 bg-nura-petrol/30 dark:bg-primary/30 rounded-full"></div>
                <span className="text-[10px] font-bold text-nura-muted uppercase tracking-widest">Nura Intelligence</span>
              </div>
            </div>
          </div>

        </main>
      )}

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-nura-bg via-nura-bg to-transparent dark:from-background-dark dark:via-background-dark pt-12 pb-8 px-6 pointer-events-none flex justify-center z-40">
        <div className="w-full max-w-md pointer-events-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => onNavigate(AppView.PLAN_RENEWAL)}
            className="w-full bg-nura-petrol hover:brightness-110 dark:bg-primary dark:hover:brightness-110 text-white font-semibold text-base py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] group"
          >
            <span>{qa.newPlanCta}</span>
            <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};