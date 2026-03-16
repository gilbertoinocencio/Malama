import React from 'react';
import { motion } from 'framer-motion';
import { ProgressBar } from './ProgressBar';

interface StepContainerProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
}

export const StepContainer: React.FC<StepContainerProps> = ({
  children,
  currentStep,
  totalSteps,
  onBack,
  showBack = false
}) => {
  return (
    <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col">
      {/* Header with Progress */}
      <div className="sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            {showBack && onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-nura-muted dark:text-gray-400 hover:text-nura-main dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
                <span className="text-sm font-medium">Voltar</span>
              </button>
            ) : (
              <div></div>
            )}
            <span className="text-sm font-semibold text-nura-muted dark:text-gray-400">
              {currentStep} de {totalSteps}
            </span>
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex-1 max-w-2xl w-full mx-auto px-6 py-8"
      >
        {children}
      </motion.div>
    </div>
  );
};
