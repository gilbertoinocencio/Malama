import React, { useMemo } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';
import NumberPicker from './shared/NumberPicker';

const CurrentWeightStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const bmi = useMemo(() => {
    if (data.currentWeight && data.height) {
      const heightM = data.height / 100;
      return (data.currentWeight / (heightM * heightM)).toFixed(1);
    }
    return '0.0';
  }, [data.currentWeight, data.height]);

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Baixo peso', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Excesso de peso', color: 'text-yellow-600' };
    return { label: 'Obesidade', color: 'text-red-600' };
  };

  const category = getBMICategory(parseFloat(bmi));

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Qual é o seu peso atual?</h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <NumberPicker value={data.currentWeight} onChange={(value) => updateData({ currentWeight: value })} min={30} max={200} step={0.1} unit="kg" className="w-full max-w-md" />

          {parseFloat(bmi) > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 max-w-md w-full">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">O seu IMC:</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{bmi}</div>
              <div className={`text-sm font-semibold ${category.color}`}>{category.label}</div>
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

export default CurrentWeightStep;