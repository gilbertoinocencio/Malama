import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const DietTypeStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const dietTypes = [
    { value: 'equilibrada', label: 'Equilibrada', icon: '⚖️' },
    { value: 'vegetariana', label: 'Vegetariana', icon: '🥕' },
    { value: 'vegan', label: 'Vegan', icon: '🥦' },
    { value: 'paleo', label: 'Paleo', icon: '🍖' },
    { value: 'cetogenica', label: 'Cetogênica', icon: '🥑' },
    { value: 'rica_proteina', label: 'Rica em proteína', icon: '🥚' },
    { value: 'baixa_carboidratos', label: 'Baixa em hidratos de carbono', icon: '🍞' },
  ];

  const handleSelect = (value: string) => {
    updateData({ dietType: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      showBack={true}
    >
      <div className="flex flex-col h-full">
        {/* Question with mascot */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Que tipo de dieta prefere?
            </h2>
          </div>
        </div>

        {/* Diet options */}
        <div className="space-y-3 flex-1 overflow-y-auto">
          {dietTypes.map((diet) => {
            const isSelected = data.dietType === diet.value;
            return (
              <button
                key={diet.value}
                onClick={() => handleSelect(diet.value)}
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                  {diet.icon}
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white flex-1">
                  {diet.label}
                </span>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
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
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );
};

export default DietTypeStep;
