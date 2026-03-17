import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const CalorieTrackingExperienceStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const options = [
    {
      value: 'new',
      label: 'Sou novo na contagem de calorias',
      icon: '🔥',
      description: 'Vou aprender com você'
    },
    {
      value: 'tried_quit',
      label: 'Já tentei antes, mas desisti',
      icon: '😰',
      description: 'Vamos fazer diferente desta vez'
    },
    {
      value: 'currently_tracking',
      label: 'Atualmente estou contando',
      icon: '🧮',
      description: 'Continue o ótimo trabalho!'
    },
  ];

  const handleSelect = (value: string) => {
    updateData({ calorieTrackingExperience: value });
    setTimeout(() => onNext(), 300);
  };

  const isSelected = (value: string) => (data as any).calorieTrackingExperience === value;

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Você já tentou contar calorias antes?
          </h2>
        </div>

        <div className="space-y-4 flex-1 flex flex-col justify-center">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left p-6 rounded-3xl border-2 transition-all transform hover:scale-[1.02] ${
                isSelected(option.value)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};

export default CalorieTrackingExperienceStep;
