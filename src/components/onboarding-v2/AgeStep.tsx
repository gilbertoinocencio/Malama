import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';
import NumberPicker from './shared/NumberPicker';

const AgeStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Qual é a sua idade?</h2>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <NumberPicker value={data.age} onChange={(value) => updateData({ age: value })} min={13} max={100} step={1} className="w-full max-w-md" />
        </div>

        <div className="mt-8">
          <button onClick={onNext} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
            Seguinte <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default AgeStep;