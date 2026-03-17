import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const IntermittentFastingKnowledgeStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const handleSelection = (knows: boolean) => {
    updateData({ knowsIntermittentFasting: knows });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      showBack={true}
    >
      <div className="flex flex-col h-full justify-between">
        {/* Question */}
        <div>
          <div className="flex items-start gap-4 mb-12">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🦝</span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Conheces o jejum intermitente?
              </h2>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <button
            onClick={() => handleSelection(true)}
            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 py-6 px-8 rounded-2xl font-semibold text-xl text-gray-900 dark:text-white transition-all"
          >
            Sim
          </button>
          <button
            onClick={() => handleSelection(false)}
            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 py-6 px-8 rounded-2xl font-semibold text-xl text-gray-900 dark:text-white transition-all"
          >
            Não
          </button>
        </div>

        <div className="h-20"></div>
      </div>
    </StepContainer>
  );
};

export default IntermittentFastingKnowledgeStep;
