import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const ConheceJejumStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const options = [
    { value: true, label: 'Sim', sublabel: 'Já pratiquei ou conheço os fundamentos.' },
    { value: false, label: 'Não', sublabel: 'Gostaria de aprender do zero.' },
  ];

  const value = data.knowsIntermittentFasting;

  return (
    <StepContainer
      currentStep={3}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <section className="w-full text-center mb-16 space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight">
          Já conhece o <span className="text-secondary">Jejum</span> Intermitente?
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl font-light max-w-md mx-auto leading-relaxed">
          Personalizamos sua jornada com base na sua experiência atual com o método.
        </p>
      </section>

      <div className="w-full grid grid-cols-1 gap-6">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.label}
              onClick={() => updateData({ knowsIntermittentFasting: opt.value })}
              className={`group relative w-full p-8 rounded-xl transition-all duration-300 flex items-center justify-between text-left overflow-hidden border-2 ${
                isSelected 
                  ? 'bg-primary-fixed-dim border-secondary/20 shadow-lg shadow-primary/5 ring-2 ring-secondary/10' 
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
              }`}
            >
              <div className="flex flex-col gap-1 z-10">
                <span className={`text-2xl font-semibold font-headline ${isSelected ? 'text-primary' : 'text-primary'}`}>{opt.label}</span>
                <span className="text-on-surface-variant font-light">{opt.sublabel}</span>
              </div>
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected ? 'border-secondary bg-secondary/10' : 'border-outline-variant opacity-40'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-secondary">check</span>}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default ConheceJejumStep;
