import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const EatingLocationStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {

  const locations = [
    { value: 'cozinhar_casa', label: 'Cozinhar em casa', icon: '🏠' },
    { value: 'pedir_entrega', label: 'Pedir entrega', icon: '🚗' },
    { value: 'comer_fora', label: 'Comer fora', icon: '🍽️' },
  ];

  const handleSelect = (value: string) => {
    updateData({ eatingLocation: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-12">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Onde costuma comer?</h2>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          {locations.map((location) => {
            const isSelected = data.eatingLocation === location.value;
            return (
              <button
                key={location.value}
                onClick={() => handleSelect(location.value)}
                className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }`}
              >
                <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shadow-sm">
                  {location.icon}
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{location.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );
};

export default EatingLocationStep;
