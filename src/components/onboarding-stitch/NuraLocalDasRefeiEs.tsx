import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraLocalDasRefeiEs: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
<div className="mb-12 space-y-4">
<h2 className="font-headline text-4xl md:text-5xl text-primary font-bold leading-tight tracking-tight">Onde você costuma comer?</h2>
<p className="text-on-surface-variant text-lg leading-relaxed max-w-md">Para personalizar seu plano alimentar, precisamos entender sua rotina.</p>
</div>
<div className="space-y-6">
  {[
    { id: 'casa', label: 'Em casa', icon: 'home' },
    { id: 'trabalho', label: 'No trabalho', icon: 'work' },
    { id: 'restaurante', label: 'Restaurantes/Rua', icon: 'restaurant' }
  ].map((location) => {
    const isSelected = data.eatingLocation === location.id;
    return (
      <button 
        key={location.id}
        onClick={() => {
          updateData({ eatingLocation: location.id });
          setTimeout(() => onNext(), 300);
        }}
        className={`w-full group transition-all duration-300 ease-in-out p-8 rounded-lg text-left flex items-center gap-8 ${
          isSelected 
            ? 'bg-primary-fixed-dim ring-2 ring-primary-container/20' 
            : 'bg-surface-container-low hover:bg-surface-container-highest'
        }`}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${isSelected ? 'bg-surface-container-lowest' : 'bg-surface-container-highest'}`}>
          <span className="material-symbols-outlined text-primary text-3xl" data-icon={location.icon}>{location.icon}</span>
        </div>
        <div className="flex-grow">
          <p className={`font-headline text-xl text-primary ${isSelected ? 'font-semibold' : 'font-medium'}`}>{location.label}</p>
        </div>
        {isSelected ? (
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-surface text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          </div>
        ) : (
          <div className="w-6 h-6 border-2 border-outline-variant rounded-full group-focus:border-secondary flex items-center justify-center">
            <div className="w-3 h-3 bg-secondary rounded-full opacity-0 group-active:opacity-100 transition-opacity"></div>
          </div>
        )}
      </button>
    );
  })}
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             
<div className="max-w-2xl mx-auto">
<button onClick={onNext} className="w-full bg-primary text-on-primary font-headline text-lg font-semibold h-16 rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2">
                Continuar
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>

          </div>
        </footer>
      </div>
  
  );
};

export default NuraLocalDasRefeiEs;
