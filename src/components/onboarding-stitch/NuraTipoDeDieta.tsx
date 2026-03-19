import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraTipoDeDieta: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const dietTypes = [
    { value: 'equilibrada', label: 'Equilibrada' },
    { value: 'vegetariana', label: 'Vegetariana' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'paleo', label: 'Paleo' },
    { value: 'cetogenica', label: 'Cetogénica' },
    { value: 'rica_proteina', label: 'Rica em proteína' },
    { value: 'baixa_carboidratos', label: 'Baixa em carbo' }
  ];

  const handleSelect = (value: string) => {
    updateData({ dietType: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body overflow-x-hidden relative">
      <nav className="fixed top-0 left-0 w-full h-1 z-[60] flex">
        <div className="h-full bg-secondary w-3/4"></div>
        <div className="h-full bg-surface-container-high flex-1"></div>
      </nav>

      <header className="fixed top-0 w-full z-50 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all duration-300 ease-in-out rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-32 pb-40 px-6 max-w-2xl mx-auto w-full z-10">
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
                className={`w-full flex items-center justify-between p-8 rounded-lg text-left transition-all duration-300 ease-in-out group ${
                  isSelected
                    ? 'bg-primary-fixed-dim shadow-sm'
                    : 'bg-surface-container-low hover:bg-surface-container-highest'
                }`}
              >
                <span className={`font-headline text-xl font-medium ${isSelected ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
                  {diet.label}
                </span>
                {isSelected ? (
                  <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity">circle</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-24 -right-12 w-64 h-64 bg-secondary-container opacity-20 blur-3xl rounded-full z-0 pointer-events-none"></div>

      <footer className="fixed bottom-0 left-0 w-full p-8 bg-surface/80 backdrop-blur-md z-40">
        <div className="max-w-2xl mx-auto flex justify-end">
          <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all duration-300 transform active:scale-95 shadow-xl shadow-primary/10 min-h-[4rem] min-w-[200px]">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraTipoDeDieta;
