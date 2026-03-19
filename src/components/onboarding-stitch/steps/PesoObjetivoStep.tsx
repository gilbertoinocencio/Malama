import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PesoObjetivoStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const target = data.targetWeight || 70;

  const handleDecrement = () => updateData({ targetWeight: Math.max(30, target - 0.5) });
  const handleIncrement = () => updateData({ targetWeight: Math.min(250, target + 0.5) });

  return (
    <StepContainer
      currentStep={15}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">
          Qual é o seu peso objetivo?
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
          Definir uma meta clara é o primeiro passo para uma jornada de transformação sustentável.
        </p>
      </div>

      <div className="w-full bg-surface-container-lowest rounded-xl p-10 flex flex-col items-center justify-center relative shadow-sm border border-white/50">
        {/* Subtitle/Label */}
        <span className="text-tertiary font-headline font-semibold tracking-widest text-xs uppercase mb-8">Meta Desejada</span>
        <div className="flex items-end justify-center gap-2 mb-10">
          <div className="relative group">
            <input 
              className="w-48 bg-transparent border-none text-center font-headline text-8xl font-extrabold text-primary p-0 focus:ring-0 placeholder-surface-container-highest transition-all duration-300"
              type="number" 
              value={target}
              onChange={(e) => updateData({ targetWeight: parseFloat(e.target.value) || 0 })}
              step="0.1"
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-surface-container-highest group-focus-within:w-full group-focus-within:bg-secondary transition-all duration-500 rounded-full"></div>
          </div>
          <span className="font-headline text-3xl font-medium text-tertiary pb-4">kg</span>
        </div>

        {/* Motivational Micro-copy */}
        <div className="flex items-center gap-3 bg-surface-container-low px-6 py-3 rounded-full border border-surface-variant/30">
          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          <p className="text-sm font-medium text-on-surface-variant">
            Sua meta é realista e saudável para o seu perfil.
          </p>
        </div>

        {/* Stepper Controls (Tactile) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4">
          <button 
            onClick={handleIncrement}
            className="w-12 h-12 flex items-center justify-center bg-surface-container-high rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-90 shadow-sm"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <button 
            onClick={handleDecrement}
            className="w-12 h-12 flex items-center justify-center bg-surface-container-high rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-90 shadow-sm"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
        </div>
      </div>

      {/* Secondary Guidance Card */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-tertiary-fixed text-on-tertiary-fixed p-6 rounded-lg flex flex-col justify-between h-32 border border-tertiary/10">
          <span className="material-symbols-outlined text-tertiary text-3xl">psychology</span>
          <p className="text-xs font-medium leading-tight">A ciência mostra que metas visíveis aumentam a retenção em 40%.</p>
        </div>
        <div className="bg-surface-container-high p-6 rounded-lg flex flex-col justify-between h-32">
          <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            eco
          </span>
          <p className="text-xs font-medium leading-tight text-on-surface-variant">Equilíbrio metabólico é nossa prioridade absoluta.</p>
        </div>
      </div>
    </StepContainer>
  );
};

export default PesoObjetivoStep;
