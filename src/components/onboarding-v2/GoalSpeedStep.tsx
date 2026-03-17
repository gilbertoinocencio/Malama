import React, { useMemo } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const GoalSpeedStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  // Speed options: 0 = Lento (0.25 kg/week), 1 = Ótimo (0.5 kg/week), 2 = Rápido (0.75 kg/week)
  const speedValue = data.goalSpeedKgPerWeek || 0.5;

  const getSpeedLevel = (kgPerWeek: number): number => {
    if (kgPerWeek <= 0.25) return 0;
    if (kgPerWeek <= 0.5) return 1;
    return 2;
  };

  const speedLevel = getSpeedLevel(speedValue);

  const speedOptions = [
    { level: 0, label: 'Lento', value: 0.25, color: 'bg-blue-500' },
    { level: 1, label: 'Ótimo', value: 0.5, color: 'bg-green-500' },
    { level: 2, label: 'Rápido', value: 0.75, color: 'bg-orange-500' }
  ];

  const targetDate = useMemo(() => {
    if (!data.currentWeight || !data.targetWeight || !speedValue) return null;

    const weightDiff = Math.abs(data.currentWeight - data.targetWeight);
    const weeksNeeded = Math.ceil(weightDiff / speedValue);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (weeksNeeded * 7));

    return {
      weeks: weeksNeeded,
      date: targetDate.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
    };
  }, [data.currentWeight, data.targetWeight, speedValue]);

  const handleSpeedChange = (level: number) => {
    const option = speedOptions[level];
    updateData({ goalSpeedKgPerWeek: option.value });
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Com que rapidez quer atingir seu objetivo?
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          {/* Speed Display */}
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
              {speedValue.toFixed(2)} <span className="text-4xl text-gray-500">kg/semana</span>
            </div>
            <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">
              {speedOptions[speedLevel].label}
            </div>
          </div>

          {/* Slider */}
          <div className="w-full max-w-md px-4">
            <div className="relative">
              {/* Track */}
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                {/* Active track */}
                <div
                  className={`h-3 ${speedOptions[speedLevel].color} rounded-full transition-all duration-300`}
                  style={{ width: `${(speedLevel / 2) * 100}%` }}
                />
              </div>

              {/* Markers */}
              <div className="absolute top-0 left-0 right-0 flex justify-between">
                {speedOptions.map((option) => (
                  <button
                    key={option.level}
                    onClick={() => handleSpeedChange(option.level)}
                    className="relative -mt-1"
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 transition-all ${
                        speedLevel === option.level
                          ? `${option.color} scale-125`
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        speedLevel === option.level
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {option.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Target Date Info */}
          {targetDate && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 max-w-md w-full text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Data objetivo estimada
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {targetDate.date}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Em aproximadamente {targetDate.weeks} semanas
              </div>
            </div>
          )}

          {/* Recommendation */}
          {speedLevel === 1 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 max-w-md w-full">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                  check_circle
                </span>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Esta é a velocidade recomendada para uma perda de peso saudável e sustentável.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Seguinte
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default GoalSpeedStep;
