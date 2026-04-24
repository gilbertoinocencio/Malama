import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const JanelaAlimentarStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  // Use data to manage state if available, otherwise use defaults
  const start = data.eatingWindowStart || '08:00';
  const end = data.eatingWindowEnd || '20:00';

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Confirmar Janela"
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Sua Janela de Alimentação
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          O tempo entre a primeira e a última refeição é crucial para o seu metabolismo.
        </p>
      </div>

      {/* Minimalism Clock Visualization */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mx-auto mb-16">
        {/* Background Circle */}
        <div className="absolute inset-0 rounded-full border-[12px] border-stone-50"></div>
        {/* Progress Arc (Brand Color) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle 
            cx="50" 
            cy="50" 
            fill="none" 
            r="45" 
            stroke="#8c473e" 
            strokeLinecap="round" 
            strokeWidth="6"
            strokeDasharray="283"
            strokeDashoffset="70" // 12h representation
            className="drop-shadow-sm"
          />
        </svg>

        {/* Time Labels and Indicators */}
        <div className="relative z-10 text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-1">Duração</span>
            <span 
              className="text-6xl text-stone-800"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              12h
            </span>
          </div>
        </div>

        {/* Start/End Nodes */}
        <div className="absolute top-4 right-12 flex flex-col items-center transform translate-x-1/2 -translate-y-1/2">
          <div className="bg-white shadow-sm rounded-2xl px-4 py-2 border border-stone-100">
            <span className="block text-[10px] font-medium tracking-widest text-stone-400 uppercase leading-none mb-1 text-center">Início</span>
            <span className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{start}</span>
          </div>
          <div className="w-3 h-3 bg-Malama-petrol rounded-full mt-2 ring-4 ring-Malama-petrol/20"></div>
        </div>

        <div className="absolute bottom-12 left-2 flex flex-col items-center transform -translate-x-1/2 translate-y-1/2">
          <div className="w-3 h-3 bg-Malama-petrol rounded-full mb-2 ring-4 ring-Malama-petrol/20"></div>
          <div className="bg-white shadow-sm rounded-2xl px-4 py-2 border border-stone-100">
            <span className="block text-[10px] font-medium tracking-widest text-stone-400 uppercase leading-none mb-1 text-center">Fim</span>
            <span className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{end}</span>
          </div>
        </div>
      </div>

      {/* Detail Cards (Asymmetric Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
        <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col justify-between transition-all duration-300 hover:bg-stone-50/50">
          <span className="material-symbols-outlined text-Malama-petrol mb-6 text-2xl">restaurant</span>
          <div>
            <h3 className="text-xl text-stone-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Primeira Refeição</h3>
            <p className="text-stone-400 text-sm font-light leading-relaxed">O despertar do seu sistema digestivo.</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col justify-between transition-all duration-300 hover:bg-stone-50/50 mt-0 md:mt-8">
          <span className="material-symbols-outlined text-Malama-petrol mb-6 text-2xl">dark_mode</span>
          <div>
            <h3 className="text-xl text-stone-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Última Refeição</h3>
            <p className="text-stone-400 text-sm font-light leading-relaxed">Preparação para o ciclo de reparo noturno.</p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default JanelaAlimentarStep;
