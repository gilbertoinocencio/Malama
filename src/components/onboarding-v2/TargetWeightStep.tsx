import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

interface TargetWeightStepProps extends Omit<StepProps, 'data' | 'updateData'> {
  data?: any;
  updateData?: any;
  onComplete?: () => void;
}

const TargetWeightStep: React.FC<TargetWeightStepProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      showBack={true}
    >
      <div className="flex flex-col h-full justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            TargetWeight
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Este passo será implementado
          </p>
          <button
            onClick={onNext}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-8 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Seguinte →
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default TargetWeightStep;
