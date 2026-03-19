import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraConheceJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const handleSelect = (knows: boolean) => {
    updateData({ knowsIntermittentFasting: knows });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
            <span className="material-symbols-outlined text-teal-900">arrow_back</span>
          </button>
        </div>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-6 py-8">
        <section className="w-full text-center mb-16 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline tracking-tight leading-tight">
            Já conhece o <span className="text-secondary">Jejum</span> Intermitente?
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl font-light max-w-md mx-auto leading-relaxed">
            Personalizamos sua jornada com base na sua experiência atual com o método.
          </p>
        </section>

        <div className="w-full grid grid-cols-1 gap-6">
          <button
            onClick={() => handleSelect(true)}
            className={`group relative w-full p-8 rounded-xl transition-all duration-300 flex items-center justify-between text-left overflow-hidden ${
              data.knowsIntermittentFasting === true
                ? 'bg-primary-fixed-dim ring-2 ring-primary/20'
                : 'bg-surface-container-low hover:bg-surface-container-highest'
            }`}
          >
            <div className="flex flex-col gap-1 z-10">
              <span className="text-2xl font-semibold text-primary font-headline">Sim</span>
              <span className="text-on-surface-variant font-light">Já pratiquei ou conheço os fundamentos.</span>
            </div>
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
              data.knowsIntermittentFasting === true ? 'border-secondary bg-secondary/10' : 'border-outline-variant'
            }`}>
              {data.knowsIntermittentFasting === true && (
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>

          <button
            onClick={() => handleSelect(false)}
            className={`group relative w-full p-8 rounded-xl transition-all duration-300 flex items-center justify-between text-left overflow-hidden ${
              data.knowsIntermittentFasting === false
                ? 'bg-primary-fixed-dim ring-2 ring-primary/20'
                : 'bg-surface-container-low hover:bg-surface-container-highest'
            }`}
          >
            <div className="flex flex-col gap-1 z-10">
              <span className="text-2xl font-semibold text-primary font-headline">Não</span>
              <span className="text-on-surface-variant font-light">Gostaria de aprender do zero.</span>
            </div>
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
              data.knowsIntermittentFasting === false ? 'border-secondary bg-secondary/10' : 'border-outline-variant'
            }`}>
              {data.knowsIntermittentFasting === false && (
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default NuraConheceJejum;
