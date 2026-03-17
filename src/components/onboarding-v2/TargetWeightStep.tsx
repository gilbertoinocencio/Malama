import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';
import NumberPicker from './shared/NumberPicker';

const TargetWeightStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const weightDiff = data.targetWeight - data.currentWeight;
  const isGain = weightDiff > 0;
  const percentage = Math.abs((weightDiff / data.currentWeight) * 100).toFixed(1);

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Qual é o seu peso objetivo?</h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <NumberPicker value={data.targetWeight} onChange={(value) => updateData({ targetWeight: value })} min={30} max={200} step={0.1} unit="kg" className="w-full max-w-md" />

          {weightDiff !== 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-4 max-w-md w-full">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">Realista</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {isGain ? 'Ganho' : 'Perda'} de peso: {percentage}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button onClick={onNext} className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Seguinte <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default TargetWeightStep;