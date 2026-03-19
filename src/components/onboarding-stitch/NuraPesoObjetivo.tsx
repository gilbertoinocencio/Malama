import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraPesoObjetivo: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const weight = data.targetWeight || 70;

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full flex flex-col items-center">
        <section className="mb-10 w-full">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Qual seu peso objetivo?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Defina a meta que faz sentido para o seu corpo e estilo de vida.
          </p>
        </section>

        <div className="flex flex-col items-center space-y-8 w-full">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => updateData({ targetWeight: Math.max(30, weight - 1) })}
              className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-lg text-primary flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-3xl">remove</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-7xl font-extrabold text-primary font-headline tabular-nums">{weight}</span>
              <span className="text-on-surface-variant font-headline text-sm mt-1">kg</span>
            </div>
            <button
              onClick={() => updateData({ targetWeight: Math.min(200, weight + 1) })}
              className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-lg text-primary flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          </div>

          <input
            type="range"
            min={30}
            max={200}
            value={weight}
            onChange={(e) => updateData({ targetWeight: parseInt(e.target.value) })}
            className="w-full max-w-xs h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer range-refine"
          />

          {data.currentWeight && (
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm w-full max-w-sm flex items-center gap-4">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>swap_vert</span>
              <p className="text-on-surface-variant text-sm font-headline">
                Diferença: <strong className="text-primary">{Math.abs(weight - data.currentWeight)} kg</strong>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraPesoObjetivo;
