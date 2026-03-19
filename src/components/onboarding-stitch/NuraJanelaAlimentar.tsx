import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraJanelaAlimentar: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const startTime = data.eatingWindowStart || '08:00';
  const endTime = data.eatingWindowEnd || '20:00';

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-200/50 transition-all active:scale-95">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <span className="font-headline text-2xl font-bold tracking-tighter text-teal-900">NURA</span>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 pb-8 max-w-2xl mx-auto w-full">
        <div className="text-center mb-12 space-y-4">
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Sua Janela de Alimentação</h1>
          <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
            O tempo entre a primeira e a última refeição é crucial para o seu metabolismo.
          </p>
        </div>

        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-16">
          <div className="absolute inset-0 rounded-full border-[12px] border-surface-container"></div>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="45" stroke="#006d36" strokeLinecap="round" strokeWidth="6" strokeDasharray="188 94" strokeDashoffset="-47"></circle>
          </svg>
          <div className="relative z-10 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Duração</span>
            <span className="font-headline text-5xl font-extrabold text-primary">12h</span>
          </div>

          <div className="absolute top-4 right-8 flex flex-col items-center">
            <div className="bg-surface-container-lowest shadow-lg rounded-2xl px-3 py-2 border-2 border-secondary/10">
              <span className="block text-[10px] font-bold text-secondary uppercase leading-none mb-1">Início</span>
              <span className="font-headline text-lg font-bold text-primary">{startTime}</span>
            </div>
            <div className="w-3 h-3 bg-secondary rounded-full mt-2 ring-4 ring-secondary/20"></div>
          </div>

          <div className="absolute bottom-8 left-4 flex flex-col items-center">
            <div className="w-3 h-3 bg-secondary rounded-full mb-2 ring-4 ring-secondary/20"></div>
            <div className="bg-surface-container-lowest shadow-lg rounded-2xl px-3 py-2 border-2 border-secondary/10">
              <span className="block text-[10px] font-bold text-secondary uppercase leading-none mb-1">Fim</span>
              <span className="font-headline text-lg font-bold text-primary">{endTime}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
          <div className="bg-surface-container-low p-8 rounded-xl transition-all hover:bg-surface-container-highest">
            <span className="material-symbols-outlined text-secondary mb-4 block">restaurant</span>
            <h3 className="font-headline text-xl font-bold text-primary mb-2">Primeira Refeição</h3>
            <p className="text-on-surface-variant text-sm">O despertar do seu sistema digestivo.</p>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl transition-all hover:bg-surface-container-highest md:mt-8">
            <span className="material-symbols-outlined text-secondary mb-4 block">dark_mode</span>
            <h3 className="font-headline text-xl font-bold text-primary mb-2">Última Refeição</h3>
            <p className="text-on-surface-variant text-sm">Preparação para o ciclo de reparo noturno.</p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10">
            Confirmar Janela
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraJanelaAlimentar;
