import React from 'react';
import { Zap } from 'lucide-react';

interface TreatmentDaysBadgeProps {
  days: number;
}

export const TreatmentDaysBadge: React.FC<TreatmentDaysBadgeProps> = ({ days }) => {
  if (days <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400
      bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-0.5">
      <Zap size={11} />
      Em tratamento há {days} dia{days !== 1 ? 's' : ''}
    </span>
  );
};
