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
            {/* NURA notification card */}
            <div className="relative bg-gradient-to-br from-nura-petrol-light/20 to-primary/10 dark:from-nura-petrol/20 dark:to-primary/20 rounded-3xl p-8 shadow-lg border-2 border-nura-petrol/20 dark:border-primary/30 overflow-hidden">
              {/* Bell icon with animation */}
              <div className="relative z-10 text-center mb-6">
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="inline-block"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-nura-petrol to-primary dark:from-nura-petrol/80 dark:to-primary rounded-full flex items-center justify-center shadow-xl mb-4">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '64px', fontWeight: 300 }}>
                      notifications_active
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Progress indicators */}
              <div className="relative z-10 bg-nura-card dark:bg-surface-dark rounded-2xl p-6 mb-4 shadow-md border-2 border-nura-border dark:border-gray-700">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-nura-petrol flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white text-2xl">check</span>
                  </motion.div>
                  <div className="w-12 h-12 rounded-full border-2 border-nura-border dark:border-gray-600 bg-nura-bg dark:bg-gray-800 opacity-40"></div>
                  <div className="w-12 h-12 rounded-full border-2 border-nura-border dark:border-gray-600 bg-nura-bg dark:bg-gray-800 opacity-40"></div>
                  <div className="w-12 h-12 rounded-full border-2 border-nura-border dark:border-gray-600 bg-nura-bg dark:bg-gray-800 opacity-40"></div>
                </div>
                <p className="text-sm text-center text-nura-muted dark:text-gray-400 font-display">
                  1 de 4 refeições registradas
                </p>
              </div>

              {/* Message notification */}
              <div className="relative z-10 bg-nura-card dark:bg-surface-dark rounded-2xl p-4 shadow-md border-2 border-nura-border dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nura-petrol to-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-xl">restaurant</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-nura-main dark:text-white font-medium">
                      Não se esqueça de registrar sua refeição
                    </p>
                    <p className="text-sm text-nura-muted dark:text-gray-400 mt-1">
                      Manter o registro ajuda a alcançar seus objetivos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-2xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Vamos te apoiar para continuar registrando
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Receba lembretes amigáveis para manter o foco
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Configurar lembretes
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default ReminderMotivationStep;
