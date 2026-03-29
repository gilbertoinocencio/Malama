import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const RefeicoesDiariasStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const meals = data.mealsPerDay || 3;

  const handleDecrement = () => updateData({ mealsPerDay: Math.max(1, meals - 1) });
  const handleIncrement = () => updateData({ mealsPerDay: Math.min(6, meals + 1) });

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
    >
      <header className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-tertiary font-headline tracking-tight leading-tight">
          Quantas refeições faz por dia?
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">
          Ajustamos a densidade calórica de cada prato para o seu ritmo.
        </p>
      </header>

      <div className="w-full flex flex-col items-center space-y-12">
        <div className="relative flex items-center justify-center space-x-12">
          <div className="hidden sm:block opacity-20 transform -scale-x-100">
            <span className="material-symbols-outlined text-tertiary text-6xl">restaurant</span>
          </div>
          <div className="flex items-center space-x-8">
            <button 
              onClick={handleDecrement}
              className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-md text-tertiary flex items-center justify-center hover:bg-surface-container-high transition-all duration-300 active:scale-90 border border-outline-variant/10"
            >
              <span className="material-symbols-outlined text-3xl font-bold">remove</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-8xl md:text-9xl font-extrabold text-tertiary font-headline tabular-nums tracking-tighter">
                {meals}
              </span>
              <div className="w-24 h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-tertiary" style={{ width: `${(meals / 6) * 100}%` }}></div>
              </div>
            </div>
            <button 
              onClick={handleIncrement}
              className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-md text-tertiary flex items-center justify-center hover:bg-surface-container-high transition-all duration-300 active:scale-90 border border-outline-variant/10"
            >
              <span className="material-symbols-outlined text-3xl font-bold">add</span>
            </button>
          </div>
          <div className="hidden sm:block opacity-20">
            <span className="material-symbols-outlined text-tertiary text-6xl">restaurant</span>
          </div>
        </div>

        <div className="w-full bg-surface-container-low rounded-lg p-8 flex items-center gap-6 border border-white/40 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-full bg-tertiary-fixed-dim/30 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-tertiary text-2xl">set_meal</span>
          </div>
          <div>
            <h3 className="text-tertiary font-bold font-lexend text-lg">
              {meals <= 2 ? 'Ritmo Leve' : meals <= 4 ? 'Padrão Nutritivo' : 'Frequência Alta'}
            </h3>
            <p className="text-on-surface-variant text-sm font-medium">
              {meals <= 2 ? 'Foco em densidade nutricional em poucas janelas.' : meals <= 4 ? 'Café da manhã, almoço e jantar equilibrados.' : 'Pequenas porções distribuídas ao longo do dia.'}
            </p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default RefeicoesDiariasStep;
