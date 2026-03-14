import { supabase } from './supabase';
import { DailyStats } from '../types';
import { INITIAL_STATS } from '../constants';
import { MealService } from './mealService';

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
        const meals = await MealService.getMeals(userId, date);

        // Fetch User Profile for Targets
        const { data: profile } = await supabase
            .from('profiles')
            .select('target_calories, target_protein, target_carbs, target_fats')
            .eq('id', userId)
            .single();

        const targets = profile || {
            target_calories: 2000,
            target_protein: 150,
            target_carbs: 200,
            target_fats: 65
        };

        const consumed = meals.reduce((acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.macros.protein,
            carbs: acc.carbs + meal.macros.carbs,
            fats: acc.fats + meal.macros.fats
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const flowScore = this.calculateFlowScore(consumed, targets);

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
            flowScore
        };
    }
};
