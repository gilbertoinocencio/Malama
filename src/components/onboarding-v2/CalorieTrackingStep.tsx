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
            {/* Food tracking visualization */}
            <div className="relative bg-gradient-to-br from-nura-petrol-light/20 to-primary/10 dark:from-nura-petrol/20 dark:to-primary/20 rounded-3xl p-8 shadow-lg border-2 border-nura-petrol/20 dark:border-primary/30 mb-8">
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-nura-petrol to-primary dark:from-nura-petrol/80 dark:to-primary rounded-full flex items-center justify-center shadow-xl">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '64px', fontWeight: 300 }}>
                      restaurant
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Macro nutrients visualization */}
              <div className="relative h-32 flex items-center justify-center gap-4">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-500 dark:from-green-500/80 dark:to-green-600 flex items-center justify-center shadow-lg mb-1">
                    <span className="material-symbols-outlined text-white text-2xl">ecg_heart</span>
                  </div>
                  <span className="text-xs text-nura-muted dark:text-gray-400 font-display">Proteína</span>
                </motion.div>
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 dark:from-yellow-500/80 dark:to-orange-500 flex items-center justify-center shadow-lg mb-1">
                    <span className="material-symbols-outlined text-white text-2xl">bolt</span>
                  </div>
                  <span className="text-xs text-nura-muted dark:text-gray-400 font-display">Carbo</span>
                </motion.div>
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 dark:from-blue-500/80 dark:to-purple-500 flex items-center justify-center shadow-lg mb-1">
                    <span className="material-symbols-outlined text-white text-2xl">water_drop</span>
                  </div>
                  <span className="text-xs text-nura-muted dark:text-gray-400 font-display">Gordura</span>
                </motion.div>
              </div>
            </div>

            {/* Feature cards */}
            <div className="space-y-4">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-nura-card dark:bg-surface-dark rounded-2xl p-4 shadow-md flex items-start gap-3 border-2 border-nura-border dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nura-petrol to-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                </div>
                <div>
                  <h4 className="font-semibold text-nura-main dark:text-white mb-1 font-display">
                    Registe com fotos
                  </h4>
                  <p className="text-sm text-nura-muted dark:text-gray-400">
                    Tire uma foto e deixe a IA fazer o resto
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-nura-card dark:bg-surface-dark rounded-2xl p-4 shadow-md flex items-start gap-3 border-2 border-nura-border dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nura-petrol to-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-xl">target</span>
                </div>
                <div>
                  <h4 className="font-semibold text-nura-main dark:text-white mb-1 font-display">
                    Atinja suas metas
                  </h4>
                  <p className="text-sm text-nura-muted dark:text-gray-400">
                    Acompanhe seu progresso diário
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-nura-card dark:bg-surface-dark rounded-2xl p-4 shadow-md flex items-start gap-3 border-2 border-nura-border dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nura-petrol to-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-xl">favorite</span>
                </div>
                <div>
                  <h4 className="font-semibold text-nura-main dark:text-white mb-1 font-display">
                    Mantenha-se motivado
                  </h4>
                  <p className="text-sm text-nura-muted dark:text-gray-400">
                    Receba insights e dicas personalizadas
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-2xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Acompanhe calorias
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Basta tirar uma foto e deixar a IA calcular
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Próximo
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default CalorieTrackingStep;
