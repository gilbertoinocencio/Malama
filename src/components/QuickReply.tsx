import React from 'react';

export interface QuickReplyOption {
  label: string;
  value: string;
  icon?: string;
}

interface QuickReplyProps {
  options: QuickReplyOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export const QuickReply: React.FC<QuickReplyProps> = ({ options, onSelect, disabled }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-nura-petrol/20 dark:border-primary/20 bg-white dark:bg-surface-dark text-nura-main dark:text-white hover:border-nura-petrol dark:hover:border-primary hover:bg-nura-petrol/5 dark:hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {option.icon && (
            <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
          )}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickReply;
