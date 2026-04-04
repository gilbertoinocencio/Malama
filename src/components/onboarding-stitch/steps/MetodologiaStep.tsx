import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const MetodologiaStep: React.FC<StepProps> = ({ onNext, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      progress={(currentStep / totalSteps) * 100}
      showBack={false}
      nextLabel="Entendi o NURA Flow"
    >
      {/* Header Section */}
      <header className="mb-12 space-y-4">
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight leading-tight">
          O que torna o <span className="text-secondary">NURA</span> diferente?
        </h1>
        <p className="text-on-surface-variant text-xl md:text-2xl font-light max-w-2xl leading-relaxed">
          Nossa metodologia foi desenhada para quem busca harmonia, não restrição.
        </p>
      </header>

      {/* Bento-style Grid for Methodology Features */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
        {/* Main Methodology Card */}
        <div className="md:col-span-12 bg-surface-container-lowest p-8 md:p-12 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.02)] border border-outline-variant/10 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-secondary-container/30 text-secondary px-4 py-1 rounded-full text-sm font-semibold mb-4">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                METODOLOGIA NURA FLOW
              </div>
              <h2 className="font-headline text-3xl text-primary font-semibold mb-4">
                Nutrição sem rigidez, disciplina sem culpa.
              </h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                O Flow não é uma dieta, é um ritmo. Criamos um sistema que se adapta ao seu estilo de vida, permitindo progresso real sem a ansiedade dos métodos tradicionais.
              </p>
            </div>
            <div className="flex-shrink-0 flex justify-center">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-secondary/10 flex items-center justify-center relative">
                <motion.div 
                  className="absolute inset-0 border-t-4 border-secondary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <span className="material-symbols-outlined text-6xl text-secondary">water_drop</span>
              </div>
            </div>
          </div>
        </div>

        {/* Asymmetric Secondary Cards */}
        <div className="md:col-span-7 bg-primary-container text-on-primary-container p-8 rounded-xl flex flex-col justify-between min-h-[240px]">
          <span className="material-symbols-outlined text-4xl">psychology</span>
          <div>
            <h3 className="font-headline text-2xl font-medium mb-2">Foco no Bem-estar Mental</h3>
            <p className="opacity-80 font-light text-sm">Eliminamos a obsessão calórica para focar na qualidade dos nutrientes e na sua relação com a comida.</p>
          </div>
        </div>

        <div className="md:col-span-5 bg-surface-container-high p-8 rounded-xl flex flex-col justify-between min-h-[240px]">
          <div className="flex -space-x-4">
            <div className="w-10 h-10 rounded-full bg-secondary-fixed-dim flex items-center justify-center border-2 border-surface">
              <span className="material-symbols-outlined text-on-secondary-fixed text-sm">check</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-surface">
              <span className="material-symbols-outlined text-on-secondary text-sm">check</span>
            </div>
          </div>
          <div>
            <h3 className="font-headline text-2xl text-primary font-medium mb-2">Ritmos Flexíveis</h3>
            <p className="text-on-surface-variant font-light text-sm">Seu plano respira com você. Dias intensos pedem nutrição de suporte, não cobrança.</p>
          </div>
        </div>

        {/* Numerical Depth Input (Contextual representation) */}
        <div className="md:col-span-12 flex flex-col items-center justify-center py-12 bg-surface-container-low rounded-xl">
          <p className="text-on-surface-variant mb-6 font-medium">Sua meta de equilíbrio atual</p>
          <div className="flex items-baseline gap-2 group cursor-pointer">
            <span className="font-headline text-7xl md:text-9xl text-primary font-extrabold tracking-tighter">85</span>
            <span className="text-3xl font-headline text-secondary font-bold">%</span>
          </div>
          <div className="w-48 h-[2px] bg-surface-container-highest mt-2 relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-primary"
              initial={{ width: 0 }}
              animate={{ width: '80%' }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <p className="mt-8 text-sm text-on-surface-variant/60 max-w-xs text-center italic leading-relaxed">
            "85% de constância no NURA Flow gera mais resultados do que 100% de perfeição em dietas temporárias."
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default MetodologiaStep;
