import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const MetodologiaStep: React.FC<StepProps> = ({ onNext, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      showBack={false}
      nextLabel="Entendi o Malama Flow"
    >
      <header className="mb-10 space-y-4">
        <h1 
          className="text-4xl md:text-5xl text-stone-800 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          O que torna o <span style={{ color: PETROL }}>Malama</span> diferente?
        </h1>
        <p className="text-stone-500 text-lg font-light leading-relaxed">
          Nossa metodologia foi desenhada para quem busca harmonia, não restrição.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
        {/* Main Card */}
        <div className="md:col-span-12 bg-white p-8 rounded-2xl shadow-sm border border-stone-100 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wider mb-4 uppercase"
                style={{ background: `${PETROL}10`, color: PETROL }}
              >
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                Flow
              </div>
              <h2 className="text-xl text-stone-800 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                Nutrição sem rigidez, disciplina sem culpa.
              </h2>
              <p className="text-stone-500 text-sm font-light leading-relaxed">
                O Flow não é uma dieta, é um ritmo. Criamos um sistema que se adapta ao seu estilo de vida, permitindo progresso real sem a ansiedade dos métodos tradicionais.
              </p>
            </div>
            <div className="flex-shrink-0 flex justify-center">
              <div className="w-24 h-24 rounded-full border border-stone-100 flex items-center justify-center relative bg-stone-50">
                <span className="material-symbols-outlined text-4xl" style={{ color: PETROL }}>water_drop</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Cards */}
        <div className="md:col-span-12 grid grid-cols-2 gap-4">
          <div 
            className="p-6 rounded-2xl flex flex-col justify-between"
            style={{ background: PETROL, color: 'white' }}
          >
            <span className="material-symbols-outlined text-3xl mb-4">psychology</span>
            <div>
              <h3 className="text-base font-medium mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Bem-estar Mental</h3>
              <p className="opacity-80 font-light text-xs">Eliminamos a obsessão calórica para focar na qualidade.</p>
            </div>
          </div>

          <div className="bg-white border border-stone-100 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex -space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center border-2 border-white">
                <span className="material-symbols-outlined text-stone-400 text-xs">check</span>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white" style={{ background: PETROL }}>
                <span className="material-symbols-outlined text-white text-xs">check</span>
              </div>
            </div>
            <div>
              <h3 className="text-base text-stone-800 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Ritmos Flexíveis</h3>
              <p className="text-stone-500 font-light text-xs">Seu plano respira com você. Sem cobranças.</p>
            </div>
          </div>
        </div>

        {/* Consistency Display */}
        <div className="md:col-span-12 flex flex-col items-center justify-center py-10 bg-white shadow-sm border border-stone-100 rounded-2xl mt-2">
          <p className="text-stone-400 text-xs tracking-widest uppercase font-light mb-4">Meta Ideal</p>
          <div className="flex items-baseline gap-1">
            <span className="text-6xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>85</span>
            <span className="text-xl" style={{ color: PETROL, fontFamily: "'Playfair Display', serif" }}>%</span>
          </div>
          <p className="mt-4 text-xs text-stone-400 max-w-[200px] text-center font-light leading-relaxed">
            "85% de constância no fluxo gera mais resultados do que 100% de perfeição temporária."
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default MetodologiaStep;
