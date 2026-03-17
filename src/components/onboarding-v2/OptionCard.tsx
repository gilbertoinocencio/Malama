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
        w-full p-6 rounded-2xl border-2 transition-all duration-200 text-left shadow-sm hover:shadow-md
        ${
          selected
            ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-primary/10'
            : 'border-transparent bg-white dark:bg-gray-800 hover:border-primary/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
          size-14 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border
          ${
            selected
              ? 'bg-white/80 dark:bg-gray-700/80 border-primary/20'
              : 'bg-gray-50/80 dark:bg-gray-700/80 border-transparent'
          }
        `}
        >
          <span
            className={`
            material-symbols-outlined text-3xl
            ${
              selected
                ? 'text-primary dark:text-primary'
                : 'text-gray-500 dark:text-gray-400'
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
            text-lg font-bold mb-1 transition-colors
            ${
              selected
                ? 'text-primary dark:text-white'
                : 'text-gray-900 dark:text-gray-200'
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
            className="size-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm"
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
