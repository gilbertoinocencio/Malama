import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraPesoObjetivo: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const weight = data.targetWeight || 70;

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-4/5 transition-all duration-700"></div>
      </div>

      <header className="fixed top-0 w-full z-50 bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-lexend">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow pt-32 pb-40 px-6 max-w-2xl mx-auto w-full flex flex-col items-center justify-center">
        <section className="mb-16 w-full text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-lexend tracking-tight leading-tight mb-4">
            Qual seu peso objetivo?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md mx-auto">
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
              <span className="text-8xl md:text-9xl font-extrabold text-primary font-lexend tabular-nums tracking-tighter">{weight}</span>
              <span className="text-on-surface-variant font-lexend text-lg mt-2 font-medium">kg</span>
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
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm w-full max-w-sm flex items-center gap-4 border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>swap_vert</span>
              <p className="text-on-surface-variant text-sm font-lexend">
                Diferença: <strong className="text-primary font-semibold">{Math.abs(weight - data.currentWeight)} kg</strong>
              </p>
            </div>
          )}

          <div className="bg-primary-fixed-dim/20 p-6 rounded-xl w-full max-w-sm mt-8">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">info</span>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Metas realistas têm 3x mais chance de sucesso. Recomendamos 0,5-1kg por semana.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-8 bg-gradient-to-t from-surface via-surface to-transparent">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-lexend font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10 flex items-center justify-center gap-3 group">
            Continuar
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraPesoObjetivo;
