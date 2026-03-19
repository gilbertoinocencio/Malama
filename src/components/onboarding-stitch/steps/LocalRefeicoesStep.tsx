import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const LOCAIS = [
  { id: 'casa', label: 'Em casa', icon: 'home' },
  { id: 'trabalho', label: 'No trabalho', icon: 'work' },
  { id: 'restaurante', label: 'Restaurantes/Rua', icon: 'restaurant' },
];

const LocalRefeicoesStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const selected = data.eatingLocation;

  return (
    <StepContainer
      currentStep={8}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="mb-12 space-y-4">
        <h2 className="font-headline text-4xl md:text-5xl text-primary font-bold leading-tight tracking-tight">Onde você costuma comer?</h2>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">Para personalizar seu plano alimentar, precisamos entender sua rotina.</p>
      </div>

      <div className="space-y-6">
        {LOCAIS.map((local) => {
          const isSelected = selected === local.id;
          return (
            <button
              key={local.id}
              onClick={() => updateData({ eatingLocation: local.id })}
              className={`w-full group transition-all duration-300 ease-in-out p-8 rounded-lg text-left flex items-center gap-8 border-2 ${
                isSelected 
                  ? 'bg-primary-fixed-dim border-primary-container/20 ring-2 ring-primary-container/10 shadow-lg' 
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${isSelected ? 'bg-surface-container-lowest' : 'bg-surface-container-highest'}`}>
                <span className={`material-symbols-outlined text-3xl ${isSelected ? 'text-primary' : 'text-primary/70'}`}>
                  {local.icon}
                </span>
              </div>
              <div className="flex-grow">
                <p className={`font-headline text-xl font-medium ${isSelected ? 'text-primary' : 'text-primary/80'}`}>
                  {local.label}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                isSelected ? 'bg-secondary text-surface' : 'border-2 border-outline-variant opacity-40'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-lg">check</span>}
              </div>
            </button>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default LocalRefeicoesStep;
