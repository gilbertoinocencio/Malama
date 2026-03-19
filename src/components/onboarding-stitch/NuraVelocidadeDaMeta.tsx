import React, { useMemo } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraVelocidadeDaMeta: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const speed = data.goalSpeedKgPerWeek || 0.5;

  const weeksNeeded = useMemo(() => {
    if (!data.currentWeight || !data.targetWeight || !speed) return null;
    const diff = Math.abs(data.currentWeight - data.targetWeight);
    return Math.ceil(diff / speed);
  }, [data.currentWeight, data.targetWeight, speed]);

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Velocidade da sua meta
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Escolha o ritmo. Sustentabilidade é a chave para resultados duradouros.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center space-y-4 shadow-[0_16px_32px_rgba(0,0,0,0.04)]">
            <span className="material-symbols-outlined text-5xl text-secondary/40" style={{ fontVariationSettings: "'FILL' 0" }}>egg</span>
            <span className="font-headline text-sm font-medium text-on-surface-variant">Lento e sustentável</span>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center space-y-4 shadow-[0_16px_32px_rgba(0,0,0,0.04)] border-2 border-secondary/20 scale-105">
            <span className="material-symbols-outlined text-5xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="font-headline text-sm font-medium text-primary">Rápido e intenso</span>
          </div>
        </div>

        <div className="w-full px-4 mb-12">
          <input
            type="range"
            min={25}
            max={75}
            step={5}
            value={Math.round(speed * 100)}
            onChange={(e) => updateData({ goalSpeedKgPerWeek: parseInt(e.target.value) / 100 })}
            className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer range-refine"
          />
          <div className="flex justify-between mt-4 text-xs text-on-surface-variant font-headline">
            <span>0.25 kg/sem</span>
            <span className="font-bold text-primary text-base">{speed.toFixed(2)} kg/sem</span>
            <span>0.75 kg/sem</span>
          </div>
        </div>

        {weeksNeeded && (
          <div className="bg-secondary-container/20 p-6 rounded-xl border border-secondary/10 flex items-center gap-4">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <p className="text-on-surface-variant text-sm font-headline">
              Previsão: <strong className="text-primary">{weeksNeeded} semanas</strong> para atingir sua meta
            </p>
          </div>
        )}
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

export default NuraVelocidadeDaMeta;
