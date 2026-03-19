import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraMudanADeHBitos: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const habits = [
    { value: 'comer_noite', label: 'Comer à noite', icon: 'dark_mode' },
    { value: 'beliscar', label: 'Beliscar o dia todo', icon: 'restaurant' },
    { value: 'doces_excesso', label: 'Doces em excesso', icon: 'icecream' },
    { value: 'sedentarismo', label: 'Sedentarismo', icon: 'directions_walk' },
  ];

  const toggleHabit = (value: string) => {
    const current = data.habitChanges || [];
    const updated = current.includes(value)
      ? current.filter((h: string) => h !== value)
      : [...current, value];
    updateData({ habitChanges: updated });
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
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Que hábitos quer mudar?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Selecione os hábitos que fazem sentido para o seu estilo de vida atual.
          </p>
        </section>

        <div className="space-y-4">
          {habits.map((habit) => {
            const isSelected = (data.habitChanges || []).includes(habit.value);
            return (
              <button
                key={habit.value}
                onClick={() => toggleHabit(habit.value)}
                className={`w-full flex items-center gap-5 p-5 rounded-xl transition-all duration-300 ${
                  isSelected
                    ? 'bg-secondary-container/30 shadow-md border-2 border-secondary/30'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-2 border-transparent hover:bg-surface-container-low'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-secondary/10' : 'bg-surface-container-high/50'}`}>
                  <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-secondary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{habit.icon}</span>
                </div>
                <span className={`font-headline text-lg font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{habit.label}</span>
                {isSelected && (
                  <span className="material-symbols-outlined text-secondary ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
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

export default NuraMudanADeHBitos;
