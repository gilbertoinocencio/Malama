import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraLocalDasRefeiEs: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const locations = [
    { value: 'cozinhar_casa', label: 'Em casa', icon: 'home', desc: 'Cozinho a maioria das refeições' },
    { value: 'pedir_entrega', label: 'No trabalho', icon: 'work', desc: 'Como no escritório ou delivery' },
    { value: 'comer_fora', label: 'Restaurantes/Rua', icon: 'restaurant', desc: 'Como fora a maior parte do tempo' },
  ];

  const handleSelect = (value: string) => {
    updateData({ eatingLocation: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <h1 className="font-headline text-2xl font-bold tracking-tighter text-teal-900">NURA</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full flex flex-col justify-center">
        <div className="mb-12 space-y-4">
          <h2 className="font-headline text-4xl md:text-5xl text-primary font-bold leading-tight tracking-tight">
            Onde você costuma comer?
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Para personalizar seu plano alimentar, precisamos entender sua rotina.
          </p>
        </div>

        <div className="space-y-6">
          {locations.map((loc) => {
            const isSelected = data.eatingLocation === loc.value;
            return (
              <button
                key={loc.value}
                onClick={() => handleSelect(loc.value)}
                className={`w-full group transition-all duration-300 ease-in-out p-8 rounded-xl text-left flex items-center gap-8 ${
                  isSelected
                    ? 'bg-primary-fixed-dim ring-2 ring-primary-container/20'
                    : 'bg-surface-container-low hover:bg-surface-container-highest'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${
                  isSelected ? 'bg-surface-container-lowest' : 'bg-surface-container-highest'
                }`}>
                  <span className="material-symbols-outlined text-primary text-3xl">{loc.icon}</span>
                </div>
                <div className="flex-grow">
                  <p className={`font-headline text-xl text-primary ${isSelected ? 'font-semibold' : 'font-medium'}`}>{loc.label}</p>
                  <p className="text-on-surface-variant text-sm mt-1">{loc.desc}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'bg-secondary' : 'border-2 border-outline-variant'
                }`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-surface text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full bg-surface/90 backdrop-blur-md px-6 py-6 z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full bg-primary text-on-primary font-headline text-lg font-semibold h-16 rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2">
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraLocalDasRefeiEs;
