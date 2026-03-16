import React from 'react';

interface ScaleSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  icon?: string;
  lowLabel?: string;
  highLabel?: string;
  showValue?: boolean;
}

export const ScaleSlider: React.FC<ScaleSliderProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  icon,
  lowLabel,
  highLabel,
  showValue = true,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[20px]">
              {icon}
            </span>
          )}
          <span className="text-sm font-semibold text-nura-main dark:text-white">
            {label}
          </span>
        </div>
        {showValue && (
          <span className="text-lg font-bold text-nura-petrol dark:text-primary">
            {value}
          </span>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            bg-gradient-to-r from-gray-200 via-gray-200 to-gray-200
            dark:from-gray-700 dark:via-gray-700 dark:to-gray-700
            focus:outline-none focus:ring-2 focus:ring-nura-petrol/20 dark:focus:ring-primary/20"
          style={{
            background: `linear-gradient(to right,
              rgb(var(--color-nura-petrol) / 1) 0%,
              rgb(var(--color-nura-petrol) / 1) ${percentage}%,
              rgb(229 231 235 / 1) ${percentage}%,
              rgb(229 231 235 / 1) 100%)`,
          }}
        />
        {/* Custom Thumb Styling via CSS in index.css */}
      </div>

      {/* Labels */}
      {(lowLabel || highLabel) && (
        <div className="flex items-center justify-between text-xs text-nura-muted dark:text-gray-500">
          <span>{lowLabel || min}</span>
          <span>{highLabel || max}</span>
        </div>
      )}
    </div>
  );
};

export default ScaleSlider;
