import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const ImpactoAguaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={onNext}
      nextLabel="Entendi"
    >
      <main className="flex-grow pt-24 pb-32 px-6 max-w-md mx-auto w-full flex flex-col">
        {/* Background Decorative */}
        <div className="fixed -right-20 top-40 opacity-10 pointer-events-none rotate-12">
          <span className="material-symbols-outlined text-[300px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
        </div>

        {/* Header */}
        <section className="w-full mb-12">
          <p className="font-headline text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-3 font-semibold">NURA Flow Identity</p>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-tertiary leading-tight">
            O impacto visual <br />da água
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg font-medium leading-relaxed">
            Manter-se hidratado não é apenas sobre sede. É o combustível silencioso do seu metabolismo.
          </p>
        </section>

        {/* Main Visualization Card */}
        <div className="bg-surface-container-lowest rounded-lg p-8 shadow-[0_16px_32px_rgba(26,28,26,0.04)] relative overflow-hidden group mb-6">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-headline text-xl font-bold text-tertiary">Taxa Metabólica</h3>
              <p className="text-sm text-on-surface-variant">Aumento calórico por hidratação</p>
            </div>
            <div className="bg-secondary-container/30 p-3 rounded-full">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
          </div>
          {/* Bar Chart */}
          <div className="relative h-36 w-full flex items-end justify-between gap-2 px-2">
            <div className="w-full bg-surface-container-high rounded-full h-[30%]"></div>
            <div className="w-full bg-surface-container-high rounded-full h-[45%]"></div>
            <div className="w-full bg-secondary/20 rounded-full h-[60%]"></div>
            <div className="w-full bg-secondary/40 rounded-full h-[75%]"></div>
            <div className="w-full bg-secondary/70 rounded-full h-[85%]"></div>
            <div className="w-full bg-tertiary rounded-full h-[95%]"></div>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-outline-variant/15 pt-6">
            <div className="text-center">
              <span className="block font-headline text-2xl font-bold text-tertiary">24%</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Aumento médio</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/30"></div>
            <div className="text-center">
              <span className="block font-headline text-2xl font-bold text-secondary">400ml</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Dose ideal</span>
            </div>
          </div>
        </div>

        {/* Scientific Note */}
        <div className="bg-surface-container-low rounded-lg p-6 flex items-start gap-4">
          <span className="material-symbols-outlined text-tertiary text-xl flex-shrink-0">science</span>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Estudos mostram que beber 500ml de água pode elevar temporariamente o metabolismo em até 30% nos 60 minutos seguintes.
          </p>
        </div>
      </main>

    </StepContainer>
  );
};

export default ImpactoAguaStep;
