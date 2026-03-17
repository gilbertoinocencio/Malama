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
      icon: 'new_releases',
      description: 'Vou aprender com você',
      iconColor: 'text-primary'
    },
    {
      value: 'tried_quit',
      label: 'Já tentei antes, mas desisti',
      icon: 'restart_alt',
      description: 'Vamos fazer diferente desta vez',
      iconColor: 'text-nura-brown'
    },
    {
      value: 'currently_tracking',
      label: 'Atualmente estou contando',
      icon: 'check_circle',
      description: 'Continue o ótimo trabalho!',
      iconColor: 'text-nura-petrol'
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
          <h2 className="text-2xl font-bold text-nura-main dark:text-white mb-2 font-display">
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
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg'
                  : 'border-nura-border dark:border-gray-700 bg-nura-card dark:bg-surface-dark hover:border-nura-petrol/30 dark:hover:border-primary/30 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-nura-petrol-light/30 to-primary/20 dark:from-nura-petrol/30 dark:to-primary/20 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className={`material-symbols-outlined text-3xl ${option.iconColor}`}>
                    {option.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-nura-main dark:text-white mb-1 font-display">
                    {option.label}
                  </div>
                  <div className="text-sm text-nura-muted dark:text-gray-400">
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
