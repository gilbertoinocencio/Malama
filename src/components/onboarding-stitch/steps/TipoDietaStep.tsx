import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const DIETAS = [
  'Equilibrada',
  'Vegetariana',
  'Vegan',
  'Paleo',
  'Cetogénica',
  'Rica em proteína',
  'Baixa em carbo',
];

const TipoDietaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const selected = data.dietType;

  return (
    <StepContainer
      currentStep={9}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <section className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight mb-4">
          Que tipo de dieta prefere?
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
          Personalize a sua experiência nutritiva selecionando o estilo que melhor se adapta ao seu estilo de vida.
        </p>
      </section>

      <div className="space-y-4">
        {DIETAS.map((dieta) => {
          const isSelected = selected === dieta;
          return (
            <button
              key={dieta}
              onClick={() => updateData({ dietType: dieta })}
              className={`w-full flex items-center justify-between p-8 rounded-lg text-left transition-all duration-300 ease-in-out group border-2 ${
                isSelected 
                  ? 'bg-primary-fixed-dim border-secondary/20 shadow-md ring-2 ring-secondary/10' 
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
              }`}
            >
              <span className={`font-headline text-xl font-medium ${isSelected ? 'text-primary' : 'text-primary/70 group-hover:text-primary'}`}>
                {dieta}
              </span>
              <div className={`transition-all duration-300 ${isSelected ? 'text-secondary scale-110' : 'text-outline-variant opacity-0 group-hover:opacity-100'}`}>
                <span className="material-symbols-outlined text-3xl">
                  {isSelected ? 'check_circle' : 'circle'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default TipoDietaStep;
