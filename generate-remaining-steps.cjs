const fs = require('fs');
const path = require('path');

// Definições completas de cada passo
const stepsConfig = {
  ReminderScheduleStep: {
    question: 'Quando gostaria de receber lembretes?',
    implementation: `
  const schedules = [
    { value: 'manha', label: 'Manhã', icon: '🌅', time: '08:00' },
    { value: 'almoco', label: 'Almoço', icon: '☀️', time: '12:00' },
    { value: 'tarde', label: 'Tarde', icon: '🌤️', time: '16:00' },
    { value: 'jantar', label: 'Jantar', icon: '🌙', time: '19:00' },
  ];

  const toggleSchedule = (schedule: string) => {
    const current = data.reminderSchedule?.split(',') || [];
    const updated = current.includes(schedule)
      ? current.filter((s: string) => s !== schedule)
      : [...current, schedule];
    updateData({ reminderSchedule: updated.join(',') });
  };

  const selectedSchedules = data.reminderSchedule?.split(',').filter((s: string) => s) || [];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Quando gostaria de receber lembretes?
            </h2>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {schedules.map((schedule) => {
            const isSelected = selectedSchedules.includes(schedule.value);
            return (
              <button
                key={schedule.value}
                onClick={() => toggleSchedule(schedule.value)}
                className={\`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 \${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }\`}
              >
                <span className="text-2xl">{schedule.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{schedule.label}</div>
                  <div className="text-sm text-gray-500">{schedule.time}</div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <button onClick={onNext} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
            Seguinte
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );`
  },

  EatingLocationStep: {
    question: 'Onde costuma comer?',
    implementation: `
  const locations = [
    { value: 'cozinhar_casa', label: 'Cozinhar em casa', icon: '🏠' },
    { value: 'pedir_entrega', label: 'Pedir entrega', icon: '🚗' },
    { value: 'comer_fora', label: 'Comer fora', icon: '🍽️' },
  ];

  const handleSelect = (value: string) => {
    updateData({ eatingLocation: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-12">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Onde costuma comer?</h2>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          {locations.map((location) => {
            const isSelected = data.eatingLocation === location.value;
            return (
              <button
                key={location.value}
                onClick={() => handleSelect(location.value)}
                className={\`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all flex items-center gap-4 \${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }\`}
              >
                <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shadow-sm">
                  {location.icon}
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{location.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );`
  },

  WaterIntakeStep: {
    question: 'Achas que bebes água suficiente?',
    implementation: `
  const options = [
    { value: 'sim', label: 'Sim' },
    { value: 'nao', label: 'Não' },
    { value: 'nao_sei', label: 'Não sei' },
  ];

  const handleSelect = (value: string) => {
    updateData({ drinksEnoughWater: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start gap-4 mb-12">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🦝</span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Achas que bebes água suficiente?</h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 py-6 px-8 rounded-2xl font-semibold text-xl text-gray-900 dark:text-white transition-all"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="h-20"></div>
      </div>
    </StepContainer>
  );`
  },

  GenderStep: {
    question: 'Selecione o seu género',
    implementation: `
  const genders = [
    { value: 'female', label: 'Feminino', icon: '👩' },
    { value: 'male', label: 'Masculino', icon: '👨' },
    { value: 'non_binary', label: 'Não-binário', icon: '🧑' },
  ];

  const handleSelect = (value: string) => {
    updateData({ gender: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-12">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Selecione o seu género</h2>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          {genders.map((gender) => {
            const isSelected = data.gender === gender.value;
            return (
              <button
                key={gender.value}
                onClick={() => handleSelect(gender.value)}
                className={\`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all flex items-center gap-4 \${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }\`}
              >
                <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shadow-sm">
                  {gender.icon}
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{gender.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );`
  }
};

// Template para gerar cada arquivo
const generateStep = (stepName, config) => {
  return `import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const ${stepName}: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
${config.implementation}
};

export default ${stepName};
`;
};

// Gerar os arquivos
const dir = path.join(__dirname, 'src', 'components', 'onboarding-v2');

Object.entries(stepsConfig).forEach(([stepName, config]) => {
  const filePath = path.join(dir, `${stepName}.tsx`);
  const content = generateStep(stepName, config);
  fs.writeFileSync(filePath, content);
  console.log(`✓ Created ${stepName}.tsx`);
});

console.log('\n✅ All critical steps implemented!');
