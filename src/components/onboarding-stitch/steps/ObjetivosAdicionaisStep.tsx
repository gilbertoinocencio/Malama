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
      onNext={onNext}
      onBack={onBack}
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Algum objetivo adicional?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          Personalizamos a sua jornada para focar no que realmente importa hoje.
        </p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-3">
        {OBJETIVOS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`group flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all duration-300 border shadow-sm ${
                isSelected 
                  ? 'bg-stone-50/50 border-Malama-petrol' 
                  : 'bg-white border-stone-100 hover:bg-stone-50/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  isSelected ? 'bg-Malama-petrol/10 text-Malama-petrol' : 'bg-stone-50 text-stone-400'
                }`}>
                  <span className="material-symbols-outlined text-xl">
                    {goal.icon}
                  </span>
                </div>
                <span className={`text-base transition-colors ${
                  isSelected ? 'text-stone-800 font-medium' : 'text-stone-600 font-light'
                }`}>
                  {goal.label}
                </span>
              </div>
              <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                isSelected ? 'bg-Malama-petrol border-Malama-petrol' : 'border border-stone-200 bg-white'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
              </div>
            </div>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default ObjetivosAdicionaisStep;
