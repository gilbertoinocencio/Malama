import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraTipoDeDieta: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const dietTypes = [
    { value: 'equilibrada', label: 'Equilibrada', icon: 'balance' },
    { value: 'vegetariana', label: 'Vegetariana', icon: 'eco' },
    { value: 'vegan', label: 'Vegan', icon: 'spa' },
    { value: 'paleo', label: 'Paleo', icon: 'pets' },
    { value: 'cetogenica', label: 'Cetogénica', icon: 'whatshot' },
    { value: 'rica_proteina', label: 'Rica em proteína', icon: 'fitness_center' },
    { value: 'baixa_carboidratos', label: 'Baixa em carbo', icon: 'remove_circle_outline' }
  ];

  const handleSelect = (value: string) => {
    updateData({ dietType: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Que tipo de dieta prefere?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Personalize a sua experiência nutritiva selecionando o estilo que melhor se adapta ao seu estilo de vida.
          </p>
        </section>

        <div className="space-y-4">
          {dietTypes.map((diet) => {
            const isSelected = data.dietType === diet.value;
            return (
              <button
                key={diet.value}
                onClick={() => handleSelect(diet.value)}
                className={`w-full flex items-center justify-between p-6 rounded-xl text-left transition-all duration-300 group ${
                  isSelected
                    ? 'bg-primary-fixed-dim shadow-md border-2 border-primary/20'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:bg-surface-container-low border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-primary/10' : 'bg-surface-container-high/50'}`}>
                    <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{diet.icon}</span>
                  </div>
                  <span className={`font-headline text-lg font-semibold ${isSelected ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>
                    {diet.label}
                  </span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraTipoDeDieta;
