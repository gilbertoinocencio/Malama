import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const CalorieTrackingStep: React.FC<StepProps> = ({
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
            {/* Raccoon with food */}
            <div className="relative bg-gradient-to-br from-green-50 to-lime-100 dark:from-green-900/20 dark:to-lime-900/30 rounded-3xl p-8 shadow-lg border-2 border-green-200 dark:border-green-800 mb-8">
              <div className="text-center mb-6">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block text-8xl"
                >
                  🦝
                </motion.div>
              </div>

              {/* Food items floating around */}
              <div className="relative h-32">
                <motion.div
                  animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                  className="absolute top-0 left-8 text-4xl"
                >
                  🥗
                </motion.div>
                <motion.div
                  animate={{ y: [0, -15, 0], x: [0, -5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                  className="absolute top-4 right-8 text-4xl"
                >
                  🍎
                </motion.div>
                <motion.div
                  animate={{ y: [0, -12, 0], x: [0, 8, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl"
                >
                  🥑
                </motion.div>
              </div>
            </div>

            {/* Feature cards */}
            <div className="space-y-4">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex items-start gap-3"
              >
                <div className="text-3xl">📸</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Registe com fotos
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tire uma foto e deixe a IA fazer o resto
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex items-start gap-3"
              >
                <div className="text-3xl">🎯</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Atinja suas metas
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Acompanhe seu progresso diário
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex items-start gap-3"
              >
                <div className="text-3xl">💪</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Mantenha-se motivado
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receba insights e dicas personalizadas
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Acompanhe calorias
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Basta tirar uma foto e deixar a IA calcular
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

export default CalorieTrackingStep;
