import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const WaterIntakeStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {

  const options = [
    { value: 'sim', label: 'Sim' },
    { value: 'nao', label: 'Não' },
    { value: 'nao_sei', label: 'Não sei' },
  ];

  const handleSelect = (value: string) => {
    updateData({ drinksEnoughWater: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start mb-12">
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Achas que bebes água suficiente?</h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 py-6 px-8 rounded-2xl font-semibold text-xl text-gray-900 dark:text-white transition-all"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="h-20"></div>
      </div>
    </StepContainer>
  );
};

export default WaterIntakeStep;
