import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraObjetivosAdicionais: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const goals = [
    { value: 'melhorar_sono', label: 'Melhorar o Sono', icon: 'bedtime' },
    { value: 'reduzir_stress', label: 'Reduzir Stress', icon: 'self_improvement' },
    { value: 'mais_energia', label: 'Mais Energia', icon: 'bolt' },
    { value: 'ganhar_massa', label: 'Ganhar Massa', icon: 'fitness_center' },
    { value: 'saude_intestinal', label: 'Saúde Intestinal', icon: 'gastroenterology' },
    { value: 'longevidade', label: 'Longevidade', icon: 'favorite' },
  ];

  const toggleGoal = (value: string) => {
    const current = data.additionalGoals || [];
    const updated = current.includes(value)
      ? current.filter((g: string) => g !== value)
      : [...current, value];
    updateData({ additionalGoals: updated });
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
            Objetivos adicionais?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Selecione tudo o que você gostaria de melhorar além da nutrição.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {goals.map((goal) => {
            const isSelected = (data.additionalGoals || []).includes(goal.value);
            return (
              <button
                key={goal.value}
                onClick={() => toggleGoal(goal.value)}
                className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 ${
                  isSelected
                    ? 'bg-secondary-container/30 shadow-md border-2 border-secondary/30'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-2 border-transparent hover:bg-surface-container-low'
                }`}
              >
                <span className={`material-symbols-outlined text-3xl mb-3 ${isSelected ? 'text-secondary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{goal.icon}</span>
                <span className={`font-headline text-sm font-semibold text-center ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{goal.label}</span>
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

export default NuraObjetivosAdicionais;
