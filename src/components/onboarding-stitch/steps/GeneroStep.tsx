import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const GeneroStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [genero, setGenero] = useState<'masculino' | 'feminino' | null>(data.genero || null);

  const handleSelect = (value: 'masculino' | 'feminino') => {
    setGenero(value);
    updateData({ genero: value });
  };

  const handleContinue = () => {
    if (genero) {
      onNext();
    }
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
      showFooter={false}
    >
      {/* Contextual Leaf (Decorative background) */}
      <div className="fixed top-1/4 -right-20 w-64 h-64 bg-secondary-container opacity-20 blur-3xl rounded-full pointer-events-none"></div>
      <div className="fixed bottom-1/4 -left-20 w-80 h-80 bg-tertiary-container opacity-10 blur-3xl rounded-full pointer-events-none"></div>

      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-24 pb-32 max-w-2xl mx-auto w-full relative z-10">
        {/* Header Section (Editorial Clarity) */}
        <div className="w-full mb-12 space-y-4">
          <span className="text-on-surface-variant font-label text-sm uppercase tracking-widest font-medium">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-tertiary tracking-tight leading-tight">
            Gênero Biológico
          </h1>
          <p className="font-body text-lg text-on-surface-variant max-w-md">
            Personalize a ciência por trás do seu plano.
          </p>
        </div>

        {/* Elegance Selector Cards (Selective Option Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Option: Masculino */}
          <button
            onClick={() => handleSelect('masculino')}
            className={`group flex flex-col items-center justify-center p-12 rounded-lg transition-all duration-300 active:scale-95 text-left relative overflow-hidden ${
              genero === 'masculino'
                ? 'bg-tertiary-fixed-dim'
                : 'bg-surface-container-low hover:bg-surface-container-highest'
            }`}
          >
            <div className="mb-6">
              <span
                className="material-symbols-outlined text-6xl text-tertiary transition-transform group-hover:scale-110 duration-500"
                data-icon="male"
              >
                male
              </span>
            </div>
            <span className="font-headline text-xl font-semibold text-tertiary">Masculino</span>
            {/* Selection indicator */}
            <div
              className={`absolute top-6 right-6 transition-opacity duration-300 ${
                genero === 'masculino' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
          </button>

          {/* Option: Feminino */}
          <button
            onClick={() => handleSelect('feminino')}
            className={`group flex flex-col items-center justify-center p-12 rounded-lg transition-all duration-300 active:scale-95 text-left relative overflow-hidden ${
              genero === 'feminino'
                ? 'bg-tertiary-fixed-dim'
                : 'bg-surface-container-low hover:bg-surface-container-highest'
            }`}
          >
            <div className="mb-6">
              <span
                className="material-symbols-outlined text-6xl text-tertiary transition-transform group-hover:scale-110 duration-500"
                data-icon="female"
              >
                female
              </span>
            </div>
            <span className="font-headline text-xl font-semibold text-tertiary">Feminino</span>
            {/* Selection indicator */}
            <div
              className={`absolute top-6 right-6 transition-opacity duration-300 ${
                genero === 'feminino' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
          </button>
        </div>
      </main>

      {/* Footer Action */}
      <div className="fixed bottom-0 left-0 w-full p-8 flex justify-center items-center pointer-events-none">
        <div className="w-full max-w-2xl flex justify-between items-center pointer-events-auto">
          <button
            onClick={onBack}
            className="text-tertiary font-semibold py-4 px-8 rounded-full hover:bg-surface-container-low transition-all duration-300"
          >
            Anterior
          </button>
          <button
            onClick={handleContinue}
            disabled={!genero}
            className="bg-tertiary hover:bg-tertiary-container text-on-tertiary font-headline font-bold py-5 px-14 rounded-lg shadow-lg shadow-tertiary/10 transition-all duration-300 active:scale-95 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-tertiary disabled:active:scale-100"
          >
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

    </StepContainer>
  );
};

export default GeneroStep;
