import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepContainerProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  /** Opcional: com hideNavigation não há botão que o chame. */
  onNext?: () => void;
  onBack?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  secondaryLabel?: string;
  showFooter?: boolean;
  showHeader?: boolean;
  isLoading?: boolean;
  progress?: number;
  onSecondary?: () => void;
  nextDisabled?: boolean;
  hideNavigation?: boolean;
}

const PETROL = '#7d4a3c';

export const StepContainer: React.FC<StepContainerProps> = ({
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  showBack = true,
  nextLabel = 'Continuar',
  secondaryLabel,
  showFooter = true,
  showHeader = true,
  isLoading = false,
  progress: progressProp,
  onSecondary,
  nextDisabled = false,
  hideNavigation = false,
}) => {
  const progress = progressProp ?? (currentStep / totalSteps) * 100;

  return (
    <div
      className="min-h-screen font-body antialiased flex flex-col relative overflow-hidden"
      style={{ background: '#FDFBF9' }}
    >
      {/* Progress Bar — thin, petroleum */}
      <div className="fixed top-0 left-0 w-full h-0.5 bg-stone-100 z-[60]">
        <motion.div
          className="h-full"
          style={{ background: PETROL }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      {showHeader && !hideNavigation && (
        <header
          className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-14 border-b border-stone-100"
          style={{ background: '#FDFBF9' }}
        >
          {showBack ? (
            <button
              onClick={onBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-all duration-200 active:scale-95"
            >
              <span className="material-symbols-outlined text-stone-400 text-xl">arrow_back</span>
            </button>
          ) : (
            <div className="w-9" />
          )}

          <span
            className="text-base tracking-[0.2em]"
            style={{ fontFamily: "'Playfair Display', serif", color: PETROL }}
          >
            Malama
          </span>

          <div className="w-9" />
        </header>
      )}

      {/* Main Content */}
      <main
        className={`flex-grow flex flex-col items-center justify-center px-6 ${
          showHeader && !hideNavigation ? 'pt-20' : 'pt-6'
        } pb-32 max-w-2xl mx-auto w-full relative z-10`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer CTA */}
      {showFooter && !isLoading && !hideNavigation && (
        <footer className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-10 flex justify-center items-center z-50 bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9]/90 to-transparent">
          <div className="max-w-md w-full space-y-1">
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="w-full py-4 rounded-2xl text-white text-base font-light tracking-wider transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: PETROL }}
            >
              {nextLabel}
            </button>
            {secondaryLabel && (
              <button
                onClick={onSecondary ?? onBack}
                className="w-full py-3 text-sm font-light transition-colors text-center"
                style={{ color: PETROL }}
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
