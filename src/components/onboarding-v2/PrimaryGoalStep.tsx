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
      icon: '📉',
      bgColor: 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    {
      value: 'maintain_weight',
      label: 'Manter o peso',
      icon: '⚖️',
      bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    {
      value: 'gain_weight',
      label: 'Ganhar peso',
      icon: '💪',
      bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
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
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
                  : `${goal.borderColor} ${goal.bgColor} hover:shadow-md`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center text-4xl shadow-sm">
                  {goal.icon}
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
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
