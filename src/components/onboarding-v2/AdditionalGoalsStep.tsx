import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const AdditionalGoalsStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const goals = [
    'Construir uma relação saudável com a comida',
    'Melhorar o bem-estar geral',
    'Gerir o stress',
    'Melhorar o sono',
    'Aumentar a energia',
  ];

  const toggleGoal = (goal: string) => {
    const current = data.additionalGoals || [];
    const updated = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : [...current, goal];
    updateData({ additionalGoals: updated });
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={currentStep > 1 ? onBack : undefined}
      showBack={currentStep > 1}
    >
      <div className="flex flex-col h-full">
        {/* Question with mascot */}
        <div className="flex items-start mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl px-6 py-5 shadow-sm flex-1 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-nura-main to-primary dark:from-white dark:to-primary">
              Algum objetivo adicional?
            </h2>
          </div>
        </div>

        {/* Goal options */}
        <div className="space-y-3 flex-1">
          {goals.map((goal, index) => {
            const isSelected = data.additionalGoals?.includes(goal) || false;
            return (
              <motion.button
                key={goal}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleGoal(goal)}
                className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/10'
                    : 'border-transparent bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-bold ${isSelected ? 'text-primary dark:text-white' : 'text-gray-900 dark:text-gray-200'}`}>
                    {goal}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-8 pb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
          >
            Seguinte
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>
        </div>
      </div>
    </StepContainer>
  );
};

export default AdditionalGoalsStep;
