import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const FastingBenefitsStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [time, setTime] = useState(80); // seconds
  const totalTime = 120; // 2 minutes for demo

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 0) return totalTime;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = ((totalTime - time) / totalTime) * 100;

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Fasting timer visualization */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8"
          >
            <div className="w-80 h-80 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden p-8">
              {/* Sleeping raccoon */}
              <div className="text-7xl mb-4 relative z-10">
                😴🦝
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white dark:bg-gray-700 rounded-full h-4 mb-4 overflow-hidden shadow-inner relative z-10">
                <div className="flex h-full">
                  {/* Green section (fasting) */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 0.3}%` }}
                    className="bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center relative"
                  >
                    <span className="absolute left-2">🌙</span>
                  </motion.div>

                  {/* Gray section (remaining) */}
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 flex items-center justify-end px-2">
                    <span>🍽️</span>
                  </div>

                  {/* Flame icon */}
                  <div className="absolute right-2 flex items-center">
                    <span>🔥</span>
                  </div>
                </div>
              </div>

              {/* Time display */}
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">
                {formatTime(time)}
              </div>

              {/* Background decoration - hills */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 400 200" className="w-full">
                  {/* Dark green hill */}
                  <path
                    d="M 0 200 Q 100 100, 200 150 T 400 200 Z"
                    fill="currentColor"
                    className="text-green-600 dark:text-green-800 opacity-40"
                  />
                  {/* Light green hill */}
                  <path
                    d="M 0 200 Q 150 120, 300 170 T 400 200 Z"
                    fill="currentColor"
                    className="text-green-500 dark:text-green-700 opacity-30"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Aproveite o jejum
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Crie um hábito saudável que você realmente vai gostar
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            Próximo
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default FastingBenefitsStep;
