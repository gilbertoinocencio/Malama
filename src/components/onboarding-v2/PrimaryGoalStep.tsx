import React from 'react';
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-nura-main dark:text-white mb-2 font-display">
            Qual é o seu objetivo principal?
          </h2>
        </div>

        <div className="space-y-4 flex-1 flex flex-col justify-center">
          {goals.map((goal) => (
            <button
              key={goal.value}
              onClick={() => handleSelect(goal.value)}
              className={`w-full text-left p-6 rounded-3xl border-2 transition-all transform hover:scale-[1.02] ${
                isSelected(goal.value)
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg'
                  : `${goal.borderColor} ${goal.bgColor} hover:shadow-md`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-nura-card dark:bg-surface-dark rounded-2xl flex items-center justify-center shadow-sm">
                  <span className={`material-symbols-outlined text-4xl ${goal.iconColor}`}>
                    {goal.icon}
                  </span>
                </div>
                <span className="text-xl font-bold text-nura-main dark:text-white font-display">
                  {goal.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};

export default PrimaryGoalStep;
