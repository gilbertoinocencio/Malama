import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraConheceJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Contextual Leaf Decoration */}
<div className="fixed top-1/4 -right-12 opacity-20 pointer-events-none transform rotate-12">
<span className="material-symbols-outlined text-[12rem] text-secondary-container" data-icon="eco">eco</span>
</div>
{/* Editorial Content */}
<section className="w-full text-center mb-16 space-y-6">
<h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight">
                Já conhece o <span className="text-secondary">Jejum</span> Intermitente?
            </h1>
<p className="text-on-surface-variant text-lg md:text-xl font-light max-w-md mx-auto leading-relaxed">
                Personalizamos sua jornada com base na sua experiência atual com o método.
            </p>
</section>
{/* Selection Grid */}
<div className="w-full grid grid-cols-1 gap-6">
  <button 
    onClick={() => {
      updateData({ knowsIntermittentFasting: true });
      setTimeout(() => onNext(), 300);
    }}
    className={`group relative w-full p-8 rounded-xl transition-all duration-300 flex items-center justify-between text-left overflow-hidden ${
      data.knowsIntermittentFasting === true 
        ? 'bg-primary-fixed-dim ring-2 ring-secondary/50' 
        : 'bg-surface-container-low hover:bg-surface-container-highest'
    }`}
  >
    <div className="flex flex-col gap-1 z-10">
      <span className="text-2xl font-semibold text-primary font-headline">Sim</span>
      <span className="text-on-surface-variant font-light">Já pratiquei ou conheço os fundamentos.</span>
    </div>
    {data.knowsIntermittentFasting === true ? (
      <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-secondary">
        <span className="material-symbols-outlined text-white" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
      </div>
    ) : (
      <div className="w-12 h-12 rounded-full border-2 border-outline-variant flex items-center justify-center transition-all">
        <span className="material-symbols-outlined text-transparent" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
      </div>
    )}
  </button>

  <button 
    onClick={() => {
      updateData({ knowsIntermittentFasting: false });
      setTimeout(() => onNext(), 300);
    }}
    className={`group relative w-full p-8 rounded-xl transition-all duration-300 flex items-center justify-between text-left overflow-hidden ${
      data.knowsIntermittentFasting === false 
        ? 'bg-primary-fixed-dim ring-2 ring-secondary/50' 
        : 'bg-surface-container-low hover:bg-surface-container-highest'
    }`}
  >
    <div className="flex flex-col gap-1 z-10">
      <span className="text-2xl font-semibold text-primary font-headline">Não</span>
      <span className="text-on-surface-variant font-light">Gostaria de aprender do zero.</span>
    </div>
    {data.knowsIntermittentFasting === false ? (
      <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-secondary">
        <span className="material-symbols-outlined text-white" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
      </div>
    ) : (
      <div className="w-12 h-12 rounded-full border-2 border-outline-variant flex items-center justify-center transition-all">
        <span className="material-symbols-outlined text-transparent" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
      </div>
    )}
  </button>
</div>
{/* Task-Focused Action */}
<div className="mt-16 w-full flex justify-end">
<button className="flex items-center gap-4 bg-primary text-on-primary px-10 py-5 rounded-xl font-medium text-lg hover:shadow-lg transition-all duration-300 active:scale-95 group">
                Continuar
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraConheceJejum;
