import React, { useRef, useEffect } from 'react';

interface NumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  className?: string;
}

const NumberPicker: React.FC<NumberPickerProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 80;

  const values = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }

  const handleScroll = () => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newValue = values[index];

    if (newValue !== undefined && newValue !== value) {
      onChange(newValue);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const index = values.indexOf(value);
    if (index !== -1) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Selection indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-full h-20 border-y-2 border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50" />
      </div>

      {/* Scrollable numbers */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Top padding */}
        <div style={{ height: `${itemHeight * 2}px` }} />

        {values.map((val) => (
          <div
            key={val}
            className="flex items-center justify-center snap-center transition-all"
            style={{ height: `${itemHeight}px` }}
          >
            <span
              className={`text-center transition-all ${
                val === value
                  ? 'text-5xl font-bold text-gray-900 dark:text-white'
                  : Math.abs(values.indexOf(val) - values.indexOf(value)) === 1
                  ? 'text-3xl font-medium text-gray-400 dark:text-gray-500'
                  : 'text-2xl text-gray-300 dark:text-gray-600'
              }`}
            >
              {val}
              {val === value && unit && (
                <span className="ml-2 text-3xl font-medium text-gray-600 dark:text-gray-400">
                  {unit}
                </span>
              )}
            </span>
          </div>
        ))}

        {/* Bottom padding */}
        <div style={{ height: `${itemHeight * 2}px` }} />
      </div>
    </div>
  );
};

export default NumberPicker;
