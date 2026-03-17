import React from 'react';
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
        <div className="flex items-start mb-8">
          
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
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{habit}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
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
          <button onClick={onNext} className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Seguinte <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default HabitChangesStep;