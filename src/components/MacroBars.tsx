import React from 'react';
import { MacroData } from '../types';

interface MacroBarsProps {
  current: MacroData;
  target: MacroData;
}

export const MacroBars: React.FC<MacroBarsProps> = ({ current, target }) => {
  
  const calculateWidth = (val: number, max: number) => {
    return Math.min(100, (val / max) * 100);
  };

  const macros = [
    { label: 'Protein', key: 'protein' as keyof MacroData, color: 'bg-nura-petroleum dark:bg-nura-cyan' },
    { label: 'Carbs', key: 'carbs' as keyof MacroData, color: 'bg-nura-brown dark:bg-nura-neon' },
    { label: 'Fats', key: 'fats' as keyof MacroData, color: 'bg-stone-400 dark:bg-white' },
  ];

  return (
    <div className="flex gap-4 w-full justify-between mt-6">
      {macros.map((m) => (
        <div key={m.label} className="flex flex-col flex-1 gap-1 group">
          <div className="flex justify-between items-end mb-1">
             <span className="text-xs font-medium uppercase tracking-wide opacity-70">{m.label}</span>
             <span className="text-xs opacity-50">{Math.round(current[m.key])}g</span>
          </div>
          <div className="h-2 w-full bg-nura-stone/30 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${m.color} transition-all duration-1000 ease-out`}
              style={{ width: `${calculateWidth(current[m.key], target[m.key])}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};