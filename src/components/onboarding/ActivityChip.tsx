import React from 'react';

interface ActivityChipProps {
  label: string;
  icon?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ActivityChip: React.FC<ActivityChipProps> = ({
  label,
  icon,
  selected,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-4 py-2.5 rounded-full
        border-2 transition-all duration-200 text-sm font-medium
        ${selected
          ? 'border-nura-petrol dark:border-primary bg-nura-petrol dark:bg-primary text-white shadow-md'
          : 'border-nura-border dark:border-gray-700 bg-white dark:bg-surface-dark text-nura-main dark:text-white hover:border-nura-petrol/50 dark:hover:border-primary/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
      `}
    >
      {icon && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
      <span>{label}</span>
      {selected && (
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
      )}
    </button>
  );
};

export default ActivityChip;
