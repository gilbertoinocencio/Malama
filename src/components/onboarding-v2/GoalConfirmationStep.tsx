import React, { useMemo } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const GoalConfirmationStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const goalData = useMemo(() => {
    const currentWeight = data.currentWeight || 70;
    const targetWeight = data.targetWeight || 65;
    const speedKgPerWeek = data.goalSpeedKgPerWeek || 0.5;

    const weightDiff = Math.abs(currentWeight - targetWeight);
    const weeksNeeded = Math.ceil(weightDiff / speedKgPerWeek);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (weeksNeeded * 7));

    // Generate weekly projection data
    const weeklyData = [];
    const totalWeeks = weeksNeeded;
    const direction = currentWeight > targetWeight ? -1 : 1;

    for (let week = 0; week <= Math.min(totalWeeks, 12); week++) {
      const weight = currentWeight + (direction * speedKgPerWeek * week);
      weeklyData.push({
        week,
        weight: Math.max(weight, targetWeight * 0.9) // Don't go below target
      });
    }

    return {
      currentWeight,
      targetWeight,
      weightDiff,
      weeksNeeded,
      targetDate: targetDate.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }),
      weeklyData,
      speedKgPerWeek
    };
  }, [data.currentWeight, data.targetWeight, data.goalSpeedKgPerWeek]);

  // Simple SVG chart
  const chartWidth = 300;
  const chartHeight = 150;
  const maxWeight = Math.max(goalData.currentWeight, goalData.targetWeight) + 5;
  const minWeight = Math.min(goalData.currentWeight, goalData.targetWeight) - 5;

  const getY = (weight: number) => {
    const normalized = (weight - minWeight) / (maxWeight - minWeight);
    return chartHeight - (normalized * chartHeight);
  };

  const getX = (week: number) => {
    return (week / (goalData.weeklyData.length - 1)) * chartWidth;
  };

  const pathData = goalData.weeklyData
    .map((point, index) => {
      const x = getX(point.week);
      const y = getY(point.weight);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Confirme o seu objetivo
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Goal Summary Card */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800 rounded-3xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {goalData.currentWeight.toFixed(1)} → {goalData.targetWeight.toFixed(1)} kg
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Perder {goalData.weightDiff.toFixed(1)} kg em {goalData.weeksNeeded} semanas
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
                {/* Grid lines */}
                <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2}
                      stroke="currentColor" strokeWidth="1" strokeDasharray="4"
                      className="text-gray-300 dark:text-gray-600" opacity="0.5" />

                {/* Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-green-500"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Start point */}
                <circle
                  cx={getX(0)}
                  cy={getY(goalData.currentWeight)}
                  r="5"
                  fill="currentColor"
                  className="text-blue-500"
                />

                {/* End point */}
                <circle
                  cx={getX(goalData.weeklyData[goalData.weeklyData.length - 1].week)}
                  cy={getY(goalData.targetWeight)}
                  r="5"
                  fill="currentColor"
                  className="text-green-500"
                />
              </svg>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>Hoje</span>
                <span>{goalData.targetDate}</span>
              </div>
            </div>

            {/* Target Date */}
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Data objetivo estimada
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {goalData.targetDate}
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="max-w-md w-full space-y-3">
            <div className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl p-4">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                check_circle
              </span>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Plano personalizado baseado nas suas respostas
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl p-4">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                check_circle
              </span>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Recomendações nutricionais adaptadas ao seu estilo de vida
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl p-4">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                check_circle
              </span>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Acompanhamento de progresso semana a semana
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Confirmar e continuar
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default GoalConfirmationStep;
