import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const VelocidadeMetaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const speed = data.goalSpeed || 3;

  return (
    <StepContainer
      currentStep={16}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="w-full mb-12 space-y-4">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-primary leading-tight">
          Qual a velocidade do seu objetivo?
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
          Escolha o ritmo que melhor se adapta à sua rotina atual. Sustentabilidade é a chave para o sucesso.
        </p>
      </div>

      {/* Asymmetric Visual Impact Display */}
      <div className="w-full grid grid-cols-2 gap-6 mb-16">
        <div className={`bg-surface-container-lowest p-8 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-sm transition-all duration-500 border-2 ${speed <= 2 ? 'border-secondary/40 scale-105' : 'border-transparent'}`}>
          <span className={`material-symbols-outlined text-5xl ${speed <= 2 ? 'text-secondary' : 'text-secondary/40'}`} style={{ fontVariationSettings: "'wght' 200" }}>
            egg
          </span>
          <span className={`font-headline text-sm font-medium ${speed <= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>Lento e sustentável</span>
        </div>
        <div className={`bg-surface-container-lowest p-8 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-sm transition-all duration-500 border-2 ${speed >= 4 ? 'border-secondary/40 scale-105' : 'border-transparent'}`}>
          <span className={`material-symbols-outlined text-5xl ${speed >= 4 ? 'text-secondary' : 'text-secondary/40'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
          <span className={`font-headline text-sm font-medium ${speed >= 4 ? 'text-primary' : 'text-on-surface-variant'}`}>Rápido e intenso</span>
        </div>
      </div>

      {/* Sophisticated Slider Section */}
      <div className="w-full px-4 mb-20">
        <div className="relative w-full py-8">
          <input 
            className="w-full h-2 rounded-full appearance-none bg-surface-container-highest accent-secondary cursor-pointer"
            type="range" 
            min="1" 
            max="5" 
            step="1" 
            value={speed}
            onChange={(e) => updateData({ goalSpeed: parseInt(e.target.value) })}
          />
          <div className="flex justify-between w-full mt-6 px-2">
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest font-headline">Ritmo</span>
              <span className="text-sm font-semibold text-secondary">Gradual</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest font-headline">Foco</span>
              <span className="text-sm font-semibold text-primary">Acelerado</span>
            </div>
          </div>
        </div>

        {/* Impact Summary Card */}
        <div className="mt-8 p-8 bg-secondary-container/20 rounded-xl flex items-center space-x-6 border border-secondary/10">
          <div className="bg-secondary p-3 rounded-full shadow-sm">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <div>
            <h3 className="font-headline font-semibold text-on-secondary-container">Impacto previsto</h3>
            <p className="text-on-surface-variant text-sm">
              Este ritmo permite alcançar seu objetivo em aproximadamente <span className="font-bold text-secondary">{Math.max(4, 20 - speed * 3)} semanas</span> de forma consistente.
            </p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default VelocidadeMetaStep;
