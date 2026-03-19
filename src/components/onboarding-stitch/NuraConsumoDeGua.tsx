import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraConsumoDeGua: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          
{/* Contextual Leaf Decoration */}
<div className="fixed -top-20 -right-20 opacity-20 pointer-events-none">
<span className="material-symbols-outlined text-[20rem] text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
</div>
<div className="w-full max-w-xl flex flex-col items-center">
{/* Subtle Water Drop Icon */}
<div className="mb-12 flex items-center justify-center w-24 h-24 rounded-full bg-surface-container-lowest shadow-[0_16px_32px_rgba(0,0,0,0.02)] border border-outline-variant/10">
<span className="material-symbols-outlined text-5xl text-primary" data-icon="water_drop" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
</div>
{/* Header Section */}
<div className="text-center mb-16 px-4">
<h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary leading-tight">
                    Bebe água suficiente?
                </h1>
<p className="mt-6 text-on-surface-variant text-lg max-w-sm mx-auto leading-relaxed">
                    A hidratação é o pilar invisível da sua performance cognitiva e física.
                </p>
</div>
{/* Elegance Selector Cards */}
<div className="w-full space-y-4">
  {[
    { id: 'sim', label: 'Sim', icon: 'check_circle' },
    { id: 'nao', label: 'Não', icon: 'close' },
    { id: 'nao_certeza', label: 'Não tenho a certeza', icon: 'question_mark' }
  ].map((option) => {
    const isSelected = data.waterIntake === option.id;
    return (
      <button 
        key={option.id}
        onClick={() => {
          updateData({ waterIntake: option.id });
          setTimeout(() => onNext(), 300);
        }}
        className={`group w-full flex items-center justify-between p-8 rounded-xl transition-all duration-300 ease-in-out text-left focus:outline-none ${
          isSelected 
            ? 'bg-primary-fixed-dim/10 border border-primary-fixed-dim ring-2 ring-primary/20' 
            : 'bg-surface-container-low hover:bg-surface-container-high border border-transparent focus:ring-2 focus:ring-primary/20'
        }`}
      >
        <div className="flex items-center gap-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-fixed-dim' : 'bg-surface-container-lowest group-hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined text-primary" data-icon={option.icon} style={isSelected && option.icon === 'close' ? { fontVariationSettings: "'FILL' 0" } : {}}>{option.icon}</span>
          </div>
          <span className={`text-xl font-headline ${isSelected ? 'font-semibold text-primary' : 'font-medium text-on-surface'}`}>{option.label}</span>
        </div>
        {isSelected && (
           <span className="material-symbols-outlined text-secondary" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        )}
      </button>
    );
  })}
</div>
{/* Footer Action Section */}
<div className="mt-20 w-full">
<button onClick={onNext} className="w-full h-16 bg-primary text-on-primary rounded-xl font-headline font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all duration-300 group">
                    Continuar
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
</button>
<p className="mt-6 text-center text-on-surface-variant/60 text-sm font-medium">
                    Fase 4 de 6 • Hidratação &amp; Fluxo
                </p>
</div>
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

export default NuraConsumoDeGua;
