import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraConheceJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const handleSelect = (knows: boolean) => {
    updateData({ knowsIntermittentFasting: knows });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface min-h-screen font-body">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-1/3 transition-all duration-700 ease-in-out"></div>
      </div>

      {/* Top Navigation Shell */}
      <header className="fixed top-0 w-full z-50 bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="flex items-center gap-2">
          <span
            onClick={onBack}
            className="material-symbols-outlined text-teal-900 dark:text-teal-500 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 p-2 rounded-full transition-all cursor-pointer"
          >
            close
          </span>
        </div>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-6 pt-32 pb-40">
        {/* Contextual Leaf Decoration */}
        <div className="fixed top-1/4 -right-12 opacity-20 pointer-events-none transform rotate-12">
          <span
            className="material-symbols-outlined text-[12rem] text-secondary-container"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            eco
          </span>
        </div>

        {/* Editorial Content */}
        <section className="w-full text-center mb-16 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight">
            Já conhece o <span className="text-secondary">Jejum</span> Intermitente?
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl font-light max-w-md mx-auto leading-relaxed">
            Personalizamos sua jornada com base na sua experiência atual com o método.
          </p>
        </section>

        {/* Selection Grid */}
        <div className="w-full grid grid-cols-1 gap-6">
          {/* Option: Sim */}
          <button
            onClick={() => handleSelect(true)}
            className="group relative w-full p-8 rounded-xl bg-surface-container-low transition-all duration-300 hover:bg-surface-container-highest flex items-center justify-between text-left overflow-hidden"
          >
            <div className="flex flex-col gap-1 z-10">
              <span className="text-2xl font-semibold text-primary font-headline">Sim</span>
              <span className="text-on-surface-variant font-light">Já pratiquei ou conheço os fundamentos.</span>
            </div>
            <div
              className={`w-12 h-12 rounded-full border-2 ${
                data.knowsIntermittentFasting === true
                  ? 'border-secondary bg-secondary/10'
                  : 'border-outline-variant'
              } flex items-center justify-center transition-all`}
            >
              <span
                className={`material-symbols-outlined ${
                  data.knowsIntermittentFasting === true ? 'text-secondary' : 'text-transparent'
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            {/* Subtle Gradient Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>

          {/* Option: Não */}
          <button
            onClick={() => handleSelect(false)}
            className="group relative w-full p-8 rounded-xl bg-surface-container-low transition-all duration-300 hover:bg-surface-container-highest flex items-center justify-between text-left overflow-hidden"
          >
            <div className="flex flex-col gap-1 z-10">
              <span className="text-2xl font-semibold text-primary font-headline">Não</span>
              <span className="text-on-surface-variant font-light">Gostaria de aprender do zero.</span>
            </div>
            <div
              className={`w-12 h-12 rounded-full border-2 ${
                data.knowsIntermittentFasting === false
                  ? 'border-secondary bg-secondary/10'
                  : 'border-outline-variant'
              } flex items-center justify-center transition-all`}
            >
              <span
                className={`material-symbols-outlined ${
                  data.knowsIntermittentFasting === false ? 'text-secondary' : 'text-transparent'
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {/* Task-Focused Action */}
        <div className="mt-16 w-full flex justify-end">
          <button
            onClick={onNext}
            className="flex items-center gap-4 bg-primary text-on-primary px-10 py-5 rounded-xl font-medium text-lg hover:shadow-lg transition-all duration-300 active:scale-95 group"
          >
            Continuar
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>
      </main>

      {/* Bottom Shell */}
      <div className="fixed bottom-12 left-0 w-full flex justify-center pointer-events-none">
        <div className="bg-surface-container-lowest/80 backdrop-blur-md px-6 py-3 rounded-full shadow-sm border border-outline-variant/10 text-on-surface-variant text-sm font-medium">
          Passo 2 de 8
        </div>
      </div>
    </div>
  );
};

export default NuraConheceJejum;
