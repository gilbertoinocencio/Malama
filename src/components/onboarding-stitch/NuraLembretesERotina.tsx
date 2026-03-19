import React, { useState } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraLembretesERotina: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('20:00');
  const [selectedCard, setSelectedCard] = useState<'start' | 'end'>('end');

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-2/3 transition-all duration-1000"></div>
      </div>

      {/* TopAppBar */}
      <header className="bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center justify-between px-8 h-20 w-full no-border tonal-shift bg-stone-100/50 dark:bg-stone-900/50 flat no shadows">
        <button onClick={onBack} className="text-teal-900 dark:text-teal-500 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all duration-300 ease-in-out p-2 rounded-full scale-95 duration-300">
          <span className="material-symbols-outlined">close</span>
        </button>
        <span className="text-2xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend tracking-tight font-medium">NURA</span>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-24 pb-32">
        <div className="w-full max-w-xl space-y-12">
          {/* Contextual Leaf Decoration */}
          <div className="fixed top-1/4 -right-20 opacity-20 pointer-events-none">
            <span
              className="material-symbols-outlined text-[20rem] text-secondary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              eco
            </span>
          </div>

          {/* Header Section */}
          <div className="space-y-4">
            <h2 className="font-headline text-on-surface-variant text-sm font-medium tracking-[0.2em] uppercase">Mantenha o seu Flow</h2>
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight leading-tight">
              Quando quer ser lembrado das suas refeições?
            </h1>
          </div>

          {/* Time Selector Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Start Window Card */}
            <div
              onClick={() => setSelectedCard('start')}
              className="bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest transition-all duration-500 cursor-pointer"
            >
              <p className="font-headline text-primary-container font-semibold mb-6">Início da Janela</p>
              <div className="flex items-end gap-2">
                <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">08</span>
                <span className="font-headline text-4xl text-outline-variant mb-2">:</span>
                <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">30</span>
              </div>
              <div className="mt-8 h-0.5 w-full bg-surface-container-highest group-hover:bg-primary transition-all duration-500"></div>
              <p className="mt-4 text-on-surface-variant text-sm font-light">Primeiro alerta do dia</p>
            </div>

            {/* End Window Card */}
            <div
              onClick={() => setSelectedCard('end')}
              className={`bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest transition-all duration-500 cursor-pointer border-2 ${
                selectedCard === 'end' ? 'border-primary-fixed-dim' : 'border-transparent hover:border-primary-fixed-dim'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="font-headline text-primary-container font-semibold mb-6">Fim da Janela</p>
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">20</span>
                <span className="font-headline text-4xl text-outline-variant mb-2">:</span>
                <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">00</span>
              </div>
              <div className="mt-8 h-0.5 w-full bg-primary transition-all duration-500"></div>
              <p className="mt-4 text-on-surface-variant text-sm font-light">Último alerta do dia</p>
            </div>
          </div>

          {/* Instructional Text */}
          <div className="flex items-start gap-4 p-6 bg-surface-container/50 rounded-xl">
            <span className="material-symbols-outlined text-primary mt-1">info</span>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Sugerimos uma janela de 12 horas para manter o equilíbrio metabólico e a clareza mental durante o dia.
            </p>
          </div>

          {/* Primary Action */}
          <div className="pt-8 flex justify-end">
            <button
              onClick={onNext}
              className="bg-primary text-on-primary font-headline font-semibold text-lg px-12 py-5 rounded-xl flex items-center gap-4 transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10"
            >
              Salvar e Continuar
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>

      {/* Decorative Bottom Elements */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-surface to-transparent pointer-events-none z-0"></div>
    </div>
  );
};

export default NuraLembretesERotina;
