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
    { icon: 'nutrition', name: 'Salada', calories: 120, color: 'from-green-400 to-green-500' },
    { icon: 'set_meal', name: 'Frango', calories: 240, color: 'from-yellow-400 to-orange-400' },
    { icon: 'rice_bowl', name: 'Arroz', calories: 200, color: 'from-nura-brown to-nura-pastel-orange' },
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
            <div className="bg-gradient-to-br from-nura-petrol-light/20 to-primary/10 dark:from-nura-petrol/20 dark:to-primary/20 rounded-3xl p-8 shadow-lg border-2 border-nura-petrol/20 dark:border-primary/30 mb-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-nura-main dark:text-white mb-2 font-display">
                  Seu plano personalizado
                </h3>
                <p className="text-nura-muted dark:text-gray-400">Segunda-feira</p>
              </div>

              {/* Meal items */}
              <div className="space-y-4 mb-6">
                {mealItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="bg-nura-card dark:bg-surface-dark rounded-2xl p-4 flex items-center justify-between shadow-sm border-2 border-nura-border dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-white text-2xl">{item.icon}</span>
                      </div>
                      <div className="text-lg font-semibold text-nura-main dark:text-white font-display">
                        {item.name}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-nura-muted dark:text-gray-400">
                      {item.calories} cal
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Total calories */}
              <div className="bg-gradient-to-r from-nura-petrol to-primary dark:from-nura-petrol/60 dark:to-primary/60 rounded-2xl p-4 flex justify-between items-center">
                <span className="font-semibold text-white font-display">Total</span>
                <span className="text-2xl font-bold text-white font-display">
                  560 cal
                </span>
              </div>
            </div>

            {/* Star rating */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="text-center"
            >
              <div className="bg-nura-card dark:bg-surface-dark rounded-2xl p-6 shadow-lg inline-block border-2 border-nura-border dark:border-gray-700">
                <div className="text-sm text-nura-muted dark:text-gray-400 mb-2 font-display">
                  Qualidade do plano
                </div>
                <div className="flex gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    className="material-symbols-outlined text-primary text-4xl"
                  >
                    star
                  </motion.span>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="material-symbols-outlined text-primary text-4xl"
                  >
                    star
                  </motion.span>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="material-symbols-outlined text-primary text-4xl"
                  >
                    star
                  </motion.span>
                  <span className="material-symbols-outlined text-nura-border dark:text-gray-600 text-4xl opacity-40">star</span>
                  <span className="material-symbols-outlined text-nura-border dark:text-gray-600 text-4xl opacity-40">star</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-2xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Seu plano personalizado
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Siga planos de refeições que você realmente vai gostar
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

export default MotivationStep;
