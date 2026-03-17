import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const ActivityLevelStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const levels = [
    {
      value: 'sedentary',
      title: 'Pouco ativo',
      description: 'Trabalho de escritório, pouca atividade física',
      icon: '🪑'
    },
    {
      value: 'light',
      title: 'Ligeiramente ativo',
      description: 'Exercício leve 1-3 dias por semana',
      icon: '🚶'
    },
    {
      value: 'moderate',
      title: 'Moderadamente ativo',
      description: 'Exercício moderado 3-5 dias por semana',
      icon: '🏃'
    },
    {
      value: 'very',
      title: 'Muito ativo',
      description: 'Exercício intenso 6-7 dias por semana',
      icon: '💪'
    },
  ];

  const handleSelect = (value: string) => {
    updateData({ activityLevel: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Qual é o seu nível de atividade?</h2>
          </div>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {levels.map((level) => {
            const isSelected = data.activityLevel === level.value;
            return (
              <button
                key={level.value}
                onClick={() => handleSelect(level.value)}
                className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                    {level.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900 dark:text-white mb-1">{level.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{level.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );
};

export default ActivityLevelStep;