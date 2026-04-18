import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonthWeek, DailyStats } from '../types';
import { checkDayGoalMet } from '../services/statsService';

interface MonthWeeksGridProps {
  weeks: MonthWeek[];
  onWeekClick: (weekIndex: number) => void;
  selectedWeekIndex: number | null;
}

// SVG arc path — circumference ≈ 100 so strokeDasharray maps to %
const ARC = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

const dayDotColor = (stats: DailyStats | null, isFuture: boolean): string => {
  if (isFuture) return '#e5e7eb';
  if (!stats || stats.consumedCalories === 0) return '#d1d5db';
  return checkDayGoalMet(stats) ? '#10b981' : '#f59e0b';
};

export const MonthWeeksGrid: React.FC<MonthWeeksGridProps> = ({
  weeks,
  onWeekClick,
  selectedWeekIndex,
}) => {
  return (
    <div className="px-3 py-2">
      <div className="flex gap-1.5 justify-between">
        {weeks.map((week, index) => {
          const isSelected  = selectedWeekIndex === week.weekIndex;
          const isClickable = !week.isFuture;

          const hasData = !week.isFuture && week.daysWithData > 0;
          const goalMet = hasData && week.daysMetGoal >= 5;
          const pct = hasData
            ? Math.max(Math.round((week.daysMetGoal / 7) * 100), week.daysMetGoal > 0 ? 5 : 0)
            : 0;

          const ringStroke = goalMet
            ? '#10b981'
            : hasData
              ? '#f59e0b'
              : '#d1d5db';

          const innerFill = isSelected
            ? '#ffffff'
            : goalMet
              ? '#ecfdf5'
              : hasData
                ? '#fffbeb'
                : '#f9fafb';

          const numColor = isSelected
            ? '#1e3a3a'
            : goalMet
              ? '#059669'
              : hasData
                ? '#d97706'
                : week.isFuture
                  ? '#d1d5db'
                  : '#9ca3af';

          const labelClass = week.isCurrent || isSelected
            ? 'text-Malama-petrol dark:text-primary font-bold'
            : week.isFuture
              ? 'text-gray-300 dark:text-gray-600'
              : 'text-gray-400 dark:text-gray-500';

          const startDay = parseInt(week.startDate.split('-')[2], 10);
          const endDay   = parseInt(week.endDate.split('-')[2], 10);

          return (
            <motion.button
              key={week.weekIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.24 }}
              onClick={() => isClickable && onWeekClick(week.weekIndex)}
              disabled={!isClickable}
              className={`
                flex-1 flex flex-col items-center rounded-2xl py-2 px-1 transition-all duration-200
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                ${isSelected
                  ? 'bg-Malama-petrol/8 dark:bg-primary/10 shadow-sm ring-1 ring-Malama-petrol/15 dark:ring-primary/20'
                  : 'bg-transparent'}
              `}
            >
              {/* Label */}
              <span className={`text-[9px] font-semibold uppercase tracking-wide mb-1.5 ${labelClass}`}>
                {week.label}
              </span>

              {/* SVG circle */}
              <div className={`relative transition-transform duration-200 ${isSelected ? 'scale-[1.08]' : isClickable ? 'hover:scale-105' : ''}`}>
                <svg width="52" height="52" viewBox="0 0 36 36" className="-rotate-90">
                  {/* Outer glow ring for selected */}
                  {isSelected && (
                    <circle
                      cx="18" cy="18" r="17"
                      fill="none"
                      stroke={goalMet ? '#10b981' : hasData ? '#f59e0b' : '#6366f1'}
                      strokeWidth="0.8"
                      opacity="0.25"
                    />
                  )}

                  {/* Track */}
                  <path
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2.8"
                    strokeDasharray={week.isFuture ? '3 3' : undefined}
                    d={ARC}
                    className="dark:stroke-slate-700"
                  />

                  {/* Progress arc */}
                  {hasData && (
                    <path
                      fill="none"
                      stroke={ringStroke}
                      strokeWidth="2.8"
                      strokeLinecap="butt"
                      strokeDasharray={`${pct}, 100`}
                      d={ARC}
                      style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
                    />
                  )}

                  {/* Inner filled circle */}
                  <circle cx="18" cy="18" r="13" fill={innerFill} />
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <span className="text-[15px] font-bold leading-none" style={{ color: numColor }}>
                    {week.weekIndex + 1}
                  </span>
                  <span className="text-[7px] font-medium leading-none mt-0.5" style={{ color: numColor, opacity: 0.6 }}>
                    {startDay}–{endDay}
                  </span>
                </div>

                {/* Goal-met badge */}
                <AnimatePresence>
                  {goalMet && (
                    <motion.div
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm"
                    >
                      <span className="material-symbols-outlined text-white leading-none" style={{ fontSize: 10 }}>
                        check
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 7 day-dot indicators */}
              <div className="flex gap-[3px] mt-2">
                {week.days.map((day, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-colors duration-300"
                    style={{
                      width: 5,
                      height: 5,
                      backgroundColor: dayDotColor(day.stats, day.isFuture),
                      opacity: day.isFuture ? 0.35 : 1,
                    }}
                  />
                ))}
              </div>

              {/* Days count label */}
              <span className={`text-[8px] font-semibold mt-1 leading-none ${
                hasData
                  ? goalMet
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-amber-500 dark:text-amber-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}>
                {hasData ? `${week.daysMetGoal}/7 dias` : week.isFuture ? '' : '–'}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
