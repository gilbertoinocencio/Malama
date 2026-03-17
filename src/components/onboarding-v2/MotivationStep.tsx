import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const MotivationStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const mealItems = [
    { emoji: '🥗', name: 'Salada', calories: 120 },
    { emoji: '🍗', name: 'Frango', calories: 240 },
    { emoji: '🍚', name: 'Arroz', calories: 200 },
  ];

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
            {/* Meal plan card */}
            <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-3xl p-8 shadow-lg border-2 border-pink-100 dark:border-pink-800 mb-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Plano de Refeições
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Segunda-feira</p>
              </div>

              {/* Meal items */}
              <div className="space-y-4 mb-6">
                {mealItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{item.emoji}</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {item.calories} cal
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Total calories */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-4 flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  560 cal
                </span>
              </div>
            </div>

            {/* Heart rating */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="text-center"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg inline-block">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Classificação do plano
                </div>
                <div className="flex gap-2 text-4xl">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  >
                    ❤️
                  </motion.span>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  >
                    ❤️
                  </motion.span>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  >
                    ❤️
                  </motion.span>
                  <span className="opacity-30">❤️</span>
                  <span className="opacity-30">❤️</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Sinta o amor
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Siga planos de refeições que você realmente vai gostar
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

export default MotivationStep;
