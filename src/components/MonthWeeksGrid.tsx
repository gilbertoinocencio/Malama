import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonthWeek } from '../types';

interface MonthWeeksGridProps {
  weeks: MonthWeek[];
  onWeekClick: (weekIndex: number) => void;
  selectedWeekIndex: number | null;
}

// SVG arc path — circumference ≈ 100 so strokeDasharray maps to %
const ARC = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

export const MonthWeeksGrid: React.FC<MonthWeeksGridProps> = ({
  weeks,
  onWeekClick,
  selectedWeekIndex,
}) => {
  return (
    <div className="px-4 py-3">
      <div className="flex items-end justify-between">
        {weeks.map((week, index) => {
          const isSelected  = selectedWeekIndex === week.weekIndex;
          const isClickable = !week.isFuture;

          const hasData = !week.isFuture && week.daysWithData > 0;
          const goalMet = hasData && week.daysMetGoal >= 5;
          const pct = hasData
            ? Math.max(Math.round((week.daysMetGoal / 7) * 100), week.daysMetGoal > 0 ? 4 : 0)
            : 0;

          // Ring stroke colour
          const ringStroke = goalMet
            ? '#10b981'   // emerald-500
            : hasData
              ? '#f59e0b'   // amber-500
              : '#d1d5db';  // gray-300

          // Inner fill colour
          const innerFill = isSelected
            ? '#ffffff'
            : goalMet
              ? '#ecfdf5'
              : hasData
                ? '#fffbeb'
                : '#f9fafb';

          // Number colour
          const numClass = isSelected
            ? 'font-bold text-nura-main dark:text-gray-800'
            : goalMet
              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
              : hasData
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : week.isFuture
                  ? 'text-gray-300 dark:text-gray-600'
                  : 'text-gray-400 dark:text-gray-500';

          // Label colour
          const labelClass = week.isCurrent || isSelected
            ? 'text-nura-petrol dark:text-primary font-semibold'
            : week.isFuture
              ? 'text-gray-300 dark:text-gray-600'
              : 'text-gray-400 dark:text-gray-500';

          // Short date range for sub-label (e.g. "1–7")
          const startDay = parseInt(week.startDate.split('-')[2], 10);
          const endDay   = parseInt(week.endDate.split('-')[2], 10);
          const dateRange = `${startDay}–${endDay}`;

          return (
            <motion.button
              key={week.weekIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.22 }}
              onClick={() => isClickable && onWeekClick(week.weekIndex)}
              disabled={!isClickable}
              className={`
                flex flex-col items-center gap-1 flex-1 min-w-0
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Week label — above circle */}
              <span className={`text-[10px] leading-none ${labelClass}`}>
                {week.label}
              </span>

              {/* SVG circle */}
              <div className={`relative transition-transform duration-150 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 36 36"
                  className="-rotate-90"
                >
                  {/* Track */}
                  <path
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2.2"
                    strokeDasharray={week.isFuture ? '3 3' : undefined}
                    d={ARC}
                    className="dark:stroke-slate-700"
                  />

                  {/* Progress arc — only when data exists */}
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

                  {/* Selected week extra ring */}
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
                  <circle cx="18" cy="18" r="13.5" fill={innerFill} />
                </svg>

                {/* Week numeral */}
                <span
                  className={`
                    absolute inset-0 flex flex-col items-center justify-center
                    select-none leading-none
                    ${numClass}
                  `}
                >
                  <span className="text-[12px]">{week.weekIndex + 1}</span>
                  <span className="text-[8px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">{dateRange}</span>
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

              {/* Days met sub-label */}
              <span className={`text-[9px] leading-none ${
                hasData ? (goalMet ? 'text-emerald-500' : 'text-amber-500') : 'text-gray-300 dark:text-gray-600'
              }`}>
                {hasData ? `${week.daysMetGoal}/7` : ''}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
