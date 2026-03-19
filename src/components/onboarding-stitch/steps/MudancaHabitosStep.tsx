import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const HABITOS = [
  { id: 'comer_noite', label: 'Comer à noite', icon: 'dark_mode' },
  { id: 'beliscar', label: 'Beliscar o dia todo', icon: 'restaurant' },
  { id: 'doces', label: 'Doces em excesso', icon: 'icecream' },
  { id: 'sedentarismo', label: 'Sedentarismo', icon: 'directions_walk' },
];

const MudancaHabitosStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const selected = data.habitsToChange || [];

  const toggleHabit = (id: string) => {
    const next = selected.includes(id) 
      ? selected.filter(h => h !== id)
      : [...selected, id];
    updateData({ habitsToChange: next });
  };

  return (
    <StepContainer
      currentStep={13}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <section className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-primary leading-tight mb-4">
          Quais hábitos quer mudar?
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed font-light">
          Selecione todos os comportamentos que você deseja transformar nesta jornada.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6">
        {HABITOS.map((habit) => {
          const isSelected = selected.includes(habit.id);
          return (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className={`group w-full p-8 rounded-lg flex items-center justify-between transition-all duration-300 ease-in-out border-2 ${
                isSelected 
                  ? 'bg-primary-fixed-dim border-secondary/20 shadow-xl' 
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 ${isSelected ? 'bg-surface-container-lowest' : 'bg-surface-container-highest'}`}>
                  <span className="material-symbols-outlined text-3xl">
                    {habit.icon}
                  </span>
                </div>
                <span className={`text-xl font-medium font-headline ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                  {habit.label}
                </span>
              </div>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? 'bg-secondary border-secondary' : 'border-outline-variant opacity-40'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
              </div>
            </button>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default MudancaHabitosStep;
