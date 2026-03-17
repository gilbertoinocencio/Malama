import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PrimaryGoalStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const goals = [
    {
      value: 'lose_weight',
      label: 'Perder peso',
      icon: 'trending_down',
      bgColor: 'bg-gradient-to-br from-nura-petrol-light/20 to-primary/10 dark:from-nura-petrol/20 dark:to-primary/20',
      borderColor: 'border-nura-petrol/20 dark:border-primary/30',
      iconColor: 'text-primary'
    },
    {
      value: 'maintain_weight',
      label: 'Manter o peso',
      icon: 'balance',
      bgColor: 'bg-gradient-to-br from-nura-brown/10 to-nura-pastel-orange/20 dark:from-nura-brown/20 dark:to-nura-pastel-orange/10',
      borderColor: 'border-nura-brown/20 dark:border-nura-brown/30',
      iconColor: 'text-nura-brown'
    },
    {
      value: 'gain_weight',
      label: 'Ganhar peso',
      icon: 'trending_up',
      bgColor: 'bg-gradient-to-br from-primary/10 to-nura-petrol-light/20 dark:from-primary/20 dark:to-nura-petrol/20',
      borderColor: 'border-primary/20 dark:border-nura-petrol/30',
      iconColor: 'text-nura-petrol'
    },
  ];

  const handleSelect = (value: string) => {
    updateData({ primaryGoal: value });
    setTimeout(() => onNext(), 300);
  };

  const isSelected = (value: string) => (data as any).primaryGoal === value;

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl px-6 py-5 shadow-sm flex-1 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-nura-main to-primary dark:from-white dark:to-primary">
              Qual é o seu objetivo principal?
            </h2>
          </div>
        </div>

        <div className="space-y-4 flex-1 flex flex-col justify-center pb-8">
          {goals.map((goal, index) => (
            <motion.button
              key={goal.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(goal.value)}
              className={`w-full text-left p-6 rounded-3xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
                isSelected(goal.value)
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/10'
                  : `${goal.borderColor} ${goal.bgColor}`
              }`}
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-sm border border-white/50 dark:border-white/10">
                  <span className={`material-symbols-outlined text-4xl ${goal.iconColor}`}>
                    {goal.icon}
                  </span>
                </div>
                <span className={`text-xl font-bold font-display ${isSelected(goal.value) ? 'text-primary dark:text-white' : 'text-nura-main dark:text-white'}`}>
                  {goal.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};

export default PrimaryGoalStep;
