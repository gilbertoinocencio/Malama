import React from 'react';
import { motion } from 'framer-motion';
import { DailyStats, Meal } from '../types';
import { useLanguage } from '../i18n';

interface WeekDaysCircleProps {
  weekDays: {
    date: string;
    dayName: string;
    dayNumber: number;
    stats: DailyStats | null;
    meals: Meal[];
    isToday: boolean;
    isSelected: boolean;
    isFuture: boolean;
  }[];
  onDayClick: (date: string) => void;
  weeklyGoalProgress: {
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
  };
  selectedDate: string;
}

const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const WeekDaysCircle: React.FC<WeekDaysCircleProps> = ({
  weekDays,
  onDayClick,
  weeklyGoalProgress,
  selectedDate,
}) => {
  const { t } = useLanguage();

  const checkDayGoal = (stats: DailyStats | null): boolean => {
    if (!stats) return false;

    const calorieRatio = stats.consumedCalories / (stats.targetCalories || 1);
    const proteinRatio = stats.macros.protein / (stats.targetMacros.protein || 1);
    const carbsRatio = stats.macros.carbs / (stats.targetMacros.carbs || 1);
    const fatsRatio = stats.macros.fats / (stats.targetMacros.fats || 1);
    const waterRatio = (stats.waterIntake || 0) / (stats.waterGoal || 1);

    // Meta batida se todos os macros e hidratação estão pelo menos em 85%
    const macrosMet = calorieRatio >= 0.85 && proteinRatio >= 0.85 &&
      carbsRatio >= 0.85 && fatsRatio >= 0.85;
    const waterMet = waterRatio >= 0.85;

    return macrosMet && waterMet;
  };

  const getCircleColor = (stats: DailyStats | null, isFuture: boolean): string => {
    if (isFuture) return 'bg-gray-200 dark:bg-gray-700';
    if (!stats) return 'bg-gray-300 dark:bg-gray-600';

    const goalMet = checkDayGoal(stats);
    return goalMet
      ? 'bg-gradient-to-br from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600'
      : 'bg-gradient-to-br from-orange-400 to-amber-500 dark:from-orange-500 dark:to-amber-600';
  };

  const getRingColor = (stats: DailyStats | null, isFuture: boolean): string => {
    if (isFuture) return 'ring-gray-200 dark:ring-gray-700';
    if (!stats) return 'ring-gray-300 dark:ring-gray-600';

    const goalMet = checkDayGoal(stats);
    return goalMet
      ? 'ring-emerald-400 dark:ring-emerald-500'
      : 'ring-orange-400 dark:ring-orange-500';
  };

  return (
    <div className="px-6 py-4">
      {/* Weekly Progress Circle */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative size-48">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#weeklyGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - weeklyGoalProgress.daysMet / Math.max(weeklyGoalProgress.totalDays, 1))}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="weeklyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-nura-main dark:text-white">
              {weeklyGoalProgress.daysMet}/{weeklyGoalProgress.totalDays}
            </span>
            <span className="text-[10px] text-nura-muted dark:text-slate-400 font-medium uppercase tracking-wide">
              {t.week.daysCompleted}
            </span>
          </div>
        </div>
      </div>

      {/* Week Days Circles */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {weekDays.map((day, index) => {
          const goalMet = checkDayGoal(day.stats);
          const isSelected = day.date === selectedDate;

          return (
            <motion.button
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !day.isFuture && onDayClick(day.date)}
              disabled={day.isFuture}
              className={`flex flex-col items-center gap-2 min-w-[48px] cursor-pointer transition-all duration-200 ${day.isFuture ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
            >
              <div className="relative">
                <div
                  className={`size-12 rounded-full flex items-center justify-center ring-2 transition-all duration-300 ${isSelected
                      ? 'ring-4 ring-nura-petrol dark:ring-primary scale-110'
                      : getRingColor(day.stats, day.isFuture)
                    }`}
                >
                  <div
                    className={`size-10 rounded-full flex items-center justify-center ${getCircleColor(day.stats, day.isFuture)
                      }`}
                  >
                    <span className={`text-xs font-bold ${day.isFuture || !day.stats
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-white'
                      }`}>
                      {day.dayNumber}
                    </span>
                  </div>
                </div>
                {goalMet && !day.isFuture && (
                  <div className="absolute -top-1 -right-1 size-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-emerald-500 text-xs">
                      check
                    </span>
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${day.isToday
                  ? 'text-nura-petrol dark:text-primary'
                  : day.isFuture
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-nura-muted dark:text-slate-400'
                }`}>
                {day.isToday ? 'Hoje' : day.dayName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
