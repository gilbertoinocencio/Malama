import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraJanelaAlimentar: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const startTime = data.eatingWindowStart || '08:00';
  const endTime = data.eatingWindowEnd || '20:00';

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col overflow-x-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-3/4 transition-all duration-700 ease-in-out"></div>
      </div>

      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-200/50 transition-all active:scale-95">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
        <span className="font-lexend text-2xl font-bold tracking-tighter text-teal-900">NURA</span>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center pt-32 px-6 pb-32 max-w-2xl mx-auto w-full relative">
        {/* Contextual Leaf Decoration */}
        <div className="fixed -bottom-20 -left-20 opacity-10 pointer-events-none">
          <span
            className="material-symbols-outlined text-[25rem] text-secondary"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            spa
          </span>
        </div>

        <div className="text-center mb-10 space-y-4 relative z-10">
          <h1 className="font-lexend text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight">Sua Janela de Alimentação</h1>
          <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
            O tempo entre a primeira e a última refeição é crucial para o seu metabolismo.
          </p>
        </div>

        <div className="relative w-80 h-80 flex items-center justify-center my-10 mx-auto">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 200 200">
            {/* Background Circle */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" className="text-surface-container-highest" strokeWidth="8"/>
            {/* Active Arc (12 hours) */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="16" strokeDasharray="502" strokeDashoffset="251" strokeLinecap="round"/>
          </svg>

          <div className="relative z-10 text-center flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-outline mb-1 block">Duração</span>
            <span className="font-headline text-6xl font-extrabold text-primary tracking-tighter">12h</span>
          </div>

          <div className="absolute top-4 right-12 transform translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-surface rounded-full flex flex-col items-center justify-center shadow-xl border border-outline-variant/10 z-10">
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest leading-none mb-1">Início</span>
            <span className="font-headline text-sm font-bold text-primary">{startTime}</span>
          </div>

          <div className="absolute bottom-4 left-12 transform -translate-x-1/2 translate-y-1/2 w-16 h-16 bg-primary text-on-primary rounded-full flex flex-col items-center justify-center shadow-[0_8px_16px_rgba(0,109,84,0.3)] z-10">
            <span className="text-[10px] font-bold text-primary-fixed-dim uppercase tracking-widest leading-none mb-1">Fim</span>
            <span className="font-headline text-sm font-bold">{endTime}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 relative overflow-hidden">
            <span className="material-symbols-outlined text-secondary opacity-20 absolute top-4 right-4 text-6xl pointer-events-none">light_mode</span>
            <h3 className="font-headline text-lg font-bold text-primary mb-1">Primeira Refeição</h3>
            <span className="font-headline text-2xl font-black text-secondary block mb-3">{startTime}</span>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-[80%]">O despertar do seu sistema digestivo.</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 border-l-4 border-primary mt-0 md:mt-8 relative overflow-hidden">
            <span className="material-symbols-outlined text-primary opacity-5 absolute bottom-4 right-4 text-7xl pointer-events-none">dark_mode</span>
            <h3 className="font-headline text-lg font-bold text-primary mb-1">Última Refeição</h3>
            <span className="font-headline text-2xl font-black text-primary block mb-3">{endTime}</span>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-[80%]">Preparação para o ciclo de reparo noturno.</p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface border-t border-outline-variant/10 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button
            onClick={onNext}
            className="w-full h-16 bg-primary text-on-primary rounded-xl font-lexend font-bold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10 group"
          >
            Confirmar Janela
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraJanelaAlimentar;
