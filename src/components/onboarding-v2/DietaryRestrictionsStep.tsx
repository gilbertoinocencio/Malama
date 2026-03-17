import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';
import OptionChip from './shared/OptionChip';

const DietaryRestrictionsStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const restrictions = [
    'Toda a carne',
    'Produtos de origem animal',
    'Citrinos',
    'Laticínios',
    'Ovos',
    'Peixe',
    'Glúten',
    'Frutos secos',
    'Carne vermelha',
    'Frutos do mar',
    'Sementes',
    'Marisco',
    'Soja',
  ];

  const toggleRestriction = (restriction: string) => {
    const current = data.dietaryRestrictions || [];
    const updated = current.includes(restriction)
      ? current.filter((r: string) => r !== restriction)
      : [...current, restriction];
    updateData({ dietaryRestrictions: updated });
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
              Tens alguma restrição alimentar ou alergia?
            </h2>
          </div>
        </div>

        {/* Chips grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-3">
            {restrictions.map((restriction) => {
              const isSelected = data.dietaryRestrictions?.includes(restriction) || false;
              return (
                <OptionChip
                  key={restriction}
                  label={restriction}
                  selected={isSelected}
                  onClick={() => toggleRestriction(restriction)}
                />
              );
            })}
            {/* Add custom button */}
            <button
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full
                bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                border-2 border-gray-200 dark:border-gray-700
                hover:border-gray-300 dark:hover:border-gray-600
                font-medium text-base transition-all"
            >
              <span className="text-xl">+</span>
            </button>
          </div>
        </div>

        {/* Continue button */}
        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            Seguinte
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default DietaryRestrictionsStep;
