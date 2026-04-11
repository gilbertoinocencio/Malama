import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyStats, Meal } from '../types';

interface WeekDay {
  date: string;
  dayName: string;
  dayNumber: number;
  stats: DailyStats | null;
  meals: Meal[];
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
}

interface WeekDaysCircleProps {
  weekDays: WeekDay[];
  onDayClick: (date: string) => void;
  selectedDate: string;
}

const checkDayGoal = (stats: DailyStats | null): boolean => {
  if (!stats) return false;
  const calRatio = stats.consumedCalories / (stats.targetCalories || 1);
  const pRatio = stats.macros.protein / (stats.targetMacros.protein || 1);
  const cRatio = stats.macros.carbs / (stats.targetMacros.carbs || 1);
  const fRatio = stats.macros.fats / (stats.targetMacros.fats || 1);
  const wRatio = (stats.waterIntake || 0) / (stats.waterGoal || 1);
  return calRatio >= 0.85 && pRatio >= 0.85 && cRatio >= 0.85 && fRatio >= 0.85 && wRatio >= 0.85;
};

const getPartialProgress = (stats: DailyStats | null): number => {
  if (!stats) return 0;
  const calRatio = Math.min(stats.consumedCalories / (stats.targetCalories || 1), 1);
  const pRatio = Math.min(stats.macros.protein / (stats.targetMacros.protein || 1), 1);
  const cRatio = Math.min(stats.macros.carbs / (stats.targetMacros.carbs || 1), 1);
  const fRatio = Math.min(stats.macros.fats / (stats.targetMacros.fats || 1), 1);
  const wRatio = Math.min((stats.waterIntake || 0) / (stats.waterGoal || 1), 1);
  return (calRatio + pRatio + cRatio + fRatio + wRatio) / 5;
};

export const WeekDaysCircle: React.FC<WeekDaysCircleProps> = ({
  weekDays,
  onDayClick,
  selectedDate,
}) => {
  return (
    <div className="px-4 py-2">
      <div className="flex items-end justify-between gap-1">
        {weekDays.map((day, index) => {
          const goalMet = !day.isFuture && checkDayGoal(day.stats);
          const hasData = !day.isFuture && day.stats && day.stats.consumedCalories > 0;
          const progress = hasData ? getPartialProgress(day.stats) : 0;
          const isSelected = day.date === selectedDate;
          const isClickable = !day.isFuture;

          // Ring color: green = goal met, amber = partial, gray = no data / future
          const ringColor = day.isFuture
            ? 'transparent'
            : goalMet
              ? '#10b981'   // emerald
              : hasData
                ? '#f59e0b'   // amber
                : '#e5e7eb';  // gray-200

          // Circle fill
          const circleBg = isSelected
            ? 'bg-white dark:bg-white shadow-lg'
            : day.isFuture
              ? 'bg-gray-100 dark:bg-slate-800'
              : !hasData
                ? 'bg-gray-100 dark:bg-slate-800'
                : goalMet
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-amber-50 dark:bg-amber-900/20';

          const textColor = isSelected
            ? 'text-nura-main dark:text-gray-900 font-bold'
            : day.isFuture
              ? 'text-gray-300 dark:text-slate-600'
              : !hasData
                ? 'text-gray-400 dark:text-slate-500'
                : goalMet
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-amber-700 dark:text-amber-400 font-semibold';

          const labelColor = isSelected
            ? 'text-nura-petrol dark:text-primary font-bold'
            : day.isToday
              ? 'text-nura-petrol dark:text-primary font-semibold'
              : day.isFuture
                ? 'text-gray-300 dark:text-slate-600'
                : 'text-nura-muted dark:text-slate-400';

          // SVG ring values (viewBox 36x36, r=15.9155 → circumference ≈ 100)
          const ringProgress = hasData ? Math.round(progress * 100) : 0;

          return (
            <motion.button
              key={day.date}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
              onClick={() => isClickable && onDayClick(day.date)}
              disabled={!isClickable}
              className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
            >
              {/* Day label (above circle) */}
              <span className={`text-[10px] tracking-wide ${labelColor}`}>
                {day.isToday ? 'Hoje' : day.dayName}
              </span>

              {/* Circle with SVG ring */}
              <div className="relative">
                {/* SVG progress ring */}
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 36 36"
                  className={`-rotate-90 ${isSelected ? 'drop-shadow-md' : ''}`}
                >
                  {/* Background ring */}
                  <path
                    fill="none"
                    stroke={day.isFuture ? '#f3f4f6' : '#e5e7eb'}
                    strokeWidth="2.5"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    className="dark:opacity-20"
                  />
                  {/* Progress ring */}
                  {!day.isFuture && (
                    <path
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${goalMet ? 100 : ringProgress}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                  )}
                  {/* White fill circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    fill={isSelected ? 'white' : day.isFuture ? '#f9fafb' : hasData ? (goalMet ? '#ecfdf5' : '#fffbeb') : '#f9fafb'}
                    className={isSelected ? 'dark:fill-white' : day.isFuture ? 'dark:fill-slate-800' : hasData ? (goalMet ? 'dark:fill-emerald-900/20' : 'dark:fill-amber-900/20') : 'dark:fill-slate-800'}
                  />
                </svg>

                {/* Day number centered in the circle */}
                <span
                  className={`absolute inset-0 flex items-center justify-center text-sm leading-none ${textColor}`}
                  style={{ paddingBottom: '1px' }}
                >
                  {day.dayNumber}
                </span>

                {/* Goal-met checkmark badge */}
                <AnimatePresence>
                  {goalMet && !day.isFuture && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 size-3.5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"
                    >
                      <span className="material-symbols-outlined text-white text-[9px] leading-none">check</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
