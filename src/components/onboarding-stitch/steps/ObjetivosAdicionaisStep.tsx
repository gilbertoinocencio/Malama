import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const OBJETIVOS = [
  { id: 'relacao_comida', label: 'Relação saudável com comida', icon: 'restaurant' },
  { id: 'bem_estar', label: 'Bem-estar geral', icon: 'spa' },
  { id: 'gerir_stress', label: 'Gerir stress', icon: 'psychology' },
  { id: 'melhorar_sono', label: 'Melhorar sono', icon: 'bedtime' },
  { id: 'aumentar_energia', label: 'Aumentar energia', icon: 'bolt' },
];

const ObjetivosAdicionaisStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const selectedGoals = data.additionalGoals || [];

  const toggleGoal = (goalId: string) => {
    const newGoals = selectedGoals.includes(goalId)
      ? selectedGoals.filter(id => id !== goalId)
      : [...selectedGoals, goalId];
    updateData({ additionalGoals: newGoals });
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
    >
      <section className="mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight leading-tight mb-4">
          Algum objetivo adicional?
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md">
          Personalizamos a sua jornada para focar no que realmente importa hoje.
        </p>
      </section>

      <div className="space-y-4">
        {OBJETIVOS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`group relative flex items-center justify-between p-8 rounded-[1.5rem] cursor-pointer transition-all duration-300 border-2 ${
                isSelected 
                  ? 'bg-primary-fixed-dim border-secondary/20 shadow-lg shadow-primary/5 ring-2 ring-secondary/10' 
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${isSelected ? 'bg-secondary-container/30' : 'bg-white/60'}`}>
                  <span className={`material-symbols-outlined ${isSelected ? 'text-secondary' : 'text-primary opacity-70'}`}>
                    {goal.icon}
                  </span>
                </div>
                <div>
                  <span className={`text-xl font-medium block ${isSelected ? 'text-primary' : 'text-primary/80'}`}>
                    {goal.label}
                  </span>
                </div>
              </div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                isSelected ? 'bg-secondary text-on-secondary' : 'border-2 border-outline-variant opacity-40'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-sm">check</span>}
              </div>
            </div>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default ObjetivosAdicionaisStep;
