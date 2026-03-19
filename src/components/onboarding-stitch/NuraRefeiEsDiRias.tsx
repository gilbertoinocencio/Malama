import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraRefeiEsDiRias: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const meals = data.mealsPerDay || 3;

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <nav className="shrink-0 w-full z-10">
        <div className="h-1 w-full bg-surface-container-high">
          <div className="h-full bg-secondary w-3/4 transition-all duration-700"></div>
        </div>
        <div className="bg-stone-100/50 backdrop-blur-xl flex items-center justify-between px-8 h-20 w-full">
          <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-stone-200/50 transition-all duration-300">
            <span className="material-symbols-outlined text-teal-900">arrow_back</span>
          </button>
          <span className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</span>
          <div className="w-12"></div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full flex flex-col items-center">
        <header className="text-center mb-16 space-y-4 w-full">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight">
            Quantas refeições faz por dia?
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">
            Ajustamos a densidade calórica de cada prato para o seu ritmo.
          </p>
        </header>

        <div className="w-full flex flex-col items-center space-y-12">
          <div className="relative flex items-center justify-center space-x-12">
            <div className="hidden sm:block opacity-20 transform -scale-x-100">
              <span className="material-symbols-outlined text-tertiary text-6xl">restaurant</span>
            </div>
            <div className="flex items-center space-x-8">
              <button
                onClick={() => updateData({ mealsPerDay: Math.max(1, meals - 1) })}
                className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-[0_16px_32px_rgba(0,0,0,0.04)] text-primary flex items-center justify-center hover:bg-surface-container-high transition-all duration-300 active:scale-90 border border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-3xl font-bold">remove</span>
              </button>
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-8xl md:text-9xl font-extrabold text-primary font-headline tabular-nums tracking-tighter">
                  {meals}
                </span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, meals * 20)}%` }}></div>
                </div>
              </div>
              <button
                onClick={() => updateData({ mealsPerDay: Math.min(6, meals + 1) })}
                className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-[0_16px_32px_rgba(0,0,0,0.04)] text-primary flex items-center justify-center hover:bg-surface-container-high transition-all duration-300 active:scale-90 border border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-3xl font-bold">add</span>
              </button>
            </div>
            <div className="hidden sm:block opacity-20">
              <span className="material-symbols-outlined text-tertiary text-6xl">restaurant</span>
            </div>
          </div>

          <div className="w-full bg-surface-container-low rounded-xl p-8 flex items-center gap-6 border border-white/40 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-full bg-tertiary-fixed-dim/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>set_meal</span>
            </div>
            <div>
              <h3 className="text-tertiary font-bold font-headline text-lg">Padrão Nutritivo</h3>
              <p className="text-on-surface-variant text-sm font-medium">Café da manhã, almoço e jantar equilibrados.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-8 flex justify-center bg-surface/90 backdrop-blur-md">
        <div className="max-w-md w-full">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-primary-container hover:scale-[1.02] transition-all duration-500 active:scale-95 group">
            Continuar
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraRefeiEsDiRias;
