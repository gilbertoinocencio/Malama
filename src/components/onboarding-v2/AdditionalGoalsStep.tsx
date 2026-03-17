import React from 'react';
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
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Algum objetivo adicional?
            </h2>
          </div>
        </div>

        {/* Goal options */}
        <div className="space-y-3 flex-1">
          {goals.map((goal) => {
            const isSelected = data.additionalGoals?.includes(goal) || false;
            return (
              <button
                key={goal}
                onClick={() => toggleGoal(goal)}
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    {goal}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-green-500 bg-green-500'
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
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-8">
          <button
            onClick={handleNext}
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

export default AdditionalGoalsStep;
