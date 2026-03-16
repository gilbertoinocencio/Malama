import React from 'react';

interface SelectionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  icon,
  title,
  subtitle,
  selected,
  onClick,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center p-6 rounded-3xl
        border-2 transition-all duration-300 text-center
        ${selected
          ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/10 shadow-lg scale-[1.02]'
          : 'border-nura-border dark:border-gray-700 bg-white dark:bg-surface-dark hover:border-nura-petrol/50 dark:hover:border-primary/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:scale-95'}
        ${className}
      `}
    >
      {/* Icon */}
      <div
        className={`
          flex items-center justify-center size-14 rounded-2xl mb-3 transition-colors
          ${selected
            ? 'bg-nura-petrol dark:bg-primary text-white'
            : 'bg-nura-pastel-orange dark:bg-gray-800 text-nura-petrol dark:text-primary'
          }
        `}
      >
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      {/* Title */}
      <h3
        className={`
          text-sm font-bold mb-1 transition-colors
          ${selected
            ? 'text-nura-petrol dark:text-primary'
            : 'text-nura-main dark:text-white'
          }
        `}
      >
        {title}
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-nura-muted dark:text-gray-400 leading-tight">
          {subtitle}
        </p>
      )}

      {/* Selected Indicator */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="size-6 rounded-full bg-nura-petrol dark:bg-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-[16px]">check</span>
          </div>
        </div>
      )}
    </button>
  );
};

export default SelectionCard;
