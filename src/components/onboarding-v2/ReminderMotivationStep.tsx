import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const ReminderMotivationStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Rainbow background card */}
            <div className="relative bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-900/30 dark:via-purple-900/30 dark:to-blue-900/30 rounded-3xl p-8 shadow-lg border-2 border-pink-200 dark:border-pink-800 overflow-hidden">
              {/* Rainbow arcs */}
              <div className="absolute inset-0 pointer-events-none">
                <svg viewBox="0 0 400 400" className="w-full h-full opacity-30">
                  <path d="M 0 400 Q 100 300, 200 350 T 400 400" fill="currentColor" className="text-red-300" />
                  <path d="M 0 400 Q 120 280, 240 330 T 400 400" fill="currentColor" className="text-orange-300" />
                  <path d="M 0 400 Q 140 260, 280 310 T 400 400" fill="currentColor" className="text-yellow-300" />
                  <path d="M 0 400 Q 160 240, 320 290 T 400 400" fill="currentColor" className="text-green-300" />
                  <path d="M 0 400 Q 180 220, 360 270 T 400 400" fill="currentColor" className="text-blue-300" />
                </svg>
              </div>

              {/* Raccoon mascot */}
              <div className="relative z-10 text-center mb-6">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  <div className="text-8xl mb-4">🦝</div>
                </motion.div>
              </div>

              {/* Hearts/Lives display */}
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 shadow-md">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-4xl"
                  >
                    ❤️
                  </motion.span>
                  <span className="text-4xl opacity-30">🤍</span>
                  <span className="text-4xl opacity-30">🤍</span>
                  <span className="text-4xl opacity-30">🤍</span>
                </div>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  (1 restante)
                </p>
              </div>

              {/* Message */}
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🦝</div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                      Não se esqueça de tirar uma foto da sua refeição 📸
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Vamos te apoiar para continuar registrando
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Receba lembretes amigáveis para manter o foco
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            Configurar lembretes
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default ReminderMotivationStep;
