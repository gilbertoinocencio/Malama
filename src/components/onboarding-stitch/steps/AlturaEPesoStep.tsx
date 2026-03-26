import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const AlturaEPesoStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [altura, setAltura] = useState<number>(data.altura || 175);
  const [peso, setPeso] = useState<number>(data.peso || 74.5);

  const handleContinue = () => {
    updateData({ altura, peso });
    onNext();
  };

  const adjustAltura = (delta: number) => {
    setAltura(prev => Math.max(100, Math.min(250, prev + delta)));
  };

  const adjustPeso = (delta: number) => {
    setPeso(prev => Math.max(30, Math.min(300, Number((prev + delta).toFixed(1)))));
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <main className="flex-grow pt-24 pb-32 px-6 max-w-xl mx-auto w-full flex flex-col items-center justify-center relative">
        {/* Contextual Leaf Decoration */}
        <div className="fixed -right-20 top-1/4 opacity-10 pointer-events-none transform rotate-12">
          <span
            className="material-symbols-outlined text-[300px] text-secondary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            spa
          </span>
        </div>

        {/* Headline Section */}
        <section className="w-full text-center mb-12">
          <span className="text-on-surface-variant font-label text-sm tracking-widest uppercase mb-2 block">
            Etapa {currentStep} de {totalSteps}
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight">
            Sua Biometria
          </h1>
          <p className="text-on-surface-variant mt-4 text-lg">
            Dados precisos para um acompanhamento excepcional.
          </p>
        </section>

        {/* Biometric Input Cards */}
        <div className="w-full space-y-8">
          {/* Height Section (Altura) */}
          <div className="group relative bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-transparent hover:border-outline-variant/15 transition-all duration-500">
            <div className="flex justify-between items-end mb-6">
              <h2 className="font-headline text-xl font-medium text-primary">Altura</h2>
              <div className="flex items-baseline">
                <span className="font-headline text-5xl font-bold text-primary">{altura}</span>
                <span className="ml-1 text-on-surface-variant font-medium">cm</span>
              </div>
            </div>

            {/* Custom Horizontal Scroller */}
            <div className="relative w-full overflow-hidden py-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => adjustAltura(-1)}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all duration-300"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <div className="flex-1 h-12 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary transition-all duration-300"
                    style={{ width: `${((altura - 100) / 150) * 100}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => adjustAltura(1)}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all duration-300"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Weight Section (Peso Atual) */}
          <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-transparent hover:border-outline-variant/15 transition-all duration-500">
            <div className="flex justify-between items-end mb-4">
              <h2 className="font-headline text-xl font-medium text-primary">Peso Atual</h2>
              <div className="flex items-baseline">
                <span className="font-headline text-5xl font-bold text-primary">{peso}</span>
                <span className="ml-1 text-on-surface-variant font-medium">kg</span>
              </div>
            </div>

            {/* Visual Weight Scale Representation */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={() => adjustPeso(-0.5)}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all duration-300"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <div className="flex-grow h-12 relative flex items-center px-4">
                <div className="absolute inset-0 bg-surface-container rounded-full opacity-30"></div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary transition-all duration-300"
                    style={{ width: `${((peso - 30) / 270) * 100}%` }}
                  ></div>
                </div>
              </div>
              <button
                onClick={() => adjustPeso(0.5)}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all duration-300"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Text */}
        <p className="mt-8 text-on-surface-variant/70 text-sm italic text-center px-4">
          * Seus dados são criptografados e utilizados apenas para personalizar seu plano nutricional.
        </p>
      </main>

    </StepContainer>
  );
};

export default AlturaEPesoStep;
