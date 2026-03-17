import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PersonalSummaryStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-center items-center">
        <div className="text-center max-w-2xl">
          <h1 className="text-3xl font-bold mb-4">Resumo Pessoal</h1><p className="text-gray-600 dark:text-gray-400">Analisando seus dados...</p>
          <button onClick={onNext} className="mt-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-8 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
            Seguinte <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default PersonalSummaryStep;
