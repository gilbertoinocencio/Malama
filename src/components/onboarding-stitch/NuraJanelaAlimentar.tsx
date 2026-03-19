import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraJanelaAlimentar: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          
{/* Contextual Leaf Decoration */}
<div className="absolute top-1/4 -right-12 w-64 h-64 bg-secondary-container opacity-20 rounded-full blur-3xl -z-10"></div>
<div className="absolute bottom-1/4 -left-12 w-48 h-48 bg-primary-container opacity-10 rounded-full blur-3xl -z-10"></div>
{/* Header Section */}
<div className="text-center mb-12 space-y-4">
<h1 className="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Sua Janela de Alimentação</h1>
<p className="font-body text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
                O tempo entre a primeira e a última refeição é crucial para o seu metabolismo.
            </p>
</div>
{/* Minimalism Clock Visualization */}
<div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-16">
{/* Background Circle */}
<div className="absolute inset-0 rounded-full border-[12px] border-surface-container"></div>
{/* Progress Arc (Emerald) */}
<svg className="absolute inset-0 w-full h-full" viewbox="0 0 100 100">
<circle className="clock-arc" cx="50" cy="50" fill="none" r="45" stroke="#006d36" strokeLinecap="round" strokeWidth="6"></circle>
</svg>
{/* Time Labels and Indicators */}
<div className="relative z-10 text-center">
<div className="flex flex-col items-center">
<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Duração</span>
<span className="font-headline text-5xl font-extrabold text-primary">12h</span>
</div>
</div>
{/* Start/End Nodes */}
{/* 08:00 Position (approx top-right) */}
<div className="absolute top-4 right-12 flex flex-col items-center transform translate-x-1/2 -translate-y-1/2">
<div className="bg-surface-container-lowest editorial-shadow rounded-2xl px-3 py-2 border-2 border-secondary/10">
<span className="block text-[10px] font-bold text-secondary uppercase leading-none mb-1">Início</span>
<span className="font-headline text-lg font-bold text-primary">08:00</span>
</div>
<div className="w-3 h-3 bg-secondary rounded-full mt-2 ring-4 ring-secondary/20"></div>
</div>
{/* 20:00 Position (approx bottom-left) */}
<div className="absolute bottom-12 left-2 flex flex-col items-center transform -translate-x-1/2 translate-y-1/2">
<div className="w-3 h-3 bg-secondary rounded-full mb-2 ring-4 ring-secondary/20"></div>
<div className="bg-surface-container-lowest editorial-shadow rounded-2xl px-3 py-2 border-2 border-secondary/10">
<span className="block text-[10px] font-bold text-secondary uppercase leading-none mb-1">Fim</span>
<span className="font-headline text-lg font-bold text-primary">20:00</span>
</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
  <div className="bg-surface-container-low p-8 rounded-lg flex flex-col justify-between transition-all duration-300 hover:bg-surface-container-highest">
    <span className="material-symbols-outlined text-secondary mb-4" data-icon="restaurant">restaurant</span>
    <div>
      <h3 className="font-headline text-xl font-bold text-primary mb-2">Primeira Refeição</h3>
      <p className="text-on-surface-variant text-sm mb-4">O despertar do seu sistema digestivo.</p>
      <input 
        type="time" 
        value={data.eatingWindowStart || '08:00'}
        onChange={e => updateData({ eatingWindowStart: e.target.value })}
        className="w-full bg-surface text-primary font-headline font-bold text-2xl p-4 rounded-xl border-2 border-surface-dim focus:border-secondary focus:ring-0 transition-colors"
      />
    </div>
  </div>
  <div className="bg-surface-container-low p-8 rounded-lg flex flex-col justify-between transition-all duration-300 hover:bg-surface-container-highest mt-4 md:mt-8">
    <span className="material-symbols-outlined text-secondary mb-4" data-icon="dark_mode">dark_mode</span>
    <div>
      <h3 className="font-headline text-xl font-bold text-primary mb-2">Última Refeição</h3>
      <p className="text-on-surface-variant text-sm mb-4">Preparação para o ciclo de reparo noturno.</p>
      <input 
        type="time" 
        value={data.eatingWindowEnd || '20:00'}
        onChange={e => updateData({ eatingWindowEnd: e.target.value })}
        className="w-full bg-surface text-primary font-headline font-bold text-2xl p-4 rounded-xl border-2 border-surface-dim focus:border-secondary focus:ring-0 transition-colors"
      />
    </div>
  </div>
</div>
{/* Primary Action */}
<div className="w-full flex justify-center pt-8">
<button onClick={onNext} className="bg-primary text-on-primary w-full md:w-auto md:min-w-[280px] h-16 rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-3 transition-all duration-500 hover:scale-105 active:scale-95 shadow-xl shadow-primary/10">
                Confirmar Janela
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>

        </main>
        
        <footer className="fixed bottom-0 left-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraJanelaAlimentar;
