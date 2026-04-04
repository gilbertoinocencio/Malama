import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepContainerProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  secondaryLabel?: string;
  showFooter?: boolean;
  showHeader?: boolean;
  isLoading?: boolean;
  progress?: number;
}

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
}) => {
  const progress = progressProp ?? (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col relative overflow-hidden">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <motion.div
          className="h-full bg-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </div>

      {/* Top Navigation */}
      {showHeader && (
        <header className="fixed top-0 w-full z-50 bg-[#f5fcdf] flex items-center justify-between px-8 h-16 transition-colors">
          {showBack ? (
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-all duration-300 active:scale-95"
            >
              <span className="material-symbols-outlined text-primary">arrow_back</span>
            </button>
          ) : (
            <div className="w-10" />
          )}

          <span className="font-headline tracking-tighter text-2xl font-bold text-primary">NURA</span>

          <div className="w-10" />
        </header>
      )}

      {/* Main Content Canvas */}
      <main className={`flex-grow flex flex-col items-center justify-center px-6 ${showHeader ? 'pt-24' : 'pt-6'} pb-32 max-w-2xl mx-auto w-full relative z-10`}>


        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Action */}
      {showFooter && !isLoading && (
        <footer className="fixed bottom-0 left-0 w-full p-8 flex justify-center items-center z-50 bg-gradient-to-t from-surface to-transparent pt-12">
          <div className="max-w-md w-full">
            <button
              onClick={onNext}
              className="w-full h-16 bg-gradient-to-r from-tertiary to-tertiary-container text-on-tertiary font-headline font-semibold text-lg rounded-full shadow-[0_16px_32px_rgba(0,70,79,0.2)] hover:shadow-[0_16px_40px_rgba(0,70,79,0.3)] hover:scale-[1.02] active:scale-95 transition-all duration-500 ease-in-out flex items-center justify-center gap-3"
            >
              <span>{nextLabel}</span>
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
            {secondaryLabel && (
              <button onClick={onBack} className="w-full py-4 text-primary font-bold text-sm uppercase tracking-widest hover:opacity-70 transition-opacity">
                {secondaryLabel}
              </button>
            )}
          </div>
        </footer>
      )}


    </div>
  );
};
