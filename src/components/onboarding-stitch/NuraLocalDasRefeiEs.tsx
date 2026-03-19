import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraLocalDasRefeiEs: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const locations = [
    { value: 'casa', label: 'Em casa', icon: 'home' },
    { value: 'trabalho', label: 'No trabalho', icon: 'work' },
    { value: 'restaurante', label: 'Em restaurantes', icon: 'restaurant' },
    { value: 'transito', label: 'Em trânsito', icon: 'directions_car' },
  ];

  const handleSelect = (value: string) => {
    updateData({ mealLocation: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-surface font-body overflow-x-hidden">
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: 'radial-gradient(at 0% 0%, rgba(0, 109, 54, 0.05) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 70, 79, 0.05) 0px, transparent 50%)'
        }}
      ></div>

      <nav className="fixed top-0 left-0 w-full h-1 z-[60] flex">
        <div className="h-full bg-secondary w-1/2 transition-all duration-700"></div>
        <div className="h-full bg-surface-container-high flex-1"></div>
      </nav>

      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md flex items-center justify-between px-8 h-20 border-b border-outline-variant/20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-surface-container-highest transition-all duration-300 ease-in-out rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface">close</span>
        </button>
      </header>

      <main className="flex-1 pt-32 pb-40 px-6 max-w-2xl mx-auto w-full z-10 flex flex-col justify-center min-h-screen">
        <div className="w-full">
          <section className="mb-12 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
              Onde costuma comer?
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed max-w-md mx-auto md:mx-0">
              Adapte o seu plano aos locais onde normalmente faz as suas refeições para maior comodidade.
            </p>
          </section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {locations.map((loc) => {
              const isSelected = data.mealLocation === loc.value;
              return (
                <button
                  key={loc.value}
                  onClick={() => handleSelect(loc.value)}
                  className={`h-full flex flex-col items-center justify-center p-8 rounded-2xl text-center transition-all duration-300 group relative border-2 ${
                    isSelected
                      ? 'bg-primary-fixed-dim border-primary-fixed-dim shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container-highest border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl mb-4 text-primary" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>
                    {loc.icon}
                  </span>
                  <span className={`font-headline font-semibold text-lg ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                    {loc.label}
                  </span>

                  {isSelected ? (
                    <span className="material-symbols-outlined absolute top-4 right-4 text-secondary opacity-100 transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined absolute top-4 right-4 text-outline-variant opacity-0 transition-opacity group-hover:opacity-100">
                      circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-6 md:p-8 bg-surface/90 backdrop-blur-md z-40 border-t border-outline-variant/10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button onClick={onBack} className="text-on-surface-variant font-medium hover:text-primary transition-colors flex items-center gap-2 px-4 py-2 rounded-full hover:bg-surface-container-high">
            Voltar
          </button>
          <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all duration-300 transform active:scale-95 shadow-xl shadow-primary/10 min-w-[160px]">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraLocalDasRefeiEs;
