import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { DailyStats, AppView, Meal, MonthWeek, MonthSummary } from '../types';
import { USER_AVATAR } from '../constants';
import { useLanguage } from '../i18n';
import { GamificationService, GamificationStats } from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Confetti } from './Confetti';
import { TodayMissionsCard } from './TodayMissionsCard';
import { DailyCheckinModal } from './DailyCheckinModal';
import { DailyMealsList } from './DailyMealsList';
import { getLocalDateString } from '../utils/dateUtils';
import { getTodayConsultation, getDoctorMessage, getLatestGoalAdjustment } from '../lib/scheduling';
import { creditService } from '../services/billingService';
import { GLP1Section } from './GLP1Section';
import { WeekDaysCircle } from './WeekDaysCircle';
import { MonthWeeksGrid } from './MonthWeeksGrid';
import { StatsService } from '../services/statsService';
import { MealService } from '../services/mealService';

interface FlowDashboardProps {
  stats: DailyStats;
  meals: Meal[];
  onFabClick: () => void;
  onShareClick: () => void;
  onNavClick: (view: AppView) => void;
  onDeleteMeal?: (id: string) => void;
  onEditMeal?: (meal: Meal) => void;
  activeView: AppView;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type PeriodTab = 'day' | 'week' | 'month';

export const FlowDashboard: React.FC<FlowDashboardProps> = ({
  stats,
  meals,
  onFabClick,
  onShareClick,
  onNavClick,
  onDeleteMeal,
  onEditMeal,
  activeView,
  isDarkMode,
  onToggleTheme
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<PeriodTab>('day');
  const [gameStats, setGameStats] = useState<GamificationStats | null>(null);
  // Water comes from stats prop (fetched by getDailyStats) — always fresh on HOME view
  const waterIntake = stats.waterIntake ?? 0;
  const waterGoalState = stats.waterGoal ?? 0;
  const [weeklyScores, setWeeklyScores] = useState<{ date: string, score: number }[]>([]);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showMicros, setShowMicros] = useState(false);
  const [weeklyMetrics, setWeeklyMetrics] = useState<{
    avgCalories: number;
    avgProtein: number;
    avgWaterMl: number;
    daysLogged: number;
  } | null>(null);
  type InsightData = { consistencyChange: number | null; peakHour: number | null };
  const [insightData, setInsightData] = useState<InsightData>({ consistencyChange: null, peakHour: null });

  // Week view state
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(null);
  const [selectedDayMeals, setSelectedDayMeals] = useState<Meal[]>([]);
  const [weekDaysData, setWeekDaysData] = useState<any[]>([]);

  // Month view state
  const [monthWeeksData, setMonthWeeksData] = useState<MonthWeek[]>([]);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  // Telemedicine state
  const [todayConsultation, setTodayConsultation] = useState<any>(null);
  const [doctorMsg, setDoctorMsg] = useState<any>(null);
  const [goalAdjustment, setGoalAdjustment] = useState<any>(null);
  const [goalsToast, setGoalsToast] = useState<{ calorie_goal?: number; protein_goal?: number; doctor_name?: string } | null>(null);
  const [hasAvailableCredit, setHasAvailableCredit] = useState(false);

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

  // Load telemedicine data
  useEffect(() => {
    if (!user) return;
    getTodayConsultation(user.id).then(setTodayConsultation).catch(() => { });
    getDoctorMessage(user.id).then(setDoctorMsg).catch(() => { });
    getLatestGoalAdjustment(user.id).then(setGoalAdjustment).catch(() => { });
    creditService.getAvailableForUser(user.id)
      .then(credits => setHasAvailableCredit(credits.length > 0))
      .catch(() => { });
  }, [user]);

  // Realtime goals sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`patient:${user.id}`)
      .on('broadcast', { event: 'goals_updated' }, ({ payload }) => {
        setGoalsToast(payload);
        setTimeout(() => setGoalsToast(null), 6000);
        getLatestGoalAdjustment(user.id).then(setGoalAdjustment).catch(() => { });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWeeklyScores();
    }
  }, [user]);

  const loadWeeklyScores = async () => {
    if (!user) return;
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    const { data } = await supabase
      .from('flow_stats')
      .select('date, flow_score')
      .eq('user_id', user.id)
      .gte('date', getLocalDateString(fourteenDaysAgo))
      .order('date', { ascending: true });

    if (!data) return;

    const allScores = data.map(d => ({ date: d.date, score: d.flow_score || 0 }));
    // Last 7 days for the chart
    setWeeklyScores(allScores.slice(-7));

    // Consistency change: current week avg vs previous week avg
    const prevWeek = allScores.slice(0, 7);
    const currWeek = allScores.slice(-7);
    const avg = (arr: typeof allScores) =>
      arr.length > 0 ? arr.reduce((s, d) => s + d.score, 0) / arr.length : 0;
    const prevAvg = avg(prevWeek);
    const currAvg = avg(currWeek);
    const consistencyChange = prevAvg > 0
      ? Math.round(((currAvg - prevAvg) / prevAvg) * 100)
      : null;

    setInsightData((d: InsightData) => ({ ...d, consistencyChange }));
  };

  const loadWeeklyMetrics = async () => {
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startOfWeek = new Date(sevenDaysAgo);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [{ data: weekMeals }, { data: waterLogs }] = await Promise.all([
      supabase
        .from('meals')
        .select('calories, protein, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfToday.toISOString()),
      supabase
        .from('daily_logs')
        .select('water_intake, date')
        .eq('user_id', user.id)
        .gte('date', getLocalDateString(sevenDaysAgo)),
    ]);

    const daysWithMeals = new Set((weekMeals || []).map(m => getLocalDateString(new Date(m.created_at)))).size;
    const daysLogged = Math.max(daysWithMeals, 1);
    const totalCalories = (weekMeals || []).reduce((s, m) => s + (m.calories || 0), 0);
    const totalProtein = (weekMeals || []).reduce((s, m) => s + (m.protein || 0), 0);
    const totalWater = (waterLogs || []).reduce((s, l) => s + (l.water_intake || 0), 0);
    const waterDays = Math.max((waterLogs || []).length, 1);

    setWeeklyMetrics({
      avgCalories: Math.round(totalCalories / daysLogged),
      avgProtein: Math.round(totalProtein / daysLogged),
      avgWaterMl: Math.round(totalWater / waterDays),
      daysLogged: daysWithMeals,
    });

    // Peak flow hour: hour with most meal registrations in the last 7 days
    const hourCount = new Map<number, number>();
    (weekMeals || []).forEach(m => {
      const h = new Date(m.created_at).getHours();
      hourCount.set(h, (hourCount.get(h) || 0) + 1);
    });
    const peakHour = hourCount.size > 0
      ? [...hourCount.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0]
      : null;
    setInsightData((d: InsightData) => ({ ...d, peakHour }));
  };

  useEffect(() => {
    if (user && period === 'week') {
      loadWeeklyMetrics();
    }
    if (user && period === 'month') {
      loadMonthData();
    }
  }, [user, period]);

  // Load week data always (needed for day view circles + weekly ring)
  useEffect(() => {
    if (user) {
      loadWeekData();
    }
  }, [user]);

  const loadWeekData = async () => {
    if (!user) return;

    try {
      const weekStats = await StatsService.getWeekStats(user.id);
      setWeekDaysData(weekStats);

      // Calculate weekly accumulated stats
      const today = getLocalDateString(new Date());
      const daysElapsed = weekStats.findIndex(d => d.date === today) + 1;

      let weeklyAccumulated = {
        consumedCalories: 0,
        targetCalories: 0,
        protein: 0,
        targetProtein: 0,
        carbs: 0,
        targetCarbs: 0,
        fats: 0,
        targetFats: 0,
        waterIntake: 0,
        waterGoal: 0,
      };

      for (let i = 0; i < daysElapsed; i++) {
        const day = weekStats[i];
        weeklyAccumulated.consumedCalories += day.stats.consumedCalories;
        weeklyAccumulated.targetCalories += day.stats.targetCalories;
        weeklyAccumulated.protein += day.stats.macros.protein;
        weeklyAccumulated.targetProtein += day.stats.targetMacros.protein;
        weeklyAccumulated.carbs += day.stats.macros.carbs;
        weeklyAccumulated.targetCarbs += day.stats.targetMacros.carbs;
        weeklyAccumulated.fats += day.stats.macros.fats;
        weeklyAccumulated.targetFats += day.stats.targetMacros.fats;
        weeklyAccumulated.waterIntake += day.stats.waterIntake || 0;
        weeklyAccumulated.waterGoal += day.stats.waterGoal || 0;
      }

      setSelectedDayStats({
        consumedCalories: weeklyAccumulated.consumedCalories,
        targetCalories: weeklyAccumulated.targetCalories,
        macros: {
          protein: weeklyAccumulated.protein,
          carbs: weeklyAccumulated.carbs,
          fats: weeklyAccumulated.fats,
        },
        targetMacros: {
          protein: weeklyAccumulated.targetProtein,
          carbs: weeklyAccumulated.targetCarbs,
          fats: weeklyAccumulated.targetFats,
        },
        waterIntake: weeklyAccumulated.waterIntake,
        waterGoal: weeklyAccumulated.waterGoal,
      } as DailyStats);

      // Get all meals from the week so far using MealService (local-timezone aware)
      const allWeekMeals: Meal[] = [];
      for (let i = 0; i < daysElapsed; i++) {
        const dateStr = weekStats[i].date;
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayMeals = await MealService.getMeals(user.id, dateObj);
        allWeekMeals.push(...dayMeals);
      }

      // Sort by timestamp descending (most recent first)
      allWeekMeals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setSelectedDayMeals(allWeekMeals);

    } catch (error) {
      console.error('Error loading week data:', error);
    }
  };

  // Flow score calculated from consumed vs target (demo)
  const flowScore = stats.flowScore ?? 0;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (flowScore >= 80) {
      setShowConfetti(true);
    }
  }, [flowScore]);

  // SVG gauge calculations
  const circumference = 2 * Math.PI * 42;

  // Calorie progress for Day view - ALLOW values over 100% for multiple rotations
  const calorieRatio = (stats.consumedCalories ?? 0) / (stats.targetCalories || 1);
  const caloriePercent = calorieRatio * 100; // No Math.min - allow >100%
  const isOverTarget = calorieRatio > 1;
  const isWayOverTarget = calorieRatio > 1.5;

  // Dynamic color based on progress
  const getCalorieColor = () => {
    if (isWayOverTarget) return '#ef4444'; // Red when >150%
    if (isOverTarget) return '#f59e0b'; // Orange when >100%
    return '#722F37'; // Bordeaux when <100%
  };

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
  const weeklyAvgScore = weeklyScores.length > 0
    ? Math.round(weeklyScores.reduce((s, d) => s + d.score, 0) / weeklyScores.length)
    : flowScore;
  const displayedScore = period === 'week' ? weeklyAvgScore : flowScore;
  const displayName = profile?.display_name || user?.email?.split('@')[0] || t.dashboard.defaultUser;

  // Use profile level as fallback if gameStats is not yet loaded
  const currentLevel = gameStats?.level || profile?.level || 'seed';
  const currentStreak = gameStats?.currentStreak || profile?.current_streak || 0;

  // Prepare week days data for WeekDaysCircle component
  const weekDaysForCircle = React.useMemo(() => {
    if (weekDaysData.length === 0) return [];

    const today = getLocalDateString(new Date());
    const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return weekDaysData.map(day => {
      const date = new Date(day.date + 'T00:00:00');
      const dayName = DAY_NAMES_PT[date.getDay()];
      const isToday = day.date === today;
      const isFuture = day.date > today;
      const isSelected = day.date === selectedDate;

      return {
        date: day.date,
        dayName,
        dayNumber: date.getDate(),
        stats: day.stats,
        meals: day.meals,
        isToday,
        isSelected,
        isFuture,
      };
    });
  }, [weekDaysData, selectedDate]);

  const [isDaySelected, setIsDaySelected] = useState(false);

  // Helper to check if a day met all macros + hydration goals (85% threshold)
  const checkDayGoal = (dayStats: DailyStats | null): boolean => {
    if (!dayStats) return false;
    const calRatio = dayStats.consumedCalories / (dayStats.targetCalories || 1);
    const pRatio = dayStats.macros.protein / (dayStats.targetMacros.protein || 1);
    const cRatio = dayStats.macros.carbs / (dayStats.targetMacros.carbs || 1);
    const fRatio = dayStats.macros.fats / (dayStats.targetMacros.fats || 1);
    const wRatio = (dayStats.waterIntake || 0) / (dayStats.waterGoal || 1);
    return calRatio >= 0.85 && pRatio >= 0.85 && cRatio >= 0.85 && fRatio >= 0.85 && wRatio >= 0.85;
  };

  // Weekly progress with carryover: missed goals from past days accumulate into the weekly target
  const weeklyProgress = React.useMemo(() => {
    if (!weekDaysData.length) return null;
    const today = getLocalDateString(new Date());
    const todayIdx = weekDaysData.findIndex((d: any) => d.date === today);
    if (todayIdx === -1) return null;

    let totalConsumed = 0;
    let totalTarget = 0;
    let daysMetGoal = 0;
    let pastDeficit = 0; // calories missed from previous days

    weekDaysData.forEach((day: any, i: number) => {
      totalTarget += day.stats.targetCalories;
      if (i <= todayIdx) {
        totalConsumed += day.stats.consumedCalories;
        const deficit = day.stats.targetCalories - day.stats.consumedCalories;
        if (i < todayIdx && deficit > 0) pastDeficit += deficit;
        if (checkDayGoal(day.stats)) daysMetGoal++;
      }
    });

    const progress = totalTarget > 0 ? Math.min(totalConsumed / totalTarget, 1) : 0;
    const weeklyRemaining = Math.max(0, totalTarget - totalConsumed);
    const todayEffectiveTarget = stats.targetCalories + pastDeficit;
    const todayRemaining = Math.max(0, todayEffectiveTarget - (stats.consumedCalories ?? 0));

    return {
      totalConsumed,
      totalTarget,
      progress,
      weeklyRemaining,
      daysMetGoal,
      daysElapsed: todayIdx + 1,
      pastDeficit,
      todayEffectiveTarget,
      todayRemaining,
    };
  }, [weekDaysData, stats]);

  // Day-view day click: selects a specific day to view historical data
  const handleDayViewClick = (date: string) => {
    const today = getLocalDateString(new Date());
    if (date === today || selectedDate === date) {
      // Back to today
      setSelectedDate(today);
      setIsDaySelected(false);
      setSelectedDayStats(null);
      setSelectedDayMeals([]);
      return;
    }
    setSelectedDate(date);
    setIsDaySelected(true);
    const day = weekDaysData.find((d: any) => d.date === date);
    if (day) {
      setSelectedDayStats(day.stats);
      const mapped: Meal[] = day.meals.map((item: any) => ({
        id: item.id,
        name: item.name,
        timestamp: new Date(item.created_at),
        calories: item.calories,
        macros: { protein: item.protein, carbs: item.carbs, fats: item.fats },
        type: item.type,
        items: item.items,
        imageUri: item.image_url,
      }));
      setSelectedDayMeals(mapped);
    }
  };

  const handleDayClick = async (date: string) => {
    if (selectedDate === date) {
      // If clicking the same date, reset to weekly accumulated
      setIsDaySelected(false);

      // Reload weekly accumulated
      const today = getLocalDateString(new Date());
      const daysElapsed = weekDaysData.findIndex(d => d.date === today) + 1;

      let weeklyAccumulated = {
        consumedCalories: 0,
        targetCalories: 0,
        protein: 0,
        targetProtein: 0,
        carbs: 0,
        targetCarbs: 0,
        fats: 0,
        targetFats: 0,
        waterIntake: 0,
        waterGoal: 0,
      };

      for (let i = 0; i < daysElapsed; i++) {
        const day = weekDaysData[i];
        weeklyAccumulated.consumedCalories += day.stats.consumedCalories;
        weeklyAccumulated.targetCalories += day.stats.targetCalories;
        weeklyAccumulated.protein += day.stats.macros.protein;
        weeklyAccumulated.targetProtein += day.stats.targetMacros.protein;
        weeklyAccumulated.carbs += day.stats.macros.carbs;
        weeklyAccumulated.targetCarbs += day.stats.targetMacros.carbs;
        weeklyAccumulated.fats += day.stats.macros.fats;
        weeklyAccumulated.targetFats += day.stats.targetMacros.fats;
        weeklyAccumulated.waterIntake += day.stats.waterIntake || 0;
        weeklyAccumulated.waterGoal += day.stats.waterGoal || 0;
      }

      setSelectedDayStats({
        consumedCalories: weeklyAccumulated.consumedCalories,
        targetCalories: weeklyAccumulated.targetCalories,
        macros: {
          protein: weeklyAccumulated.protein,
          carbs: weeklyAccumulated.carbs,
          fats: weeklyAccumulated.fats,
        },
        targetMacros: {
          protein: weeklyAccumulated.targetProtein,
          carbs: weeklyAccumulated.targetCarbs,
          fats: weeklyAccumulated.targetFats,
        },
        waterIntake: weeklyAccumulated.waterIntake,
        waterGoal: weeklyAccumulated.waterGoal,
      } as DailyStats);

      // Fetch accumulated week meals using MealService (local-timezone aware)
      const allWeekMeals: Meal[] = [];
      for (let i = 0; i < daysElapsed; i++) {
        const dateStr = weekDaysData[i].date;
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayMeals = await MealService.getMeals(user.id, new Date(y, m - 1, d));
        allWeekMeals.push(...dayMeals);
      }
      allWeekMeals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setSelectedDayMeals(allWeekMeals);
    } else {
      // Load specific day data
      setSelectedDate(date);
      setIsDaySelected(true);

      const selectedDay = weekDaysData.find(d => d.date === date);
      if (selectedDay) {
        setSelectedDayStats(selectedDay.stats);
      }

      // Fetch meals using MealService (same local-timezone window used by getDailyStats)
      // This avoids UTC offset issues that can make the raw query return empty
      if (user) {
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d); // constructs date in local timezone
        const freshMeals = await MealService.getMeals(user.id, dateObj);
        setSelectedDayMeals(freshMeals);
      }
    }
  };

  const loadMonthData = async () => {
    if (!user) return;
    setMonthLoading(true);
    try {
      const now = new Date();
      const result = await StatsService.getMonthStats(user.id, now.getFullYear(), now.getMonth());
      setMonthWeeksData(result.weeks);
      setMonthSummary(result.monthSummary);
      // Auto-select current week
      const idx = result.weeks.findIndex(w => w.isCurrent);
      if (idx !== -1) setSelectedWeekIndex(idx);
    } finally {
      setMonthLoading(false);
    }
  };

  const handleWeekClick = async (weekIndex: number) => {
    if (selectedWeekIndex === weekIndex) {
      // Toggle off — deselect week, reset day detail
      setSelectedWeekIndex(null);
      setIsDaySelected(false);
      setSelectedDayStats(null);
      setSelectedDayMeals([]);
      return;
    }
    setSelectedWeekIndex(weekIndex);
    setIsDaySelected(false);
    setSelectedDayStats(null);
    setSelectedDayMeals([]);
    // Auto-select most recent day with data in this week
    const week = monthWeeksData[weekIndex];
    const today = getLocalDateString(new Date());
    const lastDay = [...week.days].reverse().find(d => d.date <= today && (d.stats?.consumedCalories ?? 0) > 0);
    if (lastDay && user) {
      setSelectedDate(lastDay.date);
      setSelectedDayStats(lastDay.stats);
      const [y, m, d] = lastDay.date.split('-').map(Number);
      const freshMeals = await MealService.getMeals(user.id, new Date(y, m - 1, d));
      setSelectedDayMeals(freshMeals);
      setIsDaySelected(true);
    }
  };

  // Compute display stats for month tab macros/hydration cards:
  //   - day selected  → that day's exact values
  //   - week selected → daily average across that week's logged days
  //   - nothing       → daily average across all month's logged days
  const monthDisplayStats = React.useMemo(() => {
    if (period !== 'month') return null;

    if (isDaySelected && selectedDayStats) {
      return { stats: selectedDayStats, mode: 'day' as const, daysCount: 1 };
    }

    const sourceDays = selectedWeekIndex !== null && monthWeeksData[selectedWeekIndex]
      ? monthWeeksData[selectedWeekIndex].days
      : monthWeeksData.flatMap((w: any) => w.days);

    const logged = sourceDays.filter((d: any) => !d.isFuture && (d.stats?.consumedCalories ?? 0) > 0);
    if (logged.length === 0) return null;

    const avg = (fn: (d: any) => number) =>
      Math.round(logged.reduce((s: number, d: any) => s + fn(d), 0) / logged.length);

    const ref = logged[0].stats as DailyStats;

    return {
      stats: {
        consumedCalories: avg(d => d.stats.consumedCalories),
        targetCalories: ref.targetCalories,
        macros: {
          protein: avg(d => d.stats.macros.protein),
          carbs:   avg(d => d.stats.macros.carbs),
          fats:    avg(d => d.stats.macros.fats),
        },
        targetMacros: ref.targetMacros,
        waterIntake: avg(d => d.stats.waterIntake ?? 0),
        waterGoal: ref.waterGoal,
      } as DailyStats,
      mode: selectedWeekIndex !== null ? 'week' as const : 'month' as const,
      daysCount: logged.length,
    };
  }, [period, isDaySelected, selectedDayStats, selectedWeekIndex, monthWeeksData]);

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-Malama-bg dark:bg-background-dark font-display text-Malama-main dark:text-white animate-fade-in transition-colors duration-300">
      <Confetti active={showConfetti} />

      {/* Header */}
      <header className="flex items-center px-6 py-5 justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-Malama-petrol/20 dark:border-primary/20"
              style={{ backgroundImage: `url("${profile?.avatar_url || USER_AVATAR}")` }}
            />
            {currentStreak > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-background-dark flex items-center gap-0.5 animate-pulse">
                <span className="material-symbols-outlined text-[10px]">local_fire_department</span>
                {currentStreak}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-Malama-muted dark:text-slate-400 font-medium tracking-wide uppercase">
              {`${t.dashboard.levelPrefix} ${getLevelLabel(currentLevel)}`}
            </span>
            <h2 className="text-Malama-main dark:text-white text-lg font-bold leading-tight">{displayName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavClick(AppView.FLOW_ADAPTATION)}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-Malama-border dark:border-transparent hover:bg-Malama-petrol-light dark:hover:bg-primary/10 transition-colors text-Malama-petrol dark:text-primary relative animate-pulse shadow-sm dark:shadow-none"
            title="Simulate Activity Detected"
          >
            <span className="material-symbols-outlined text-[20px]">sync</span>
            <span className="absolute top-2 right-2 size-2 bg-Malama-petrol dark:bg-primary rounded-full" />
          </button>
          <button
            onClick={() => onNavClick(AppView.PROFILE)}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-Malama-border dark:border-transparent hover:bg-Malama-petrol-light dark:hover:bg-primary/10 transition-colors text-Malama-petrol dark:text-primary shadow-sm dark:shadow-none"
            title="Perfil"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-Malama-border dark:border-transparent hover:bg-Malama-petrol-light dark:hover:bg-primary/10 transition-colors text-Malama-muted dark:text-slate-300 shadow-sm dark:shadow-none"
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
            <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-white dark:bg-surface-dark p-1 border border-Malama-border dark:border-white/5 relative overflow-hidden">
              {(['day', 'week', 'month'] as PeriodTab[]).map((tab) => (
                <label
                  key={tab}
                  className={`relative flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl transition-all text-sm font-semibold z-10 ${period === tab
                    ? 'text-Malama-petrol dark:text-white'
                    : 'text-Malama-muted dark:text-white/40 hover:text-Malama-petrol/60 dark:hover:text-white/60'
                    }`}
                >
                  <span className="relative z-10">{t.flowScore[tab]}</span>
                  {period === tab && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0 bg-Malama-petrol/10 dark:bg-white/10 z-0"
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
            {/* Telemedicine: Crédito disponível mas não agendado */}
            {hasAvailableCredit && !todayConsultation && (
              <div className="px-6">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 flex items-center justify-between shadow-lg cursor-pointer"
                  onClick={() => onNavClick(AppView.AGENDAR_CONSULTA)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-xl">calendar_month</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">Consulta do mês disponível</p>
                      <p className="text-white/80 text-xs">Você ainda não agendou a consulta do mês</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                    <span className="text-white text-xs font-bold">Agendar</span>
                    <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Telemedicine: Today's Consultation Banner */}
            {todayConsultation && (
              <div className="px-6">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 rounded-2xl p-4 flex items-center justify-between shadow-lg cursor-pointer"
                  onClick={() => onNavClick(AppView.MINHAS_CONSULTAS)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-xl">videocam</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">
                        Consulta hoje às {new Date(todayConsultation.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-white/80 text-xs">{(todayConsultation.doctors as any)?.name || 'Médico'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                    <span className="text-white text-xs font-bold">Entrar</span>
                    <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Telemedicine: Doctor Message */}
            {doctorMsg && (
              <div className="px-6">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-Malama-border dark:border-transparent"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lg">💪</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-Malama-muted dark:text-slate-400 font-semibold">
                        {(doctorMsg.doctors as any)?.name || 'Dr.'} disse:
                      </p>
                      <p className="text-sm text-Malama-main dark:text-white mt-0.5 leading-relaxed">
                        "{doctorMsg.message}"
                      </p>
                      <p className="text-[10px] text-Malama-muted dark:text-slate-500 mt-1">
                        {(() => {
                          const diffMs = Date.now() - new Date(doctorMsg.created_at).getTime();
                          const diffDays = Math.floor(diffMs / 86400000);
                          return diffDays === 0 ? 'hoje' : diffDays === 1 ? 'há 1 dia' : `há ${diffDays} dias`;
                        })()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Realtime Goals Toast */}
            {goalsToast && (
              <div className="px-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-3 flex items-center gap-3"
                >
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Metas atualizadas!</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Dr. {goalsToast.doctor_name || 'Médico'} ajustou
                      {goalsToast.calorie_goal ? ` calorias para ${goalsToast.calorie_goal}kcal` : ''}
                      {goalsToast.calorie_goal && goalsToast.protein_goal ? ' e' : ''}
                      {goalsToast.protein_goal ? ` proteína para ${goalsToast.protein_goal}g` : ''}
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Today's Missions Card */}
            <div className="px-6">
              <TodayMissionsCard onNavClick={onNavClick} onFabClick={onFabClick} />
            </div>

            {/* Goal Adjustment Badge */}
            {goalAdjustment && (
              <div className="px-6 -mt-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full w-fit border border-emerald-200 dark:border-emerald-800/40">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">verified</span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Metas ajustadas por {(goalAdjustment.doctors as any)?.name || 'seu médico'}
                  </span>
                </div>
              </div>
            )}

            {/* Calorie Ring */}
            <div className="flex flex-col items-center justify-center px-6 py-4">
              <div className="relative size-64 rounded-full overflow-hidden">
                <svg className="circular-chart transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="circle-bg dark:stroke-[#18282e] stroke-gray-200 light-circle-bg" d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    className="circle"
                    stroke={getCalorieColor()}
                    strokeDasharray={`${Math.min(caloriePercent, 100)}, 100`}
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
                  />
                  {isOverTarget && (
                    <path
                      className="circle"
                      stroke={getCalorieColor()}
                      strokeDasharray={`${Math.max(caloriePercent - 100, 0)}, 100`}
                      d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                      opacity="0.3"
                      style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-bold tracking-tighter text-Malama-main dark:text-white">
                    {(stats.consumedCalories ?? 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-Malama-muted dark:text-slate-400 mt-1">
                    / {(stats.targetCalories ?? 0).toLocaleString()} {t.dashboard.kcal}
                  </span>
                  {(stats.activityCalories ?? 0) > 0 && !isOverTarget && (
                    <span className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                      +{stats.activityCalories}
                    </span>
                  )}
                  {isOverTarget && (
                    <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${isWayOverTarget
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                      {Math.round(calorieRatio * 100)}% da meta
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Boost Banner */}
            {(stats.activityCalories ?? 0) > 0 && (
              <div className="px-6 -mt-2 mb-1 flex justify-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-800/30">
                  <span className="material-symbols-outlined text-amber-500 dark:text-amber-400" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Treino desbloqueou +{stats.activityCalories} kcal na sua meta de hoje
                  </span>
                </div>
              </div>
            )}

            {/* Motivational Text */}
            <div className="text-center space-y-2 mb-4 px-6">
              <h2 className="text-2xl font-bold tracking-tight text-Malama-main dark:text-white">
                {isWayOverTarget ? 'Atenção ao excesso!' : isOverTarget ? 'Meta ultrapassada' : t.dashboard.keepTheFlow}
              </h2>
              <p className="text-sm text-Malama-muted dark:text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                {isWayOverTarget
                  ? `Você consumiu ${Math.round(calorieRatio * 100)}% da sua meta. Que tal fazer uma refeição mais leve no próximo?`
                  : isOverTarget
                    ? `Você ultrapassou sua meta de ${(stats.targetCalories ?? 0).toLocaleString()} kcal. Fique atento às próximas refeições.`
                    : t.dashboard.fuelingPotential}
              </p>
            </div>

            {/* Macro Stats */}
            <div className="grid grid-cols-3 gap-2 w-full px-6">
              <div className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-Malama-border dark:border-transparent transition-colors duration-300 min-w-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide truncate">{t.dashboard.protein}</span>
                  <span className={`text-[10px] font-bold ${((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) > 1.2 ? 'text-red-500' : ((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) > 1 ? 'text-orange-500' : 'text-Malama-petrol dark:text-primary'}`}>
                    {Math.round(((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-base font-bold text-Malama-main dark:text-white leading-none">
                    {Math.round(stats.macros.protein ?? 0)}<span className="text-[10px] font-normal text-Malama-muted dark:text-slate-500 ml-0.5">/{stats.targetMacros.protein}g</span>
                  </span>
                  <div className="h-1.5 w-full bg-Malama-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) > 1.2 ? 'bg-red-500' : ((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) > 1 ? 'bg-orange-500' : 'bg-Malama-petrol dark:bg-primary'}`}
                      style={{ width: `${Math.min(((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-Malama-border dark:border-transparent transition-colors duration-300 min-w-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide truncate">{t.dashboard.carbs}</span>
                  <span className={`text-[10px] font-bold ${((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) > 1.2 ? 'text-red-500' : ((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) > 1 ? 'text-orange-500' : 'text-orange-400'}`}>
                    {Math.round(((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-base font-bold text-Malama-main dark:text-white leading-none">
                    {Math.round(stats.macros.carbs ?? 0)}<span className="text-[10px] font-normal text-Malama-muted dark:text-slate-500 ml-0.5">/{stats.targetMacros.carbs}g</span>
                  </span>
                  <div className="h-1.5 w-full bg-Malama-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) > 1.2 ? 'bg-red-500' : ((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) > 1 ? 'bg-orange-500' : 'bg-orange-400'}`}
                      style={{ width: `${Math.min(((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-Malama-border dark:border-transparent transition-colors duration-300 min-w-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide truncate">{t.dashboard.fats}</span>
                  <span className={`text-[10px] font-bold ${((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) > 1.2 ? 'text-red-500' : ((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) > 1 ? 'text-orange-500' : 'text-pink-400'}`}>
                    {Math.round(((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-base font-bold text-Malama-main dark:text-white leading-none">
                    {Math.round(stats.macros.fats ?? 0)}<span className="text-[10px] font-normal text-Malama-muted dark:text-slate-500 ml-0.5">/{stats.targetMacros.fats}g</span>
                  </span>
                  <div className="h-1.5 w-full bg-Malama-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) > 1.2 ? 'bg-red-500' : ((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) > 1 ? 'bg-orange-500' : 'bg-pink-400'}`}
                      style={{ width: `${Math.min(((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Hydration Card */}
            <div className="px-6">
              {(() => {
                const waterGoal = waterGoalState || 2500;
                const waterPct = Math.min(Math.round((waterIntake / waterGoal) * 100), 100);
                const glassesTotal = 8;
                const glassesFilled = Math.round((waterIntake / waterGoal) * glassesTotal);
                return (
                  <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-Malama-border dark:border-transparent transition-colors duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sky-400 text-xl">water_drop</span>
                        <span className="text-xs font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">Hidratação</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-sky-400 font-bold">{waterPct}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavClick(AppView.HYDRATION); }}
                          className="flex items-center justify-center size-7 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors active:scale-95"
                          title="Compartilhar Hidratação"
                        >
                          <span className="material-symbols-outlined text-[14px]">ios_share</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <span className="text-2xl font-bold text-Malama-main dark:text-white leading-none">
                        {waterIntake}<span className="text-xs font-normal text-Malama-muted dark:text-slate-500 ml-1">/{waterGoal} ml</span>
                      </span>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {Array.from({ length: glassesTotal }).map((_, i) => (
                        <div key={i} className={`flex-1 h-2 rounded-full transition-colors duration-300 ${i < glassesFilled ? 'bg-sky-400' : 'bg-Malama-pastel-orange dark:bg-slate-700/50'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-Malama-muted dark:text-slate-500 mt-1.5">
                      {glassesFilled} de {glassesTotal} copos · meta diária
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Micronutrients Card — only shown when at least one micro was consumed */}
            {(() => {
              const micros = stats.micronutrients;
              if (!micros || Object.keys(micros).length === 0) return null;

              type MicroKey = keyof typeof MICRO_META;
              const MICRO_META = {
                fiber: { label: 'Fibra', rda: 25, unit: 'g', group: 'Outros', warn: false },
                sugar: { label: 'Açúcar', rda: 25, unit: 'g', group: 'Outros', warn: true },
                saturated_fat: { label: 'G. Saturada', rda: 20, unit: 'g', group: 'Outros', warn: true },
                cholesterol: { label: 'Colesterol', rda: 300, unit: 'mg', group: 'Outros', warn: true },
                sodium: { label: 'Sódio', rda: 2300, unit: 'mg', group: 'Minerais', warn: true },
                potassium: { label: 'Potássio', rda: 4700, unit: 'mg', group: 'Minerais', warn: false },
                calcium: { label: 'Cálcio', rda: 1000, unit: 'mg', group: 'Minerais', warn: false },
                iron: { label: 'Ferro', rda: 14, unit: 'mg', group: 'Minerais', warn: false },
                magnesium: { label: 'Magnésio', rda: 370, unit: 'mg', group: 'Minerais', warn: false },
                zinc: { label: 'Zinco', rda: 10, unit: 'mg', group: 'Minerais', warn: false },
                vitamin_a: { label: 'Vit. A', rda: 800, unit: 'mcg', group: 'Vitaminas', warn: false },
                vitamin_c: { label: 'Vit. C', rda: 80, unit: 'mg', group: 'Vitaminas', warn: false },
                vitamin_d: { label: 'Vit. D', rda: 15, unit: 'mcg', group: 'Vitaminas', warn: false },
                vitamin_e: { label: 'Vit. E', rda: 15, unit: 'mg', group: 'Vitaminas', warn: false },
                vitamin_b12: { label: 'Vit. B12', rda: 2.4, unit: 'mcg', group: 'Vitaminas', warn: false },
                vitamin_b6: { label: 'Vit. B6', rda: 1.3, unit: 'mg', group: 'Vitaminas', warn: false },
                folate: { label: 'Folato', rda: 400, unit: 'mcg', group: 'Vitaminas', warn: false },
              } as const;

              const groups = ['Outros', 'Minerais', 'Vitaminas'] as const;
              const grouped = groups.map(group => ({
                group,
                items: (Object.entries(MICRO_META) as [MicroKey, typeof MICRO_META[MicroKey]][])
                  .filter(([key, meta]) => meta.group === group && (micros[key] ?? 0) > 0)
                  .map(([key, meta]) => ({
                    key, ...meta,
                    consumed: Math.round((micros[key] ?? 0) * 10) / 10,
                  })),
              })).filter(g => g.items.length > 0);

              return (
                <div className="px-6">
                  <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-Malama-border dark:border-transparent transition-colors duration-300">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setShowMicros(!showMicros)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-xl">biotech</span>
                        <span className="text-xs font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">Micronutrientes</span>
                      </div>
                      <span className="material-symbols-outlined text-Malama-muted text-sm transition-transform duration-300" style={{ transform: showMicros ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </div>

                    {/* Collapsible Content */}
                    <div className={`overflow-hidden transition-all duration-300 ${showMicros ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                      <div className="flex flex-col gap-4">
                        {grouped.map(({ group, items }) => (
                          <div key={group}>
                            <p className="text-[10px] font-bold text-Malama-muted dark:text-slate-500 uppercase tracking-wider mb-2">{group}</p>
                            <div className="flex flex-col gap-2">
                              {items.map(({ key, label, rda, unit, warn, consumed }) => {
                                const pct = Math.min(Math.round((consumed / rda) * 100), 100);
                                const over = consumed > rda;
                                const barColor = warn
                                  ? over ? 'bg-red-400' : pct > 70 ? 'bg-orange-400' : 'bg-Malama-petrol dark:bg-primary'
                                  : 'bg-Malama-petrol dark:bg-primary';
                                return (
                                  <div key={key}>
                                    <div className="flex justify-between items-baseline mb-1">
                                      <span className="text-xs font-medium text-Malama-main dark:text-white">{label}</span>
                                      <span className="text-[10px] text-Malama-muted dark:text-slate-500">
                                        {consumed}{unit} / {rda}{unit}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-Malama-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Daily Meals Timeline */}
            <DailyMealsList
              meals={meals}
              onDeleteMeal={onDeleteMeal}
              onEditMeal={onEditMeal}
            />

            {/* GLP-1 Program Section — shown when active */}
            {profile?.glp1_mode && (
              <GLP1Section />
            )}
          </>
        ) : (
          /* ——— WEEK/MONTH VIEW: Flow Score + Weekly Rhythm (Stitch hero) ——— */
          <>
            {period === 'week' ? (
              /* ——— WEEK VIEW: Days Circle + Hero Card + Day History ——— */
              <>
                {/* ── Week Days Navigation ── */}
                {weekDaysForCircle.length > 0 && (
                  <WeekDaysCircle
                    weekDays={weekDaysForCircle}
                    onDayClick={handleDayClick}
                    selectedDate={selectedDate}
                  />
                )}

                {/* ── Past day banner ── */}
                <AnimatePresence>
                  {isDaySelected && (
                    <motion.div
                      key="week-past-day-banner"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mx-6 mb-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-Malama-petrol/8 dark:bg-primary/10 border border-Malama-petrol/15 dark:border-primary/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-base">history</span>
                        <span className="text-xs font-semibold text-Malama-petrol dark:text-primary">
                          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDayClick(selectedDate)}
                        className="flex items-center gap-1 text-[11px] font-bold text-Malama-petrol dark:text-primary bg-white dark:bg-surface-dark px-2.5 py-1 rounded-full shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                        Acumulado
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Hero card: Calorias + Anel semanal ── */}
                {(() => {
                  const ds = isDaySelected && selectedDayStats ? selectedDayStats : selectedDayStats;
                  const weekProg = weeklyProgress;
                  const weekPct = Math.round((weekProg?.progress ?? 0) * 100);
                  const ringColor = weekPct >= 85 ? '#10b981' : weekPct >= 50 ? '#f59e0b' : '#6b7280';
                  const daysMetGoal = weekProg?.daysMetGoal ?? 0;
                  const daysElapsed = weekProg?.daysElapsed ?? 1;
                  const pastDeficit = weekProg?.pastDeficit ?? 0;

                  return (
                    <div className="px-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-Malama-border dark:border-transparent"
                      >
                        <div className="flex items-center gap-5">
                          {/* Left: calorie info */}
                          <div className="flex-1 min-w-0">
                            {isDaySelected && selectedDayStats ? (
                              <>
                                <p className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Calorias consumidas
                                </p>
                                <p className={`text-4xl font-bold tracking-tighter leading-none ${selectedDayStats.consumedCalories > selectedDayStats.targetCalories ? 'text-orange-500' : 'text-Malama-main dark:text-white'}`}>
                                  {(selectedDayStats.consumedCalories ?? 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-1">
                                  meta: {(selectedDayStats.targetCalories ?? 0).toLocaleString()} kcal
                                </p>
                                <div className="flex gap-2 mt-3 flex-wrap">
                                  {[
                                    { label: 'P', value: Math.round(selectedDayStats.macros.protein), color: 'bg-Malama-petrol/10 dark:bg-primary/10 text-Malama-petrol dark:text-primary' },
                                    { label: 'C', value: Math.round(selectedDayStats.macros.carbs), color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
                                    { label: 'G', value: Math.round(selectedDayStats.macros.fats), color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' },
                                  ].map(m => (
                                    <span key={m.label} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>
                                      {m.label} {m.value}g
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Calorias restantes hoje
                                </p>
                                <p className={`text-4xl font-bold tracking-tighter leading-none ${(weekProg?.todayRemaining ?? 0) === 0 ? 'text-emerald-500' : 'text-Malama-main dark:text-white'}`}>
                                  {(weekProg?.todayRemaining ?? Math.max(0, stats.targetCalories - (stats.consumedCalories ?? 0))).toLocaleString()}
                                </p>
                                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-1">
                                  {(stats.consumedCalories ?? 0).toLocaleString()} / {(weekProg?.todayEffectiveTarget ?? stats.targetCalories).toLocaleString()} kcal
                                </p>
                                {pastDeficit > 50 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <span className="material-symbols-outlined text-orange-400 text-[13px]">trending_up</span>
                                    <span className="text-[11px] font-semibold text-orange-500">
                                      +{pastDeficit.toLocaleString()} acumulado de dias anteriores
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Right: weekly goal ring */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className="relative size-20">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-gray-100 dark:text-slate-700/60"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  fill="none"
                                  stroke={ringColor}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${weekPct}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-0.5">
                                <span className="material-symbols-outlined text-[18px]" style={{ color: ringColor }}>
                                  local_fire_department
                                </span>
                                <span className="text-[11px] font-bold text-Malama-main dark:text-white leading-none">
                                  {daysMetGoal}/{daysElapsed}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-Malama-muted dark:text-slate-500 text-center leading-tight">
                              Meta<br />semanal
                            </span>
                          </div>
                        </div>

                        {/* Weekly progress bar */}
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">Progresso semanal</span>
                            <span className="text-[10px] font-bold" style={{ color: ringColor }}>{weekPct}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${weekPct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(to right, #6366f1, ${ringColor})` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-Malama-muted dark:text-slate-500">
                              {(weekProg?.totalConsumed ?? 0).toLocaleString()} kcal consumidas
                            </span>
                            <span className="text-[9px] text-Malama-muted dark:text-slate-500">
                              meta {(weekProg?.totalTarget ?? 0).toLocaleString()} kcal
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })()}

                {/* ── Macros do dia selecionado ── */}
                {selectedDayStats && (
                  <div className="px-6">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: t.dashboard.protein, value: selectedDayStats.macros.protein, target: selectedDayStats.targetMacros.protein, color: 'bg-Malama-petrol dark:bg-primary' },
                        { label: t.dashboard.carbs, value: selectedDayStats.macros.carbs, target: selectedDayStats.targetMacros.carbs, color: 'bg-orange-400' },
                        { label: t.dashboard.fats, value: selectedDayStats.macros.fats, target: selectedDayStats.targetMacros.fats, color: 'bg-pink-400' },
                      ].map(m => (
                        <div key={m.label} className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-Malama-border dark:border-transparent">
                          <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">{m.label}</span>
                          <span className="text-base font-bold text-Malama-main dark:text-white">
                            {Math.round(m.value ?? 0)}<span className="text-[10px] font-normal text-Malama-muted dark:text-slate-500">/{m.target}g</span>
                          </span>
                          <div className="h-1.5 w-full bg-Malama-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div className={`h-full ${m.color} rounded-full`} style={{ width: `${Math.min(((m.value ?? 0) / (m.target || 1)) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Hidratação do dia selecionado ── */}
                {selectedDayStats && (
                  <div className="px-6">
                    <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-Malama-border dark:border-transparent">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sky-400 text-xl">water_drop</span>
                          <span className="text-xs font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">{t.week.hydration}</span>
                        </div>
                        <span className="text-xs text-sky-400 font-bold">
                          {Math.min(Math.round(((selectedDayStats.waterIntake || 0) / (selectedDayStats.waterGoal || 1)) * 100), 100)}%
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-Malama-main dark:text-white">
                        {selectedDayStats.waterIntake || 0}
                        <span className="text-xs font-normal text-Malama-muted dark:text-slate-500">/{selectedDayStats.waterGoal || 2500} ml</span>
                      </span>
                      {(() => {
                        const wg = selectedDayStats.waterGoal || 2500;
                        const wi = selectedDayStats.waterIntake || 0;
                        const filled = Math.round((wi / wg) * 8);
                        return (
                          <div className="mt-3 flex gap-1.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className={`flex-1 h-2 rounded-full ${i < filled ? 'bg-sky-400' : 'bg-Malama-pastel-orange dark:bg-slate-700/50'}`} />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Refeições do dia selecionado ── */}
                <div className="px-6">
                  <h3 className="text-sm font-bold text-Malama-main dark:text-white mb-3">{t.week.meals}</h3>
                  {selectedDayMeals.length > 0 ? (
                    <DailyMealsList
                      meals={selectedDayMeals}
                      onDeleteMeal={onDeleteMeal}
                      onEditMeal={onEditMeal}
                    />
                  ) : (
                    <div className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-Malama-border dark:border-transparent text-center">
                      <span className="text-4xl mb-2 block">🍽️</span>
                      <p className="text-sm text-Malama-muted dark:text-slate-400">{t.week.noMealsLogged}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ——— MONTH VIEW: Weeks Progress ——— */
              <>
                {/* ── Month header ── */}
                <div className="px-6 pb-1">
                  <p className="text-[11px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wider">
                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* ── Week circles ── */}
                {monthLoading ? (
                  <div className="px-4 py-3 flex gap-2 justify-between">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-6 h-2 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-slate-700 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : monthWeeksData.length > 0 && (
                  <MonthWeeksGrid
                    weeks={monthWeeksData}
                    onWeekClick={handleWeekClick}
                    selectedWeekIndex={selectedWeekIndex}
                  />
                )}

                {/* ── Expanded day circles for selected week ── */}
                <AnimatePresence>
                  {selectedWeekIndex !== null && monthWeeksData[selectedWeekIndex] && (
                    <motion.div
                      key={`month-week-days-${selectedWeekIndex}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-gray-50 dark:border-white/5"
                    >
                      <WeekDaysCircle
                        weekDays={monthWeeksData[selectedWeekIndex].days}
                        onDayClick={handleDayClick}
                        selectedDate={selectedDate}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Past-day banner ── */}
                <AnimatePresence>
                  {isDaySelected && (
                    <motion.div
                      key="month-past-day-banner"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mx-6 mb-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-Malama-petrol/8 dark:bg-primary/10 border border-Malama-petrol/15 dark:border-primary/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-base">history</span>
                        <span className="text-xs font-semibold text-Malama-petrol dark:text-primary">
                          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <button
                        onClick={() => { setIsDaySelected(false); setSelectedDayStats(null); setSelectedDayMeals([]); }}
                        className="flex items-center gap-1 text-[11px] font-bold text-Malama-petrol dark:text-primary bg-white dark:bg-surface-dark px-2.5 py-1 rounded-full shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                        Semana
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Hero card ── */}
                {(() => {
                  // Determine display mode
                  const showDay  = isDaySelected && !!selectedDayStats;
                  const showWeek = !showDay && selectedWeekIndex !== null && monthWeeksData[selectedWeekIndex!];
                  const selWeek  = showWeek ? monthWeeksData[selectedWeekIndex!] : null;

                  // Ring values
                  let ringPct: number;
                  let ringDaysLabel: string;
                  let ringLabel: string;
                  if (showDay) {
                    // Show week ring for context (which week is selected)
                    const wk = selectedWeekIndex !== null ? monthWeeksData[selectedWeekIndex] : null;
                    ringPct = wk ? Math.round((wk.daysMetGoal / 7) * 100) : 0;
                    ringDaysLabel = wk ? `${wk.daysMetGoal}/7` : '–';
                    ringLabel = 'Meta\nsemanal';
                  } else if (showWeek && selWeek) {
                    ringPct = Math.round((selWeek.daysMetGoal / 7) * 100);
                    ringDaysLabel = `${selWeek.daysMetGoal}/7`;
                    ringLabel = 'Meta\nsemanal';
                  } else {
                    const mp = Math.round((monthSummary?.monthProgress ?? 0) * 100);
                    ringPct = mp;
                    ringDaysLabel = `${monthSummary?.totalDaysMetGoal ?? 0}d`;
                    ringLabel = 'Meta\nmensal';
                  }
                  const ringColor = ringPct >= 85 ? '#10b981' : ringPct >= 50 ? '#f59e0b' : '#6b7280';

                  // Progress bar values (monthly)
                  const monthPct = Math.round((monthSummary?.monthProgress ?? 0) * 100);
                  const monthBarColor = monthPct >= 85 ? '#10b981' : monthPct >= 50 ? '#f59e0b' : '#6b7280';

                  return (
                    <div className="px-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-Malama-border dark:border-transparent"
                      >
                        <div className="flex items-center gap-5">
                          {/* Left: calorie info */}
                          <div className="flex-1 min-w-0">
                            {showDay && selectedDayStats ? (
                              <>
                                <p className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Calorias consumidas
                                </p>
                                <p className={`text-4xl font-bold tracking-tighter leading-none ${selectedDayStats.consumedCalories > selectedDayStats.targetCalories ? 'text-orange-500' : 'text-Malama-main dark:text-white'}`}>
                                  {(selectedDayStats.consumedCalories ?? 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-1">
                                  meta: {(selectedDayStats.targetCalories ?? 0).toLocaleString()} kcal
                                </p>
                                <div className="flex gap-2 mt-3 flex-wrap">
                                  {[
                                    { label: 'P', value: Math.round(selectedDayStats.macros.protein), color: 'bg-Malama-petrol/10 dark:bg-primary/10 text-Malama-petrol dark:text-primary' },
                                    { label: 'C', value: Math.round(selectedDayStats.macros.carbs), color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
                                    { label: 'G', value: Math.round(selectedDayStats.macros.fats), color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' },
                                  ].map(m => (
                                    <span key={m.label} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>
                                      {m.label} {m.value}g
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : showWeek && selWeek ? (
                              <>
                                <p className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wider mb-1">
                                  {selWeek.label} — calorias
                                </p>
                                <p className="text-4xl font-bold tracking-tighter leading-none text-Malama-main dark:text-white">
                                  {selWeek.days.reduce((s, d) => s + (d.stats?.consumedCalories ?? 0), 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-1">
                                  {selWeek.daysWithData} dia{selWeek.daysWithData !== 1 ? 's' : ''} registrado{selWeek.daysWithData !== 1 ? 's' : ''}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Calorias no mês
                                </p>
                                <p className="text-4xl font-bold tracking-tighter leading-none text-Malama-main dark:text-white">
                                  {(monthSummary?.totalConsumed ?? 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-1">
                                  meta {(monthSummary?.totalTarget ?? 0).toLocaleString()} kcal
                                </p>
                              </>
                            )}
                          </div>

                          {/* Right: goal ring */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className="relative size-20">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-gray-100 dark:text-slate-700/60"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  fill="none"
                                  stroke={ringColor}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${ringPct}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-0.5">
                                <span className="material-symbols-outlined text-[18px]" style={{ color: ringColor }}>
                                  {showDay || showWeek ? 'local_fire_department' : 'calendar_month'}
                                </span>
                                <span className="text-[11px] font-bold text-Malama-main dark:text-white leading-none">
                                  {ringDaysLabel}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-Malama-muted dark:text-slate-500 text-center leading-tight whitespace-pre-line">
                              {ringLabel}
                            </span>
                          </div>
                        </div>

                        {/* Monthly progress bar */}
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">Progresso mensal</span>
                            <span className="text-[10px] font-bold" style={{ color: monthBarColor }}>{monthPct}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${monthPct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(to right, #6366f1, ${monthBarColor})` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-Malama-muted dark:text-slate-500">
                              {(monthSummary?.totalConsumed ?? 0).toLocaleString()} kcal consumidas
                            </span>
                            <span className="text-[9px] text-Malama-muted dark:text-slate-500">
                              {monthSummary?.daysWithData ?? 0} dias registrados
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })()}

                {/* ── Macros — média acumulada / dia / semana ── */}
                {monthDisplayStats && (
                  <div className="px-6">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined text-[13px] text-Malama-muted dark:text-slate-500">
                        {monthDisplayStats.mode === 'day' ? 'today' : 'equalizer'}
                      </span>
                      <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">
                        {monthDisplayStats.mode === 'day'
                          ? 'Valores do dia'
                          : monthDisplayStats.mode === 'week'
                            ? `Média da semana · ${monthDisplayStats.daysCount} dia${monthDisplayStats.daysCount !== 1 ? 's' : ''}`
                            : `Média mensal · ${monthDisplayStats.daysCount} dia${monthDisplayStats.daysCount !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: t.dashboard.protein, value: monthDisplayStats.stats.macros.protein, target: monthDisplayStats.stats.targetMacros.protein, color: 'bg-Malama-petrol dark:bg-primary' },
                        { label: t.dashboard.carbs,   value: monthDisplayStats.stats.macros.carbs,   target: monthDisplayStats.stats.targetMacros.carbs,   color: 'bg-orange-400' },
                        { label: t.dashboard.fats,    value: monthDisplayStats.stats.macros.fats,    target: monthDisplayStats.stats.targetMacros.fats,    color: 'bg-pink-400' },
                      ].map(m => (
                        <div key={m.label} className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-Malama-border dark:border-transparent">
                          <span className="text-[10px] font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">{m.label}</span>
                          <span className="text-base font-bold text-Malama-main dark:text-white">
                            {Math.round(m.value ?? 0)}<span className="text-[10px] font-normal text-Malama-muted dark:text-slate-500">/{m.target}g</span>
                          </span>
                          <div className="h-1.5 w-full bg-Malama-pastel-orange dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div className={`h-full ${m.color} rounded-full`} style={{ width: `${Math.min(((m.value ?? 0) / (m.target || 1)) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Hidratação — média acumulada / dia / semana ── */}
                {monthDisplayStats && (
                  <div className="px-6">
                    <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-Malama-border dark:border-transparent">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sky-400 text-xl">water_drop</span>
                          <span className="text-xs font-semibold text-Malama-muted dark:text-slate-500 uppercase tracking-wide">{t.week.hydration}</span>
                        </div>
                        <span className="text-xs text-sky-400 font-bold">
                          {Math.min(Math.round(((monthDisplayStats.stats.waterIntake || 0) / (monthDisplayStats.stats.waterGoal || 1)) * 100), 100)}%
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-Malama-main dark:text-white">
                        {monthDisplayStats.stats.waterIntake || 0}
                        <span className="text-xs font-normal text-Malama-muted dark:text-slate-500">/{monthDisplayStats.stats.waterGoal || 2500} ml</span>
                        {monthDisplayStats.mode !== 'day' && (
                          <span className="text-[10px] font-normal text-Malama-muted dark:text-slate-500 ml-1">/dia</span>
                        )}
                      </span>
                      {(() => {
                        const wg = monthDisplayStats.stats.waterGoal || 2500;
                        const wi = monthDisplayStats.stats.waterIntake || 0;
                        const filled = Math.round((wi / wg) * 8);
                        return (
                          <div className="mt-3 flex gap-1.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className={`flex-1 h-2 rounded-full ${i < filled ? 'bg-sky-400' : 'bg-Malama-pastel-orange dark:bg-slate-700/50'}`} />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Refeições ── */}
                <div className="px-6">
                  <h3 className="text-sm font-bold text-Malama-main dark:text-white mb-3">{t.week.meals}</h3>
                  {selectedDayMeals.length > 0 ? (
                    <DailyMealsList
                      meals={selectedDayMeals}
                      onDeleteMeal={onDeleteMeal}
                      onEditMeal={onEditMeal}
                    />
                  ) : (
                    <div className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-Malama-border dark:border-transparent text-center">
                      <span className="text-4xl mb-2 block">🗓️</span>
                      <p className="text-sm text-Malama-muted dark:text-slate-400">
                        {selectedWeekIndex !== null ? 'Selecione um dia para ver refeições' : 'Selecione uma semana'}
                      </p>
                    </div>
                  )}
                </div>

                {/* placeholder to keep the old month chart code below from rendering — replaced block ends here */}
                {false && <div className="hidden">
                {/* Weekly Rhythm Chart */}
                <div className="px-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-Malama-main dark:text-white text-lg font-bold">{t.flowScore.weeklyRhythm}</h2>
                    <button className="text-Malama-muted dark:text-white/40 hover:text-Malama-main dark:hover:text-white transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                  <div className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-Malama-border dark:border-white/5 rounded-2xl p-5 w-full">
                    <div className="flex items-end justify-between gap-4 mb-2">
                      <div>
                        <p className="text-Malama-muted dark:text-white/40 text-xs font-medium uppercase tracking-wider">{t.flowScore.consistency}</p>
                        <p className="text-2xl font-bold text-Malama-main dark:text-white">{consistency.label}</p>
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
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className="text-[#3b0764] dark:text-[#7e22ce]" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-[#3b0764] dark:text-[#7e22ce]" />
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
                        <path d={chartPaths.line} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-[#3b0764] dark:stroke-[#7e22ce]" />
                        {/* Current Point */}
                        {weeklyScores.length > 0 && (() => {
                          const lastScore = weeklyScores[weeklyScores.length - 1].score;
                          const cy = 150 - (lastScore / 100) * 140 - 5;
                          return <circle cx="350" cy={cy} r="4" fill="#fff" />;
                        })()}
                      </svg>
                    </div>

                    {/* X Axis Labels */}
                    <div className="flex justify-between mt-4 text-Malama-muted dark:text-white/30 text-xs font-semibold uppercase px-1">
                      <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>
                  </div>
                </div>

                {/* Weekly Metrics Grid */}
                <div className="px-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-Malama-main dark:text-white text-lg font-bold">{t.flowScore.metrics}</h2>
                    {weeklyMetrics && (
                      <span className="text-xs text-Malama-muted dark:text-white/40 font-medium">
                        {weeklyMetrics.daysLogged}/7 dias registrados
                      </span>
                    )}
                  </div>

                  {weeklyMetrics ? (() => {
                    const wTarget = waterGoalState || 2500;
                    const pTarget = stats.targetMacros.protein || 1;
                    const cTarget = stats.targetCalories || 1;
                    const cards = [
                      {
                        icon: 'water_drop',
                        color: 'text-blue-400',
                        bg: 'bg-blue-400',
                        label: t.flowScore.hydration,
                        value: (weeklyMetrics.avgWaterMl / 1000).toFixed(1),
                        unit: 'L/dia',
                        target: (wTarget / 1000).toFixed(1) + 'L',
                        pct: Math.min((weeklyMetrics.avgWaterMl / wTarget) * 100, 100),
                      },
                      {
                        icon: 'egg',
                        color: 'text-orange-400',
                        bg: 'bg-orange-400',
                        label: t.dashboard.protein,
                        value: weeklyMetrics.avgProtein,
                        unit: 'g/dia',
                        target: Math.round(pTarget) + 'g',
                        pct: Math.min((weeklyMetrics.avgProtein / pTarget) * 100, 100),
                      },
                      {
                        icon: 'local_fire_department',
                        color: 'text-yellow-500',
                        bg: 'bg-yellow-400',
                        label: t.flowScore.energy,
                        value: (weeklyMetrics.avgCalories / 1000).toFixed(1),
                        unit: 'k/dia',
                        target: (cTarget / 1000).toFixed(1) + 'k',
                        pct: Math.min((weeklyMetrics.avgCalories / cTarget) * 100, 100),
                      },
                    ];
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        {cards.map(card => (
                          <div key={card.label} className="bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                            <span className={`material-symbols-outlined text-xl ${card.color}`}>{card.icon}</span>
                            <div>
                              <p className="text-[10px] font-semibold text-Malama-muted dark:text-white/40 uppercase tracking-wide mb-1">{card.label}</p>
                              <p className="text-xl font-bold text-Malama-main dark:text-white leading-none">
                                {card.value}<span className="text-xs font-medium text-Malama-muted dark:text-white/40 ml-0.5">{card.unit}</span>
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="w-full bg-gray-100 dark:bg-white/10 h-1 rounded-full overflow-hidden">
                                <div className={`h-full ${card.bg} rounded-full transition-all duration-700`} style={{ width: `${card.pct}%` }} />
                              </div>
                              <p className="text-[10px] text-Malama-muted dark:text-white/30">meta {card.target}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })() : (
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/5 rounded-2xl p-4 h-32 animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>
                </div>}
              </>
            )}
          </>
        )
        }

        {/* Actions */}
        <div className="w-full mt-auto mb-6 flex flex-col gap-4 px-6">


          <button
            onClick={onShareClick}
            className="w-full bg-transparent hover:bg-white/40 dark:hover:bg-white/5 text-Malama-muted dark:text-slate-400 font-semibold h-12 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
            {t.dashboard.shareMyDay}
          </button>
        </div>
      </main >

      {/* Daily Check-in Modal */}
      {
        showCheckinModal && (
          <DailyCheckinModal
            onClose={() => setShowCheckinModal(false)}
            onComplete={() => {
              setShowCheckinModal(false);
              loadGameStats();
            }}
          />
        )
      }



    </div >
  );
};
