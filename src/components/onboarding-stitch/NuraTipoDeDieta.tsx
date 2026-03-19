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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-3/4 transition-all duration-700"></div>
      </div>

      {/* Top Navigation Shell */}
      <header className="bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl fixed top-0 w-full z-50 no-border tonal-shift bg-stone-100/50 dark:bg-stone-900/50">
        <div className="flex items-center justify-between px-8 h-20 w-full">
          <div className="text-2xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
          <button onClick={onBack} className="p-2 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all duration-300 ease-in-out rounded-full">
            <span className="material-symbols-outlined text-teal-900 dark:text-teal-500">close</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow pt-32 pb-40 px-6 max-w-2xl mx-auto w-full">
        {/* Editorial Headline */}
        <section className="mb-12">
          <h1 className="font-lexend text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight mb-4">
            Que tipo de dieta prefere?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Personalize a sua experiência nutritiva selecionando o estilo que melhor se adapta ao seu estilo de vida.
          </p>
        </section>

        {/* Selection List (Elegance Selector) */}

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
                <span className={`font-lexend text-xl font-medium ${isSelected ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
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

      {/* Contextual Leaf (Decorative Element) */}
      <div className="fixed bottom-24 -right-12 w-64 h-64 bg-secondary-container opacity-20 blur-3xl rounded-full -z-10 pointer-events-none"></div>

      {/* Action Footer */}
      <footer className="fixed bottom-0 left-0 w-full p-8 bg-surface/80 backdrop-blur-md z-40">
        <div className="max-w-2xl mx-auto flex justify-end">
          <button
            onClick={onNext}
            className="bg-primary text-on-primary font-lexend font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all duration-300 transform active:scale-95 shadow-xl shadow-primary/10 min-h-[4rem] min-w-[200px]"
          >
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraTipoDeDieta;
