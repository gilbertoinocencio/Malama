import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WeekDay, DailyStats } from '../types';

interface WeekDaysCircleProps {
  weekDays: WeekDay[];
  onDayClick: (date: string) => void;
  selectedDate: string;
}

// --- helpers -----------------------------------------------------------

const checkDayGoal = (stats: DailyStats | null): boolean => {
  if (!stats) return false;
  const calRatio = stats.consumedCalories / (stats.targetCalories || 1);
  const pRatio   = stats.macros.protein / (stats.targetMacros.protein || 1);
  const cRatio   = stats.macros.carbs   / (stats.targetMacros.carbs   || 1);
  const fRatio   = stats.macros.fats    / (stats.targetMacros.fats    || 1);
  const wRatio   = (stats.waterIntake || 0) / (stats.waterGoal || 1);
  return (
    calRatio >= 0.85 &&
    pRatio   >= 0.85 &&
    cRatio   >= 0.85 &&
    fRatio   >= 0.85 &&
    wRatio   >= 0.85
  );
};

/** 0 – 1 based on average macro + hydration progress */
const getDayProgress = (stats: DailyStats | null): number => {
  if (!stats) return 0;
  const r = (n: number, t: number) => Math.min(n / (t || 1), 1);
  return (
    r(stats.consumedCalories,        stats.targetCalories) +
    r(stats.macros.protein,          stats.targetMacros.protein) +
    r(stats.macros.carbs,            stats.targetMacros.carbs) +
    r(stats.macros.fats,             stats.targetMacros.fats) +
    r(stats.waterIntake || 0,        stats.waterGoal || 1)
  ) / 5;
};

// SVG arc path (circumference ≈ 100 so strokeDasharray maps to %)
const ARC = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

// -----------------------------------------------------------------------

export const WeekDaysCircle: React.FC<WeekDaysCircleProps> = ({
  weekDays,
  onDayClick,
  selectedDate,
}) => {
  return (
    <div className="px-4 py-3">
      <div className="flex items-end justify-between">
        {weekDays.map((day, index) => {
          const isSelected  = day.date === selectedDate;
          const isClickable = !day.isFuture;

          // A day "has data" only if at least some calories were consumed
          const hasData = !day.isFuture && !!day.stats && day.stats.consumedCalories > 0;
          const goalMet = hasData && checkDayGoal(day.stats);
          const progress = hasData ? getDayProgress(day.stats) : 0;
          // clamp to [1, 100] when hasData so we always see at least a sliver
          const pct = hasData ? Math.max(Math.round(progress * 100), 4) : 0;

          // ---- colours --------------------------------------------------
          // Ring stroke colour
          const ringStroke = goalMet
            ? '#10b981'   // emerald-500
            : hasData
              ? '#f59e0b'   // amber-500
              : '#d1d5db';  // gray-300  (no data / future)

          // Inner fill colour
          const innerFill = isSelected
            ? '#ffffff'
            : goalMet
              ? '#ecfdf5'   // emerald tint
              : hasData
                ? '#fffbeb'   // amber tint
                : '#f9fafb';  // gray-50

          // Number colour
          const numClass = isSelected
            ? 'font-bold text-Malama-main dark:text-gray-800'
            : goalMet
              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
              : hasData
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : day.isFuture
                  ? 'text-gray-300 dark:text-gray-600'
                  : 'text-gray-400 dark:text-gray-500';

          // Label colour
          const labelClass = day.isToday || isSelected
            ? 'text-Malama-petrol dark:text-primary font-semibold'
            : day.isFuture
              ? 'text-gray-300 dark:text-gray-600'
              : 'text-gray-400 dark:text-gray-500';

          return (
            <motion.button
              key={day.date}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.22 }}
              onClick={() => isClickable && onDayClick(day.date)}
              disabled={!isClickable}
              className={`
                flex flex-col items-center gap-1 flex-1 min-w-0
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Day label — above the circle */}
              <span className={`text-[10px] leading-none ${labelClass}`}>
                {day.isToday ? 'Hoje' : day.dayName}
              </span>

              {/* SVG circle */}
              <div className={`relative transition-transform duration-150 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 36 36"
                  className="-rotate-90"
                >
                  {/* Track (background ring) */}
                  <path
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2.2"
                    strokeDasharray={day.isFuture ? '3 3' : undefined}
                    d={ARC}
                    className="dark:stroke-slate-700"
                  />

                  {/* Progress arc — only rendered when there is data */}
                  {hasData && (
                    <path
                      fill="none"
                      stroke={ringStroke}
                      strokeWidth="2.2"
                      strokeLinecap="butt"
                      strokeDasharray={`${pct}, 100`}
                      d={ARC}
                      style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
                    />
                  )}

                  {/* Selected day extra ring */}
                  {isSelected && (
                    <path
                      fill="none"
                      stroke={goalMet ? '#10b981' : hasData ? '#f59e0b' : '#6366f1'}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeDasharray="100, 100"
                      d={ARC}
                      opacity="0.35"
                    />
                  )}

                  {/* Inner filled circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="13.5"
                    fill={innerFill}
                  />
                </svg>

                {/* Day number */}
                <span
                  className={`
                    absolute inset-0 flex items-center justify-center
                    text-[13px] leading-none select-none
                    ${numClass}
                  `}
                >
                  {day.dayNumber}
                </span>

                {/* Goal-met badge */}
                <AnimatePresence>
                  {goalMet && (
                    <motion.div
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm"
                    >
                      <span className="material-symbols-outlined text-white leading-none" style={{ fontSize: 9 }}>
                        check
                      </span>
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
