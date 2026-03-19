import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraMudanADeHBitos: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const habits = [
    { id: 'comer_noite', label: 'Comer à noite', icon: 'dark_mode' },
    { id: 'beliscar', label: 'Beliscar o dia todo', icon: 'restaurant' },
    { id: 'doces', label: 'Doces em excesso', icon: 'icecream' },
    { id: 'sedentarismo', label: 'Sedentarismo', icon: 'directions_walk' }
  ];

  const toggleHabit = (id: string) => {
    const current = data.habitChanges || [];
    const updated = current.includes(id) ? current.filter(h => h !== id) : [...current, id];
    updateData({ habitChanges: updated });
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
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-primary leading-tight mb-4">
              Quais hábitos quer mudar?
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed font-light">
              Selecione todos os comportamentos que você deseja transformar nesta jornada.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6">
            {habits.map(habit => {
              const isSelected = (data.habitChanges || []).includes(habit.id);
              return (
                <label key={habit.id} className="group cursor-pointer relative">
                  <input 
                    className="peer hidden" 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleHabit(habit.id)}
                  />
                  <div className="bg-surface-container-low p-8 rounded-lg flex items-center justify-between transition-all duration-300 ease-in-out peer-checked:bg-primary-fixed-dim peer-checked:shadow-xl hover:bg-surface-container-high relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                        <span className="material-symbols-outlined text-3xl" data-icon={habit.icon}>{habit.icon}</span>
                      </div>
                      <span className="text-xl font-medium font-headline text-on-surface">{habit.label}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center peer-checked:bg-secondary peer-checked:border-secondary transition-colors">
                      <span className="material-symbols-outlined text-white text-xl hidden peer-checked:block" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <div className="max-w-xl mx-auto pointer-events-auto">
               <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary rounded-xl font-headline font-bold text-xl tracking-tight shadow-2xl hover:bg-primary-container transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 min-w-[280px]">
                 Continuar
                 <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
               </button>
             </div>
          </div>
        </footer>
      </div>
  );
};

export default NuraMudanADeHBitos;
