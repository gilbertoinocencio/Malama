import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraLembretesERotina: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
<div className="w-full max-w-xl space-y-12">
{/* Contextual Leaf Decoration */}
<div className="fixed top-1/4 -right-20 opacity-20 pointer-events-none">
<span className="material-symbols-outlined text-[20rem] text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
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
<div className="bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest transition-all duration-500 cursor-pointer">
<p className="font-headline text-primary-container font-semibold mb-6">Início da Janela</p>
<div className="flex items-end gap-2">
<span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{data.eatingWindowStart?.split(':')[0] || '08'}</span>
<span className="font-headline text-4xl text-outline-variant mb-2">:</span>
<span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{data.eatingWindowStart?.split(':')[1] || '00'}</span>
</div>
<div className="mt-8 h-0.5 w-full bg-surface-container-highest group-hover:bg-primary transition-all duration-500"></div>
<p className="mt-4 text-on-surface-variant text-sm font-light">Primeiro alerta do dia</p>
</div>
{/* End Window Card */}
<div className="bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest transition-all duration-500 cursor-pointer border-2 border-transparent hover:border-primary-fixed-dim">
<div className="flex justify-between items-start">
<p className="font-headline text-primary-container font-semibold mb-6">Fim da Janela</p>
<span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
</div>
<div className="flex items-end gap-2">
<span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{data.eatingWindowEnd?.split(':')[0] || '20'}</span>
<span className="font-headline text-4xl text-outline-variant mb-2">:</span>
<span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{data.eatingWindowEnd?.split(':')[1] || '00'}</span>
</div>
<div className="mt-8 h-0.5 w-full bg-primary transition-all duration-500"></div>
<p className="mt-4 text-on-surface-variant text-sm font-light">Último alerta do dia</p>
</div>
</div>
{/* Instructional Text */}
<div className="flex items-start gap-4 p-6 bg-surface-container/50 rounded-xl">
<span className="material-symbols-outlined text-primary mt-1" data-icon="info">info</span>
<p className="text-on-surface-variant text-sm leading-relaxed">
                    Sugerimos uma janela de 12 horas para manter o equilíbrio metabólico e a clareza mental durante o dia.
                </p>
</div>
{/* Primary Action */}
<div className="pt-8 flex justify-end">
<button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold text-lg px-12 py-5 rounded-xl flex items-center gap-4 transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10">
                    Salvar e Continuar
                    <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 block md:hidden p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="w-full bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraLembretesERotina;
