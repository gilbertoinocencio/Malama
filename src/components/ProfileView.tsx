import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { USER_AVATAR, LANGUAGES } from '../constants';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { GamificationService, GamificationStats } from '../services/gamificationService';
import { MealService } from '../services/mealService';
import { supabase } from '../services/supabase';
import { NotificationService } from '../services/notificationService';

interface ProfileViewProps {
  onNavClick: (view: AppView) => void;
  onSettingsClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

interface HeatmapDay {
  date: string;
  score: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavClick,
  onSettingsClick,
  isDarkMode,
  onToggleTheme
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { profile, user, signOut } = useAuth();

  const [gamification, setGamification] = useState<GamificationStats | null>(null);
  const [totalMeals, setTotalMeals] = useState(0);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfileStats();
  }, [user]);

  const loadProfileStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) Gamification stats (streak, flow days, level)
      const stats = await GamificationService.updateStats(user.id);
      if (stats) setGamification(stats);

      // 2) Total meals ever logged
      const { count } = await supabase
        .from('meals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalMeals(count || 0);

      // 3) Heatmap: last 84 days (12 weeks)
      const since = new Date();
      since.setDate(since.getDate() - 84);
      const { data: flowData } = await supabase
        .from('flow_stats')
        .select('date, flow_score')
        .eq('user_id', user.id)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });

      setHeatmapData(
        (flowData || []).map((r: any) => ({ date: r.date, score: r.flow_score }))
      );
    } catch (e) {
      console.error('Error loading profile stats:', e);
    } finally {
      setLoading(false);
    }
  };

  // Calculate consistency: flow days / total tracked days
  const consistencyPercent = gamification
    ? Math.min(Math.round((gamification.totalFlowDays / Math.max(heatmapData.length, 1)) * 100), 100)
    : 0;

  // Real heatmap from flow_stats (12 cols × 7 rows)
  const renderHeatmap = () => {
    const cols = 12;
    const rows = 7;
    const totalCells = cols * rows;
    const today = new Date();
    const grid = [];

    for (let c = 0; c < cols; c++) {
      const colCells = [];
      for (let r = 0; r < rows; r++) {
        const dayIndex = c * rows + r;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (totalCells - 1 - dayIndex));
        const dateStr = targetDate.toISOString().split('T')[0];

        const entry = heatmapData.find(d => d.date === dateStr);
        const score = entry?.score || 0;

        let intensity = 'bg-nura-pastel-orange dark:bg-gray-700';
        if (score >= 85) intensity = 'bg-nura-petrol dark:bg-primary';
        else if (score >= 70) intensity = 'bg-nura-petrol/80 dark:bg-primary/80';
        else if (score >= 50) intensity = 'bg-nura-petrol/60 dark:bg-primary/60';
        else if (score >= 30) intensity = 'bg-nura-petrol/40 dark:bg-primary/40';
        else if (score > 0) intensity = 'bg-nura-petrol/20 dark:bg-primary/20';

        colCells.push(
          <div key={`${c}-${r}`} className={`w-3 h-3 rounded-[2px] ${intensity}`}></div>
        );
      }
      grid.push(
        <div key={c} className="flex flex-col gap-1.5">
          {colCells}
        </div>
      );
    }
    return grid;
  };

  // Achievements based on real gamification data
  const getAchievements = () => {
    const achievements = [];

    if (gamification) {
      if (gamification.currentStreak >= 3) {
        achievements.push({
          icon: 'local_fire_department',
          color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
          title: `🔥 ${gamification.currentStreak}-Day Streak`,
          subtitle: `${gamification.currentStreak} ${t.quarterlyPlan.days} in Flow`,
        });
      }

      if (gamification.totalFlowDays >= 7) {
        achievements.push({
          icon: 'eco',
          color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
          title: 'Green Flow',
          subtitle: `${gamification.totalFlowDays} ${t.profile.flowDays}`,
        });
      }

      const levelMap: Record<string, { icon: string; color: string; title: string }> = {
        seed: { icon: 'spa', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400', title: '🌱 Seed' },
        root: { icon: 'nest_eco_leaf', color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', title: '🌿 Root' },
        stem: { icon: 'forest', color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400', title: '🌾 Stem' },
        flower: { icon: 'local_florist', color: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400', title: '🌸 Flower' },
        fruit: { icon: 'nutrition', color: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400', title: '🍎 Fruit' },
      };

      const lvl = levelMap[gamification.level] || levelMap.seed;
      achievements.push({
        icon: lvl.icon,
        color: lvl.color,
        title: `Level: ${lvl.title}`,
        subtitle: `${gamification.totalFlowDays} ${t.profile.flowDays}`,
      });
    }

    if (totalMeals >= 10) {
      achievements.push({
        icon: 'restaurant_menu',
        color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        title: 'Meal Master',
        subtitle: `${totalMeals} ${t.profile.meals}`,
      });
    }

    return achievements;
  };

  const achievements = getAchievements();

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white animate-fade-in transition-colors duration-300">

      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-12 pb-2">
        <h2 className="text-3xl font-serif italic text-nura-main dark:text-white flex-1">{t.profile.title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-nura-main dark:text-white" style={{ fontSize: '24px' }}>
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-nura-main dark:text-white" style={{ fontSize: '24px' }}>settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        {/* Profile Info */}
        <section className="flex flex-col items-center pt-6 pb-8 px-4">
          <div className="relative mb-4">
            <div
              className="bg-center bg-no-repeat bg-cover aspect-square rounded-full h-28 w-28 ring-4 ring-white dark:ring-[#1a2630] shadow-sm transition-all"
              style={{ backgroundImage: `url("${profile?.avatar_url || USER_AVATAR}")` }}
            >
            </div>
            <div className="absolute bottom-1 right-1 bg-nura-petrol dark:bg-primary text-white rounded-full p-1 border-2 border-white dark:border-[#101a22]">
              <span className="material-symbols-outlined block text-[16px] leading-none">check</span>
            </div>
          </div>
          <h1 className="text-nura-main dark:text-white text-2xl font-bold leading-tight tracking-tight text-center">
            {profile?.display_name || t.dashboard.defaultUser}
          </h1>
          <p className="text-nura-muted dark:text-gray-400 text-sm font-medium mt-1">
            {profile?.goal ? t.profile.goals[profile.goal as keyof typeof t.profile.goals] : t.profile.defineProfile}
          </p>
        </section>

        {/* Language Selector */}
        <section className="w-full px-6 mb-6">
          <div className="bg-white dark:bg-[#1a2630] rounded-2xl p-4 shadow-sm border border-nura-border dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-nura-petrol dark:text-primary">translate</span>
                <span className="text-sm font-bold text-nura-main dark:text-white">{t.profile.language}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as 'en' | 'pt' | 'es')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${language === lang.code
                    ? 'bg-nura-petrol dark:bg-primary text-white shadow-md'
                    : 'bg-nura-bg dark:bg-white/5 text-nura-muted dark:text-gray-400 hover:bg-nura-petrol/10 dark:hover:bg-primary/10'
                    }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications Toggle */}
        <section className="w-full px-6 mb-8">
          <div className="bg-white dark:bg-[#1a2630] rounded-2xl p-4 shadow-sm border border-nura-border dark:border-gray-800 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary">notifications</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-nura-main dark:text-white">{t.profile.notifications}</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">
                  {NotificationService.isEnabled() ? t.profile.high : t.profile.low}
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                if (NotificationService.isEnabled()) {
                  NotificationService.disable();
                  window.location.reload();
                } else {
                  const granted = await NotificationService.requestPermission();
                  if (granted) window.location.reload();
                }
              }}
              className={`w-12 h-7 rounded-full transition-colors relative ${NotificationService.isEnabled() ? 'bg-nura-petrol dark:bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${NotificationService.isEnabled() ? 'translate-x-5' : ''}`}></div>
            </button>
          </div>
        </section>

        {/* Heatmap Section */}
        <section className="w-full px-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-nura-main dark:text-white text-lg font-bold leading-tight">{t.profile.flowStatus}</h3>
            <span className="text-nura-petrol dark:text-primary text-xs font-semibold uppercase tracking-wider">{t.profile.last3Months}</span>
          </div>
          <div className="bg-white dark:bg-[#1a2630] p-5 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 overflow-x-auto no-scrollbar transition-colors">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nura-petrol dark:border-primary"></div>
              </div>
            ) : (
              <>
                <div className="flex gap-1 min-w-fit">
                  {/* Grid */}
                  <div className="flex gap-1.5 h-[100px]">
                    {renderHeatmap()}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <span className="text-[10px] text-nura-muted dark:text-gray-400 font-medium">{t.profile.low}</span>
                  <div className="w-2 h-2 rounded-[1px] bg-nura-pastel-orange dark:bg-gray-700"></div>
                  <div className="w-2 h-2 rounded-[1px] bg-nura-petrol/40 dark:bg-primary/40"></div>
                  <div className="w-2 h-2 rounded-[1px] bg-nura-petrol dark:bg-primary"></div>
                  <span className="text-[10px] text-nura-muted dark:text-gray-400 font-medium">{t.profile.high}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full px-6 mb-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1a2630] rounded-xl shadow-sm border border-nura-border dark:border-gray-800 h-28 transition-colors">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-2" style={{ fontSize: '24px' }}>calendar_today</span>
              <p className="text-2xl font-bold text-nura-main dark:text-white leading-none">
                {loading ? '—' : gamification?.totalFlowDays || 0}
              </p>
              <p className="text-xs text-center text-nura-muted dark:text-gray-400 mt-1 font-medium">{t.profile.flowDays}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1a2630] rounded-xl shadow-sm border border-nura-border dark:border-gray-800 h-28 transition-colors">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-2" style={{ fontSize: '24px' }}>restaurant_menu</span>
              <p className="text-2xl font-bold text-nura-main dark:text-white leading-none">
                {loading ? '—' : totalMeals}
              </p>
              <p className="text-xs text-center text-nura-muted dark:text-gray-400 mt-1 font-medium">{t.profile.meals}</p>
            </div>
            <div
              onClick={() => onNavClick(AppView.QUARTERLY_ANALYSIS)}
              className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1a2630] rounded-xl shadow-sm border border-nura-border dark:border-gray-800 h-28 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-1 right-1">
                <span className="material-symbols-outlined text-gray-300 text-xs">arrow_outward</span>
              </div>
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-2" style={{ fontSize: '24px' }}>trending_up</span>
              <p className="text-2xl font-bold text-nura-main dark:text-white leading-none">
                {loading ? '—' : `${consistencyPercent}%`}
              </p>
              <p className="text-xs text-center text-nura-muted dark:text-gray-400 mt-1 font-medium">{t.profile.consistency}</p>
            </div>
          </div>
        </section>

        {/* Quick Actions / Integration */}
        <section className="w-full px-6 mb-8">
          <div
            onClick={() => onNavClick(AppView.INTEGRATIONS)}
            className="w-full bg-gradient-to-r from-nura-petrol/5 to-transparent dark:from-primary/20 dark:to-transparent rounded-2xl p-4 flex items-center justify-between border border-nura-petrol/10 dark:border-primary/20 cursor-pointer hover:bg-nura-petrol/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-nura-petrol dark:text-primary shadow-sm border border-nura-border dark:border-transparent">
                <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-nura-main dark:text-white">{t.profile.integrations}</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Strava, Apple Health, Garmin...</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>
        </section>

        {/* Achievements Section */}
        <section className="w-full px-6 mb-8">
          <h3 className="text-nura-main dark:text-white text-lg font-bold leading-tight mb-4">{t.profile.recentAchievements}</h3>
          <div className="flex flex-col gap-3">
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-nura-muted dark:text-gray-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl">emoji_events</span>
                <span className="text-sm">{t.quarterlyPlan.noData}</span>
              </div>
            ) : (
              achievements.map((ach, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a2630] rounded-xl border border-nura-border dark:border-gray-800 transition-colors shadow-sm dark:shadow-none">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${ach.color}`}>
                    <span className="material-symbols-outlined">{ach.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-nura-main dark:text-white">{ach.title}</h4>
                    <p className="text-sm text-nura-muted dark:text-gray-400">{ach.subtitle}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Sign Out */}
        <section className="w-full px-6 pb-4">
          <button
            onClick={() => signOut()}
            className="w-full py-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {t.profile.signOut}
          </button>
        </section>
      </main>
    </div>
  );
};