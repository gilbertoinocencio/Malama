import React from 'react';
import { motion } from 'framer-motion';

interface OptionCardProps {
  icon: string;
  title: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  title,
  description,
  selected = false,
  onClick,
  disabled = false
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        w-full p-6 rounded-2xl border-2 transition-all text-left
        ${
          selected
            ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/10'
            : 'border-gray-200 dark:border-gray-700 hover:border-nura-petrol/50 dark:hover:border-primary/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
          size-14 rounded-xl flex items-center justify-center flex-shrink-0
          ${
            selected
              ? 'bg-nura-petrol/10 dark:bg-primary/20'
              : 'bg-gray-100 dark:bg-gray-800'
          }
        `}
        >
          <span
            className={`
            material-symbols-outlined text-3xl
            ${
              selected
                ? 'text-nura-petrol dark:text-primary'
                : 'text-nura-muted dark:text-gray-400'
            }
          `}
          >
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`
            text-lg font-bold mb-1
            ${
              selected
                ? 'text-nura-main dark:text-white'
                : 'text-nura-main dark:text-gray-200'
            }
          `}
          >
            {title}
          </h3>
          {description && (
            <p className="text-sm text-nura-muted dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Checkmark */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="size-6 rounded-full bg-nura-petrol dark:bg-primary flex items-center justify-center flex-shrink-0"
          >
            <span className="material-symbols-outlined text-white text-sm">
              check
            </span>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};
