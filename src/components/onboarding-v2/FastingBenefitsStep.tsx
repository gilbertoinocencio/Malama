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
            <div className="w-80 h-80 bg-gradient-to-br from-nura-brown/10 to-nura-pastel-orange/20 dark:from-nura-brown/20 dark:to-nura-pastel-orange/10 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden p-8 border-2 border-nura-brown/20 dark:border-nura-brown/30 shadow-lg">
              {/* Bedtime icon */}
              <div className="mb-6 relative z-10">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-24 h-24 bg-gradient-to-br from-nura-brown to-nura-petrol dark:from-nura-brown/80 dark:to-nura-petrol rounded-full flex items-center justify-center shadow-xl"
                >
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '64px', fontWeight: 300 }}>
                    bedtime
                  </span>
                </motion.div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-nura-card dark:bg-surface-dark rounded-full h-5 mb-4 overflow-hidden shadow-inner relative z-10 border-2 border-nura-border dark:border-gray-700">
                <div className="flex h-full">
                  {/* Fasting section */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 0.3}%` }}
                    className="bg-gradient-to-r from-nura-petrol to-primary flex items-center justify-center relative"
                  >
                    <span className="material-symbols-outlined text-white text-sm absolute left-1.5">nightlight</span>
                  </motion.div>

                  {/* Remaining section */}
                  <div className="flex-1 bg-nura-border dark:bg-gray-600 flex items-center justify-end px-2">
                    <span className="material-symbols-outlined text-nura-muted dark:text-gray-400 text-sm">restaurant</span>
                  </div>

                  {/* Flame icon */}
                  <div className="absolute right-2 flex items-center">
                    <span className="material-symbols-outlined text-primary text-sm">local_fire_department</span>
                  </div>
                </div>
              </div>

              {/* Time display */}
              <div className="text-5xl font-bold text-nura-main dark:text-white mb-2 relative z-10 font-display">
                {formatTime(time)}
              </div>

              {/* Subtle background accent */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-nura-brown/10 to-transparent dark:from-nura-brown/20"></div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-2xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Aproveite o jejum
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Crie um hábito saudável que você realmente vai gostar
          </p>

          <button
            onClick={onNext}
            className="w-full bg-nura-petrol dark:bg-primary text-white py-4 px-6 rounded-full font-semibold text-lg hover:bg-nura-petrol/90 dark:hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            Próximo
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default FastingBenefitsStep;
