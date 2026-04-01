import { supabase } from './supabase';
import { DailyStats, MicroNutrients } from '../types';
import { INITIAL_STATS } from '../constants';
import { MealService } from './mealService';
import { getLocalDateString } from '../utils/dateUtils';

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
                .select('target_calories, target_protein, target_carbs, target_fats, weight, activity_level')
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

        const targets = {
            target_calories,
            target_protein,
            target_carbs,
            target_fats
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
            targetCalories: targets.target_calories,
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
        };
    }
};
