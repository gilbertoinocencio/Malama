import { supabase } from './supabase';
import { DailyStats, MicroNutrients, WeekDay, MonthWeek, MonthSummary } from '../types';
import { INITIAL_STATS } from '../constants';
import { MealService } from './mealService';
import { getLocalDateString } from '../utils/dateUtils';
import { IntegrationService } from './integrationService';

/** Aderência dos últimos 7 dias — contexto semanal do feedback da agente. */
export interface WeeklySummary {
    /** Dias com pelo menos uma refeição registrada nos últimos 7. */
    daysLogged: number;
    avgCalories: number;
    avgProtein: number;
    avgWaterMl: number;
    /** Dias dentro de 85%–115% da meta calórica. */
    daysOnTarget: number;
    targetCalories: number;
    targetProtein: number;
}

// Shared helper: returns true if all macro + hydration goals are ≥ 85%
export const checkDayGoalMet = (stats: DailyStats | null): boolean => {
  if (!stats) return false;
  const calRatio = stats.consumedCalories / (stats.targetCalories || 1);
  const pRatio   = stats.macros.protein / (stats.targetMacros.protein || 1);
  const cRatio   = stats.macros.carbs   / (stats.targetMacros.carbs   || 1);
  const fRatio   = stats.macros.fats    / (stats.targetMacros.fats    || 1);
  const wRatio   = (stats.waterIntake || 0) / (stats.waterGoal || 1);
  return calRatio >= 0.85 && pRatio >= 0.85 && cRatio >= 0.85 && fRatio >= 0.85 && wRatio >= 0.85;
};

export const StatsService = {
    // Calculate Flow Score based on adherence
    calculateFlowScore(consumed: any, targets: any): number {
        const calculateSubScore = (current: number, target: number) => {
            if (target === 0) return 0;
            const ratio = current / target;

            // Under-eating phase (climbing to flow)
            if (ratio < 0.85) return ratio * 100;

            // Flow Zone (85% to 115%)
            if (ratio >= 0.85 && ratio <= 1.15) return 100;

            // Over-eating phase (penalize)
            if (ratio > 1.15) {
                const penalty = (ratio - 1.15) * 100;
                return Math.max(0, 100 - penalty);
            }
            return 0;
        };

        const calScore = calculateSubScore(consumed.calories, targets.target_calories);

        const pScore = calculateSubScore(consumed.protein, targets.target_protein);
        const cScore = calculateSubScore(consumed.carbs, targets.target_carbs);
        const fScore = calculateSubScore(consumed.fats, targets.target_fats);

        const macroScore = (pScore + cScore + fScore) / 3;

        // Weighted Average: 60% Calories, 40% Macros
        return Math.round((calScore * 0.6) + (macroScore * 0.4));
    },

    // Calculate stats from meals for a specific day
    async getDailyStats(userId: string, date: Date = new Date()): Promise<DailyStats> {
        const dateStr = getLocalDateString(date);

        const [meals, { data: profile }, { data: waterLog }] = await Promise.all([
            MealService.getMeals(userId, date),
            supabase
                .from('profiles')
                .select('target_calories, target_protein, target_carbs, target_fats, weight, activity_level, goal, primary_goal')
                .eq('id', userId)
                .maybeSingle(),
            supabase
                .from('daily_logs')
                .select('water_intake, water_goal')
                .eq('user_id', userId)
                .eq('date', dateStr)
                .maybeSingle(),
        ]);

        const waterIntake = waterLog?.water_intake ?? 0;
        const waterGoal = waterLog?.water_goal ?? (() => {
            const weight = profile?.weight || 70;
            const base = Math.max(3000, Math.round(weight * 35));
            const bonus = profile?.activity_level === 'intense' ? 600 : profile?.activity_level === 'moderate' ? 300 : 0;
            return base + bonus;
        })();

        // Check if there is an active AI-generated plan to override targets
        const { data: activePlan } = await supabase
            .from('quarterly_plans')
            .select('content')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let target_calories = profile?.target_calories ?? 2000;
        let target_protein = profile?.target_protein ?? 150;
        let target_carbs = profile?.target_carbs ?? 200;
        let target_fats = profile?.target_fats ?? 65;

        if (activePlan?.content) {
            target_calories = activePlan.content.calories || target_calories;
            target_protein = activePlan.content.macros?.protein || target_protein;
            target_carbs = activePlan.content.macros?.carbs || target_carbs;
            target_fats = activePlan.content.macros?.fats || target_fats;
        }

        // Buscar calorias queimadas em atividades do dia (Strava, Google Fit, etc.)
        const activityCalories = await IntegrationService.getActivityCaloriesToday(userId, dateStr);

        // Apenas manter_peso e ganhar_peso aumentam a meta calórica com a atividade.
        // perder_peso mantém a meta original — as calorias queimadas viram déficit extra.
        // profile.goal: 'aesthetic'=perder, 'performance'=ganhar, 'health'=manter.
        // O select não trazia a coluna `goal`, então isto caía sempre em
        // 'aesthetic' e a atividade NUNCA era somada à meta de ninguém.
        // primary_goal vem do onboarding com outro vocabulário
        // ('perder_peso'/'ganhar_peso'/...); normalizado igual ao
        // profileService, que já convive com os dois.
        const profileGoal = String(profile?.goal ?? profile?.primary_goal ?? 'aesthetic');
        const querPerderPeso = profileGoal === 'aesthetic' || profileGoal.includes('perder');
        const applyActivityToTarget = !querPerderPeso && activityCalories > 0;

        const extraCarbs   = applyActivityToTarget ? Math.round(activityCalories * 0.55 / 4) : 0;
        const extraProtein = applyActivityToTarget ? Math.round(activityCalories * 0.20 / 4) : 0;
        const extraFat     = applyActivityToTarget ? Math.round(activityCalories * 0.25 / 9) : 0;
        const effectiveTargetCalories = applyActivityToTarget
            ? target_calories + activityCalories
            : target_calories;

        const targets = {
            target_calories: effectiveTargetCalories,
            target_protein:  target_protein + extraProtein,
            target_carbs:    target_carbs + extraCarbs,
            target_fats:     target_fats + extraFat,
        };

        const consumed = meals.reduce((acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.macros.protein,
            carbs: acc.carbs + meal.macros.carbs,
            fats: acc.fats + meal.macros.fats
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const nutritionScore = this.calculateFlowScore(consumed, targets);
        const hydrationRatio = waterGoal > 0 ? waterIntake / waterGoal : 0;
        const hydrationScore = hydrationRatio >= 0.85 && hydrationRatio <= 1.15 ? 100
            : hydrationRatio < 0.85 ? hydrationRatio * 100
                : Math.max(0, 100 - (hydrationRatio - 1.15) * 100);
        // Weighting: 50% nutrition (calorias) + 30% macros + 20% hidratação
        // nutritionScore already uses 60/40 split internally; re-weight to include hydration
        const flowScore = Math.round(nutritionScore * 0.8 + hydrationScore * 0.2);

        // Aggregate micronutrients from all meal items
        const micronutrients: Partial<MicroNutrients> = {};
        for (const meal of meals) {
            for (const item of (meal.items || [])) {
                const m = (item as any).micros as Partial<MicroNutrients> | undefined;
                if (m) {
                    for (const [key, val] of Object.entries(m)) {
                        if (typeof val === 'number' && val > 0) {
                            const k = key as keyof MicroNutrients;
                            micronutrients[k] = ((micronutrients[k] as number) || 0) + val;
                        }
                    }
                }
            }
        }

        return {
            consumedCalories: consumed.calories,
            targetCalories: effectiveTargetCalories,
            macros: {
                protein: consumed.protein,
                carbs: consumed.carbs,
                fats: consumed.fats
            },
            targetMacros: {
                protein: targets.target_protein,
                carbs: targets.target_carbs,
                fats: targets.target_fats
            },
            flowScore,
            micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
            waterIntake,
            waterGoal,
            activityCalories: activityCalories > 0 ? activityCalories : undefined,
            activityCaloriesApplied: activityCalories > 0 ? applyActivityToTarget : undefined,
        };
    },

    /**
     * Resumo leve dos últimos 7 dias (2 consultas) para dar contexto SEMANAL ao
     * feedback da agente. Não usa getWeekStats de propósito: aquele roda
     * getDailyStats 7x (dezenas de consultas + integrações) e travaria a resposta
     * logo depois de registrar uma refeição.
     */
    async getWeeklySummary(userId: string): Promise<WeeklySummary> {
        const since = new Date();
        since.setDate(since.getDate() - 6);
        since.setHours(0, 0, 0, 0);

        const [{ data: meals }, { data: logs }, { data: profile }, { data: activePlan }] = await Promise.all([
            supabase.from('meals').select('calories, protein, created_at')
                .eq('user_id', userId).gte('created_at', since.toISOString()),
            supabase.from('daily_logs').select('water_intake, date')
                .eq('user_id', userId).gte('date', getLocalDateString(since)),
            supabase.from('profiles').select('target_calories, target_protein')
                .eq('id', userId).maybeSingle(),
            supabase.from('quarterly_plans').select('content')
                .eq('user_id', userId).eq('status', 'active')
                .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        // Plano ativo manda na meta, igual getDailyStats.
        const targetCalories = activePlan?.content?.calories || profile?.target_calories || 2000;
        const targetProtein = activePlan?.content?.macros?.protein || profile?.target_protein || 150;

        const byDay = new Map<string, { calories: number; protein: number }>();
        for (const meal of meals ?? []) {
            const day = getLocalDateString(new Date(meal.created_at));
            const acc = byDay.get(day) ?? { calories: 0, protein: 0 };
            acc.calories += Number(meal.calories || 0);
            acc.protein += Number(meal.protein || 0);
            byDay.set(day, acc);
        }

        const daysLogged = byDay.size;
        const totals = [...byDay.values()].reduce(
            (acc, d) => ({ calories: acc.calories + d.calories, protein: acc.protein + d.protein }),
            { calories: 0, protein: 0 },
        );
        // "Dia na meta" = mesma faixa de aderência do flow score (85%–115%).
        const daysOnTarget = [...byDay.values()].filter(d => {
            const ratio = d.calories / (targetCalories || 1);
            return ratio >= 0.85 && ratio <= 1.15;
        }).length;

        const waterDays = (logs ?? []).filter(l => Number(l.water_intake || 0) > 0);
        const avgWaterMl = waterDays.length > 0
            ? Math.round(waterDays.reduce((s, l) => s + Number(l.water_intake || 0), 0) / waterDays.length)
            : 0;

        return {
            daysLogged,
            avgCalories: daysLogged > 0 ? Math.round(totals.calories / daysLogged) : 0,
            avgProtein: daysLogged > 0 ? Math.round(totals.protein / daysLogged) : 0,
            avgWaterMl,
            daysOnTarget,
            targetCalories,
            targetProtein,
        };
    },

    // Get stats for all 7 days of the current week
    async getWeekStats(userId: string): Promise<{ date: string; stats: DailyStats; meals: any[] }[]> {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        const weekDays: { date: string; stats: DailyStats; meals: any[] }[] = [];

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            const dateStr = getLocalDateString(currentDate);

            const stats = await this.getDailyStats(userId, currentDate);

            // Use the same local-timezone window as MealService.getMeals to avoid UTC offset issues
            const startOfDay = new Date(currentDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(currentDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: meals } = await supabase
                .from('meals')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startOfDay.toISOString())
                .lte('created_at', endOfDay.toISOString())
                .order('created_at', { ascending: true });

            weekDays.push({
                date: dateStr,
                stats,
                meals: meals || []
            });
        }

        return weekDays;
    },

    // Get cumulative weekly goal progress
    async getWeeklyGoalProgress(userId: string): Promise<{
        caloriesConsumed: number;
        caloriesTarget: number;
        proteinConsumed: number;
        proteinTarget: number;
        carbsConsumed: number;
        carbsTarget: number;
        fatsConsumed: number;
        fatsTarget: number;
        waterConsumed: number;
        waterTarget: number;
        daysMet: number;
        totalDays: number;
    }> {
        const weekStats = await this.getWeekStats(userId);
        const today = getLocalDateString(new Date());
        const daysElapsed = weekStats.findIndex(d => d.date === today) + 1;
        const daysToConsider = Math.max(daysElapsed, 1);

        let totals = {
            caloriesConsumed: 0,
            caloriesTarget: 0,
            proteinConsumed: 0,
            proteinTarget: 0,
            carbsConsumed: 0,
            carbsTarget: 0,
            fatsConsumed: 0,
            fatsTarget: 0,
            waterConsumed: 0,
            waterTarget: 0,
        };

        let daysMet = 0;

        for (let i = 0; i < daysElapsed; i++) {
            const day = weekStats[i];
            totals.caloriesConsumed += day.stats.consumedCalories;
            totals.caloriesTarget += day.stats.targetCalories;
            totals.proteinConsumed += day.stats.macros.protein;
            totals.proteinTarget += day.stats.targetMacros.protein;
            totals.carbsConsumed += day.stats.macros.carbs;
            totals.carbsTarget += day.stats.targetMacros.carbs;
            totals.fatsConsumed += day.stats.macros.fats;
            totals.fatsTarget += day.stats.targetMacros.fats;
            totals.waterConsumed += day.stats.waterIntake || 0;
            totals.waterTarget += day.stats.waterGoal || 0;

            // Check if day met all goals
            const calorieRatio = day.stats.consumedCalories / (day.stats.targetCalories || 1);
            const proteinRatio = day.stats.macros.protein / (day.stats.targetMacros.protein || 1);
            const carbsRatio = day.stats.macros.carbs / (day.stats.targetMacros.carbs || 1);
            const fatsRatio = day.stats.macros.fats / (day.stats.targetMacros.fats || 1);
            const waterRatio = (day.stats.waterIntake || 0) / (day.stats.waterGoal || 1);

            const macrosMet = calorieRatio >= 0.85 && proteinRatio >= 0.85 &&
                carbsRatio >= 0.85 && fatsRatio >= 0.85;
            const waterMet = waterRatio >= 0.85;

            if (macrosMet && waterMet) {
                daysMet++;
            }
        }

        // If goals not met, they carry over to next days
        // Calculate how many days still need to complete their goals
        const daysRemaining = 7 - daysMet;
        const totalDays = daysElapsed > 0 ? daysMet + daysRemaining : 7;

        return {
            ...totals,
            daysMet,
            totalDays: 7,
        };
    },

    // Get all weeks of a given month, with per-day stats computed from 4 batched Supabase queries
    async getMonthStats(
        userId: string,
        year: number,
        month: number // 0-based JS month
    ): Promise<{ weeks: MonthWeek[]; monthSummary: MonthSummary }> {
        const today = new Date();
        const todayStr = getLocalDateString(today);

        // Calendar grid: Sunday on or before month start → Saturday on or after month end
        const monthStart = new Date(year, month, 1);
        const monthEnd   = new Date(year, month + 1, 0); // last day of month

        const gridStart = new Date(monthStart);
        gridStart.setDate(monthStart.getDate() - monthStart.getDay()); // back to Sunday
        gridStart.setHours(0, 0, 0, 0);

        const gridEnd = new Date(monthEnd);
        const daysToSat = 6 - monthEnd.getDay();
        gridEnd.setDate(monthEnd.getDate() + daysToSat); // forward to Saturday
        gridEnd.setHours(23, 59, 59, 999);

        const gridStartStr = getLocalDateString(gridStart);
        const gridEndStr   = getLocalDateString(gridEnd);

        // ── 4 parallel Supabase queries ──────────────────────────────────────
        const [
            { data: profile },
            { data: activePlan },
            { data: rawMeals },
            { data: waterLogs },
        ] = await Promise.all([
            supabase
                .from('profiles')
                .select('target_calories, target_protein, target_carbs, target_fats, weight, activity_level')
                .eq('id', userId)
                .maybeSingle(),
            supabase
                .from('quarterly_plans')
                .select('content')
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('meals')
                .select('id, name, calories, protein, carbs, fats, type, created_at, items, image_url')
                .eq('user_id', userId)
                .gte('created_at', gridStart.toISOString())
                .lte('created_at', gridEnd.toISOString())
                .order('created_at', { ascending: true }),
            supabase
                .from('daily_logs')
                .select('date, water_intake, water_goal')
                .eq('user_id', userId)
                .gte('date', gridStartStr)
                .lte('date', gridEndStr),
        ]);

        // ── Resolve targets ──────────────────────────────────────────────────
        let target_calories = profile?.target_calories ?? 2000;
        let target_protein  = profile?.target_protein  ?? 150;
        let target_carbs    = profile?.target_carbs    ?? 200;
        let target_fats     = profile?.target_fats     ?? 65;
        if (activePlan?.content) {
            target_calories = activePlan.content.calories          || target_calories;
            target_protein  = activePlan.content.macros?.protein   || target_protein;
            target_carbs    = activePlan.content.macros?.carbs     || target_carbs;
            target_fats     = activePlan.content.macros?.fats      || target_fats;
        }
        const targets = { target_calories, target_protein, target_carbs, target_fats };

        const defaultWaterGoal = (() => {
            const weight = profile?.weight || 70;
            const base = Math.max(3000, Math.round(weight * 35));
            const bonus = profile?.activity_level === 'intense' ? 600
                : profile?.activity_level === 'moderate' ? 300 : 0;
            return base + bonus;
        })();

        // ── Build lookup maps ────────────────────────────────────────────────
        const mealsByDate = new Map<string, typeof rawMeals>();
        for (const meal of rawMeals || []) {
            const d = getLocalDateString(new Date(meal.created_at));
            if (!mealsByDate.has(d)) mealsByDate.set(d, []);
            mealsByDate.get(d)!.push(meal);
        }
        const waterByDate = new Map<string, { water_intake: number; water_goal: number }>();
        for (const log of waterLogs || []) {
            waterByDate.set(log.date, { water_intake: log.water_intake, water_goal: log.water_goal });
        }

        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        // ── Build weeks ──────────────────────────────────────────────────────
        const weeks: MonthWeek[] = [];
        let cursor = new Date(gridStart);
        let weekIdx = 0;

        while (cursor <= gridEnd) {
            const weekStartDate = getLocalDateString(cursor);
            const days: WeekDay[] = [];

            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(cursor);
                const dateStr = getLocalDateString(dayDate);
                const isToday  = dateStr === todayStr;
                const isFuture = dateStr > todayStr;
                const isInMonth = dayDate.getMonth() === month && dayDate.getFullYear() === year;

                let stats: DailyStats | null = null;
                let meals: any[] = [];

                if (!isFuture) {
                    const dayMeals = mealsByDate.get(dateStr) || [];
                    meals = dayMeals.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        timestamp: new Date(item.created_at),
                        calories: item.calories,
                        macros: { protein: item.protein, carbs: item.carbs, fats: item.fats },
                        type: item.type,
                        items: item.items,
                        imageUri: item.image_url,
                    }));

                    const consumed = dayMeals.reduce(
                        (acc: any, m: any) => ({
                            calories: acc.calories + m.calories,
                            protein: acc.protein + m.protein,
                            carbs: acc.carbs + m.carbs,
                            fats: acc.fats + m.fats,
                        }),
                        { calories: 0, protein: 0, carbs: 0, fats: 0 }
                    );

                    const waterLog = waterByDate.get(dateStr);
                    const waterIntake = waterLog?.water_intake ?? 0;
                    const waterGoal   = waterLog?.water_goal   ?? defaultWaterGoal;

                    const nutritionScore = this.calculateFlowScore(consumed, targets);
                    const hydrationRatio = waterGoal > 0 ? waterIntake / waterGoal : 0;
                    const hydrationScore = hydrationRatio >= 0.85 && hydrationRatio <= 1.15
                        ? 100
                        : hydrationRatio < 0.85
                            ? hydrationRatio * 100
                            : Math.max(0, 100 - (hydrationRatio - 1.15) * 100);
                    const flowScore = Math.round(nutritionScore * 0.8 + hydrationScore * 0.2);

                    stats = {
                        consumedCalories: consumed.calories,
                        targetCalories: targets.target_calories,
                        macros: { protein: consumed.protein, carbs: consumed.carbs, fats: consumed.fats },
                        targetMacros: { protein: targets.target_protein, carbs: targets.target_carbs, fats: targets.target_fats },
                        flowScore,
                        waterIntake,
                        waterGoal,
                    };
                }

                days.push({
                    date: dateStr,
                    dayName: DAY_NAMES[dayDate.getDay()],
                    dayNumber: dayDate.getDate(),
                    stats,
                    meals,
                    isToday,
                    isSelected: false,
                    isFuture,
                });

                cursor.setDate(cursor.getDate() + 1);
            }

            const weekEndDate = getLocalDateString(new Date(cursor.getTime() - 86400000));
            const daysMetGoal  = days.filter(d => checkDayGoalMet(d.stats)).length;
            const daysWithData = days.filter(d => (d.stats?.consumedCalories ?? 0) > 0).length;

            weeks.push({
                weekIndex: weekIdx,
                label: `Sem ${weekIdx + 1}`,
                startDate: weekStartDate,
                endDate: weekEndDate,
                days,
                daysMetGoal,
                daysWithData,
                isCurrent: days.some(d => d.isToday),
                isFuture: weekStartDate > todayStr,
            });

            weekIdx++;
        }

        // ── Month summary (in-month days only) ───────────────────────────────
        let totalConsumed = 0, totalTarget = 0, totalDaysMetGoal = 0, daysWithData = 0;
        for (const week of weeks) {
            for (const day of week.days) {
                const inMonth = new Date(day.date + 'T00:00:00').getMonth() === month;
                if (!inMonth || day.isFuture) continue;
                totalConsumed    += day.stats?.consumedCalories ?? 0;
                totalTarget      += targets.target_calories;
                daysWithData     += (day.stats?.consumedCalories ?? 0) > 0 ? 1 : 0;
                if (checkDayGoalMet(day.stats)) totalDaysMetGoal++;
            }
        }
        const weeksMetGoal = weeks.filter(w => w.daysMetGoal >= 5).length;

        return {
            weeks,
            monthSummary: {
                totalConsumed,
                totalTarget,
                monthProgress: totalTarget > 0 ? Math.min(totalConsumed / totalTarget, 1) : 0,
                weeksMetGoal,
                totalDaysMetGoal,
                daysWithData,
                month,
                year,
            },
        };
    },
};
