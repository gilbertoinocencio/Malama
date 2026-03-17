import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const GoalSuccessStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={false}>
      <div className="flex flex-col h-full justify-center items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-2xl"
        >
          <motion.div
            animate={{ rotate: showConfetti ? [0, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5, repeat: showConfetti ? Infinity : 0 }}
            className="text-8xl mb-6"
          >
            🎉
          </motion.div>

          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Objetivo definido com sucesso!
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Estamos prontos para começar a sua jornada de transformação
          </p>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                  emoji_events
                </span>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Plano personalizado criado
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Baseado em {currentStep - 1} respostas suas
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onNext}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-8 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Ver meu plano
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      </div>
    </StepContainer>
  );
};

export default GoalSuccessStep;
