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
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          <section className="mb-12">
            <h1 className="headline-font text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight mb-4">
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
                  <span className={`headline-font text-xl font-medium ${isSelected ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
                    {diet.label}
                  </span>
                  {isSelected ? (
                    <span className="material-symbols-outlined text-secondary text-3xl" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity" data-icon="circle">circle</span>
                  )}
                </button>
              );
            })}
          </div>
        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <div className="max-w-2xl mx-auto flex justify-end">
               <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all duration-300 transform active:scale-95 shadow-xl shadow-primary/10 min-h-[4rem] min-w-[200px]">
                 Continuar
               </button>
             </div>
          </div>
        </footer>
      </div>
  );
};

export default NuraTipoDeDieta;
