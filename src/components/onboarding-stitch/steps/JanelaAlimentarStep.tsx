import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const JanelaAlimentarStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  // Use data to manage state if available, otherwise use defaults
  const start = data.eatingWindowStart || '08:00';
  const end = data.eatingWindowEnd || '20:00';

  return (
    <StepContainer
      currentStep={6}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Confirmar Janela"
    >
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Sua Janela de Alimentação</h1>
        <p className="font-body text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
          O tempo entre a primeira e a última refeição é crucial para o seu metabolismo.
        </p>
      </div>

      {/* Minimalism Clock Visualization */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mx-auto mb-16">
        {/* Background Circle */}
        <div className="absolute inset-0 rounded-full border-[12px] border-surface-container"></div>
        {/* Progress Arc (Emerald) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle 
            cx="50" 
            cy="50" 
            fill="none" 
            r="45" 
            stroke="#006d36" 
            strokeLinecap="round" 
            strokeWidth="6"
            strokeDasharray="283"
            strokeDashoffset="70" // 12h representation
          />
        </svg>

        {/* Time Labels and Indicators */}
        <div className="relative z-10 text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Duração</span>
            <span className="font-headline text-5xl font-extrabold text-primary">12h</span>
          </div>
        </div>

        {/* Start/End Nodes */}
        <div className="absolute top-4 right-12 flex flex-col items-center transform translate-x-1/2 -translate-y-1/2">
          <div className="bg-surface-container-lowest shadow-md rounded-2xl px-3 py-2 border-2 border-secondary/10">
            <span className="block text-[10px] font-bold text-secondary uppercase leading-none mb-1 text-center">Início</span>
            <span className="font-headline text-lg font-bold text-primary">{start}</span>
          </div>
          <div className="w-3 h-3 bg-secondary rounded-full mt-2 ring-4 ring-secondary/20"></div>
        </div>

        <div className="absolute bottom-12 left-2 flex flex-col items-center transform -translate-x-1/2 translate-y-1/2">
          <div className="w-3 h-3 bg-secondary rounded-full mb-2 ring-4 ring-secondary/20"></div>
          <div className="bg-surface-container-lowest shadow-md rounded-2xl px-3 py-2 border-2 border-secondary/10">
            <span className="block text-[10px] font-bold text-secondary uppercase leading-none mb-1 text-center">Fim</span>
            <span className="font-headline text-lg font-bold text-primary">{end}</span>
          </div>
        </div>
      </div>

      {/* Detail Cards (Asymmetric Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
        <div className="bg-surface-container-low p-8 rounded-lg flex flex-col justify-between transition-all duration-300 hover:bg-surface-container-highest">
          <span className="material-symbols-outlined text-secondary mb-4">restaurant</span>
          <div>
            <h3 className="font-headline text-xl font-bold text-primary mb-2">Primeira Refeição</h3>
            <p className="text-on-surface-variant text-sm">O despertar do seu sistema digestivo.</p>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-lg flex flex-col justify-between transition-all duration-300 hover:bg-surface-container-highest mt-4 md:mt-8">
          <span className="material-symbols-outlined text-secondary mb-4">dark_mode</span>
          <div>
            <h3 className="font-headline text-xl font-bold text-primary mb-2">Última Refeição</h3>
            <p className="text-on-surface-variant text-sm">Preparação para o ciclo de reparo noturno.</p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default JanelaAlimentarStep;
