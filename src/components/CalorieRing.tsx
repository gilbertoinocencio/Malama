import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface CalorieRingProps {
  consumed: number;
  target: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({ consumed, target }) => {
  const remaining = Math.max(0, target - consumed);
  const data = [
    { name: 'Consumed', value: consumed },
    { name: 'Remaining', value: remaining },
  ];

  // Tailwind config colors reference (hardcoded here for SVG compatibility)
  // Light: Petroleum / Stone
  // Dark: Neon / Dark Gray
  const isDark = document.documentElement.classList.contains('dark');
  
  const activeColor = isDark ? '#D4FF00' : '#2C5F6D';
  const inactiveColor = isDark ? '#333333' : '#E5E0D8';

  return (
    <div className="relative h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={95}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={10}
            paddingAngle={2}
          >
            <Cell key="consumed" fill={activeColor} />
            <Cell key="remaining" fill={inactiveColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-serif font-light text-nura-brown dark:text-white">
          {consumed}
        </span>
        <span className="text-xs uppercase tracking-widest text-nura-brown/60 dark:text-nura-stone mt-1">
          / {target} kcal
        </span>
      </div>
    </div>
  );
};