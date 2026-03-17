const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components', 'onboarding-v2');

// Implementações completas para cada passo
const steps = {
  'EatingWindowStep.tsx': `import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const EatingWindowStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Entre que horas come?</h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Início</label>
            <input
              type="time"
              value={data.eatingWindowStart}
              onChange={(e) => updateData({ eatingWindowStart: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fim</label>
            <input
              type="time"
              value={data.eatingWindowEnd}
              onChange={(e) => updateData({ eatingWindowEnd: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold"
            />
          </div>
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

export default EatingWindowStep;`,

  'WaterEducationStep.tsx': `import React from 'react';
import { StepProps } from './types';

const WaterEducationStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto">
        <div className="text-6xl mb-8">💧</div>
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Hidratação é essencial
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Melhora a função cerebral e concentração</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Regula a temperatura corporal</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Auxilia na digestão e absorção de nutrientes</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Mantém a pele saudável e hidratada</span>
            </li>
          </ul>
        </div>

        <button onClick={onNext} className="w-full max-w-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
          Seguinte <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default WaterEducationStep;`,

  'HabitChangesStep.tsx': `import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const HabitChangesStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const habits = [
    'Reduzir o consumo de açúcar',
    'Comer menos "junk food"',
    'Evitar comer de forma compulsiva',
    'Comer mais vegetais e legumes',
    'Parar de comer por stress',
    'Cozinhar mais vezes em casa',
    'Reduzir o consumo de sal',
  ];

  const toggleHabit = (habit: string) => {
    const current = data.habitChanges || [];
    const updated = current.includes(habit) ? current.filter((h: string) => h !== habit) : [...current, habit];
    updateData({ habitChanges: updated });
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              O que gostaria de mudar nos seus hábitos alimentares?
            </h2>
          </div>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto">
          {habits.map((habit) => {
            const isSelected = data.habitChanges?.includes(habit) || false;
            return (
              <button
                key={habit}
                onClick={() => toggleHabit(habit)}
                className={\`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all \${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }\`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{habit}</span>
                  <div className={\`w-6 h-6 rounded-full border-2 flex items-center justify-center \${
                      isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'
                    }\`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
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

export default HabitChangesStep;`,

  'ActivityLevelStep.tsx': `import React from 'react';
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
                className={\`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all \${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }\`}
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

export default ActivityLevelStep;`
};

// Escrever todos os arquivos
Object.entries(steps).forEach(([filename, content]) => {
  const filePath = path.join(componentsDir, filename);
  fs.writeFileSync(filePath, content);
  console.log(`✓ Implemented ${filename}`);
});

console.log('\n✅ Critical steps fully implemented!');
console.log('📝 Steps completed: EatingWindow, WaterEducation, HabitChanges, ActivityLevel');
