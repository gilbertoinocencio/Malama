import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraObjetivosAdicionais: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const goals = [
    { value: 'relacao_comida', label: 'Relação saudável com comida', icon: 'restaurant' },
    { value: 'bem_estar', label: 'Bem-estar geral', icon: 'spa' },
    { value: 'gerir_stress', label: 'Gerir stress', icon: 'psychology' },
    { value: 'melhorar_sono', label: 'Melhorar sono', icon: 'bedtime' },
    { value: 'aumentar_energia', label: 'Aumentar energia', icon: 'bolt' },
  ];

  const toggleGoal = (value: string) => {
    const current = data.additionalGoals || [];
    const updated = current.includes(value)
      ? current.filter((g: string) => g !== value)
      : [...current, value];
    updateData({ additionalGoals: updated });
  };

  const handleSkip = () => {
    updateData({ additionalGoals: [] });
    setTimeout(() => onNext(), 100);
  };

  return (
    <div className="flex flex-col h-full bg-background text-on-surface font-body min-h-screen selection:bg-secondary-container">
      {/* Progress Indicator (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-3/4 transition-all duration-1000 ease-in-out"></div>
      </div>

      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl flex items-center justify-between px-8 h-20 w-full">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-200/50 transition-all duration-300 active:scale-95"
          >
            <span className="material-symbols-outlined text-teal-900">close</span>
          </button>
        </div>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="pt-32 pb-40 px-6 max-w-2xl mx-auto flex flex-col min-h-screen">
        {/* Onboarding Hook */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight leading-tight mb-4">
            Algum objetivo adicional?
          </h1>
          <p className="text-on-surface-variant text-lg max-w-md">
            Personalizamos a sua jornada para focar no que realmente importa hoje.
          </p>
        </section>

        {/* Selection Grid */}
        <div className="space-y-4">
          {goals.map((goal) => {
            const isSelected = (data.additionalGoals || []).includes(goal.value);
            return (
              <div
                key={goal.value}
                onClick={() => toggleGoal(goal.value)}
                className={`group relative flex items-center justify-between p-8 rounded-[1.5rem] cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'bg-primary-fixed-dim ring-2 ring-secondary/20 shadow-lg shadow-primary/5'
                    : 'bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${
                    isSelected ? 'bg-secondary-container/30' : 'bg-white/60'
                  }`}>
                    <span
                      className="material-symbols-outlined text-secondary"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      {goal.icon}
                    </span>
                  </div>
                  <div>
                    <span className="text-xl font-medium text-primary block">{goal.label}</span>
                  </div>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isSelected ? 'bg-secondary text-on-secondary' : 'border-2 border-outline-variant opacity-40'
                }`}>
                  {isSelected && (
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Action (Editorial Position) */}
        <div className="mt-auto pt-16 pb-8 flex flex-col gap-4">
          <button
            onClick={onNext}
            className="w-full bg-primary text-on-primary h-16 rounded-xl text-lg font-semibold tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-xl shadow-primary/10"
          >
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button
            onClick={handleSkip}
            className="w-full h-12 text-on-surface-variant font-medium hover:text-primary transition-colors duration-300"
          >
            Talvez mais tarde
          </button>
        </div>
      </main>

      {/* Contextual Leaf (Decorative) */}
      <div className="fixed -bottom-20 -right-20 w-80 h-80 bg-secondary-container/10 blur-[100px] pointer-events-none rounded-full z-0"></div>
      <div className="fixed top-1/4 -left-20 w-60 h-60 bg-primary-container/5 blur-[80px] pointer-events-none rounded-full z-0"></div>
    </div>
  );
};

export default NuraObjetivosAdicionais;
