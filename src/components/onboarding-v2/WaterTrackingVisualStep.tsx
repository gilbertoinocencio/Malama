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

  const raccoonAnimations = {
    idle: '😊',
    drinking: '💧',
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Raccoon mascot with water */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8"
          >
            <div className="w-64 h-64 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-3xl flex items-center justify-center relative overflow-hidden">
              {/* Raccoon */}
              <div className="text-8xl z-10">
                🦝
              </div>

              {/* Water bottle/snorkel accessory */}
              <div className="absolute top-12 right-12 text-5xl transform rotate-12">
                🥽
              </div>
            </div>
          </motion.div>

          {/* Water amount display */}
          <div className="mb-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                {waterAmount}<span className="text-3xl text-gray-500">ml</span>
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
                  className={`w-12 h-16 rounded-lg border-4 transition-all relative ${
                    isFilled
                      ? 'border-blue-500 bg-gradient-to-t from-blue-400 to-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {isFilled && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="text-white text-2xl">💧</span>
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
            className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg transition-all transform hover:scale-110 mb-6"
          >
            +
          </button>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Mantenha-se hidratado
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Acompanhe facilmente sua água e atinja suas metas
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

export default WaterTrackingVisualStep;
