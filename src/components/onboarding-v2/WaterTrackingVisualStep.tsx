import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const WaterTrackingVisualStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [waterAmount, setWaterAmount] = useState(250);
  const maxWater = 1250; // 5 cups of 250ml

  const cups = [250, 500, 750, 1000, 1250];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Water drop icon with animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8"
          >
            <div className="w-64 h-64 bg-gradient-to-br from-nura-petrol-light/30 to-primary/20 dark:from-nura-petrol/20 dark:to-primary/30 rounded-3xl flex items-center justify-center relative overflow-hidden border-2 border-nura-petrol/10 dark:border-primary/20">
              {/* Main water drop icon */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-9xl"
              >
                <span className="material-symbols-outlined text-primary dark:text-primary" style={{ fontSize: '120px', fontWeight: 300 }}>
                  water_drop
                </span>
              </motion.div>

              {/* Floating water droplets */}
              <motion.div
                animate={{ y: [0, -15, 0], x: [0, 5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                className="absolute top-12 right-12"
              >
                <span className="material-symbols-outlined text-primary/40 dark:text-primary/30" style={{ fontSize: '48px' }}>
                  water_drop
                </span>
              </motion.div>
              <motion.div
                animate={{ y: [0, -12, 0], x: [0, -5, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
                className="absolute bottom-16 left-12"
              >
                <span className="material-symbols-outlined text-primary/40 dark:text-primary/30" style={{ fontSize: '36px' }}>
                  water_drop
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Water amount display */}
          <div className="mb-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-nura-main dark:text-white mb-2 font-display">
                {waterAmount}<span className="text-3xl text-nura-muted dark:text-gray-400 font-normal">ml</span>
              </div>
            </div>
          </div>

          {/* Water cups visualization */}
          <div className="flex gap-3 mb-8">
            {cups.map((cup, index) => {
              const isFilled = waterAmount >= cup;
              return (
                <motion.div
                  key={cup}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-12 h-16 rounded-xl border-3 transition-all relative ${
                    isFilled
                      ? 'border-primary bg-gradient-to-t from-primary/80 to-primary/40 dark:from-primary/60 dark:to-primary/30'
                      : 'border-nura-border dark:border-gray-600 bg-nura-card dark:bg-surface-dark'
                  }`}
                >
                  {isFilled && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-white text-2xl" style={{ fontWeight: 300 }}>
                        water_drop
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Add water button */}
          <button
            onClick={() => {
              if (waterAmount < maxWater) {
                setWaterAmount(waterAmount + 250);
              }
            }}
            disabled={waterAmount >= maxWater}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg transition-all transform ${
              waterAmount >= maxWater
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-white hover:scale-110'
            }`}
          >
            +
          </button>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Mantenha-se hidratado
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Acompanhe facilmente sua água e atinja suas metas
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

export default WaterTrackingVisualStep;
