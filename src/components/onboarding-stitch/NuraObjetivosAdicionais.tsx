import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraObjetivosAdicionais: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const goals = [
    { id: 'relacao_comida', label: 'Relação saudável com comida', icon: 'restaurant' },
    { id: 'bem_estar', label: 'Bem-estar geral', icon: 'spa' },
    { id: 'gerir_stress', label: 'Gerir stress', icon: 'psychology' },
    { id: 'melhorar_sono', label: 'Melhorar sono', icon: 'bedtime' },
    { id: 'aumentar_energia', label: 'Aumentar energia', icon: 'bolt' }
  ];

  const toggleGoal = (id: string) => {
    const current = data.additionalGoals || [];
    const updated = current.includes(id) ? current.filter(g => g !== id) : [...current, id];
    updateData({ additionalGoals: updated });
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
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight leading-tight mb-4">
              Algum objetivo adicional?
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md">
              Personalizamos a sua jornada para focar no que realmente importa hoje.
            </p>
          </section>

          <div className="space-y-4">
            {goals.map(goal => {
              const isSelected = (data.additionalGoals || []).includes(goal.id);
              return (
                <div 
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`group relative flex items-center justify-between p-8 rounded-[1.5rem] cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'bg-primary-fixed-dim ring-2 ring-secondary/20 shadow-lg shadow-primary/5' 
                      : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${isSelected ? 'bg-secondary-container/30' : 'bg-white/60'}`}>
                      <span className="material-symbols-outlined text-secondary" data-icon={goal.icon}>{goal.icon}</span>
                    </div>
                    <div>
                      <span className="text-xl font-medium text-primary block">{goal.label}</span>
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-on-secondary">
                      <span className="material-symbols-outlined text-sm" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-outline-variant opacity-40"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-16 pb-8 flex flex-col gap-4">
            <button onClick={onNext} className="w-full bg-primary text-on-primary h-16 rounded-xl text-lg font-semibold tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-xl shadow-primary/10">
              Continuar
              <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
            </button>
            <button onClick={onNext} className="w-full h-12 text-on-surface-variant font-medium hover:text-primary transition-colors duration-300">
              Talvez mais tarde
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

export default NuraObjetivosAdicionais;
