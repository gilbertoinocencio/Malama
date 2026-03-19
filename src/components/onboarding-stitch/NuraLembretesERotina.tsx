import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraLembretesERotina: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all active:scale-95">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <span className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</span>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-xl space-y-12">
          <section>
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
              Lembretes & Rotina
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
              Configure seus lembretes para manter a consistência na sua jornada.
            </p>
          </section>

          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>alarm</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold text-primary">Lembrete de Jejum</h3>
                <p className="text-on-surface-variant text-sm">Início e fim da janela alimentar</p>
              </div>
              <span className="material-symbols-outlined text-secondary">check_circle</span>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold text-primary">Hidratação</h3>
                <p className="text-on-surface-variant text-sm">Lembretes a cada 2 horas</p>
              </div>
              <span className="material-symbols-outlined text-secondary">check_circle</span>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-tertiary-fixed/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold text-primary">Hora de Dormir</h3>
                <p className="text-on-surface-variant text-sm">Para otimizar seu ciclo circadiano</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant">radio_button_unchecked</span>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 bg-surface-container/50 rounded-xl">
            <span className="material-symbols-outlined text-primary mt-1">info</span>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Sugerimos uma janela de 12 horas para manter o equilíbrio metabólico e a clareza mental durante o dia.
            </p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-xl mx-auto">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary font-headline font-semibold text-lg rounded-xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10">
            Salvar e Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraLembretesERotina;
