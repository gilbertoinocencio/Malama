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
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
      {/* Leaf background decorations */}
      <div className="leaf-bg fixed top-[10%] right-[-5%] w-[300px] h-[300px] bg-secondary-container opacity-10 blur-[80px] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] z-[-1] pointer-events-none"></div>
      <div className="leaf-bg-2 fixed bottom-[5%] left-[-10%] w-[400px] h-[400px] bg-primary opacity-5 blur-[100px] rounded-[60%_40%_30%_70%/50%_30%_70%_40%] z-[-1] pointer-events-none"></div>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-surface-container-high">
        <div className="h-full bg-secondary w-4/5 transition-all duration-700"></div>
      </div>

      <header className="bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center justify-between px-8 h-20 w-full">
        <div className="flex items-center gap-2">
          <span onClick={onBack} className="material-symbols-outlined text-teal-900 dark:text-teal-500 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 p-2 rounded-full transition-all cursor-pointer">
            close
          </span>
        </div>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="pt-32 pb-40 px-6 max-w-xl mx-auto min-h-screen flex flex-col justify-center">
        <section className="mb-12">
          <h1 className="font-lexend text-4xl md:text-5xl font-extrabold tracking-tight text-primary leading-tight mb-4">
            Quais hábitos quer mudar?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed font-light">
            Selecione todos os comportamentos que você deseja transformar nesta jornada.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6">
          {habits.map((habit) => {
            const isSelected = (data.habitChanges || []).includes(habit.value);
            return (
              <label key={habit.value} className="group cursor-pointer relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleHabit(habit.value)}
                  className="peer hidden"
                />
                <div className={`bg-surface-container-low p-8 rounded-lg flex items-center justify-between transition-all duration-300 ease-in-out ${
                  isSelected
                    ? 'peer-checked:bg-primary-fixed-dim peer-checked:shadow-xl'
                    : 'hover:bg-surface-container-high'
                }`}>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                      <span className="material-symbols-outlined text-3xl">{habit.icon}</span>
                    </div>
                    <span className="text-xl font-medium font-lexend text-on-surface">{habit.label}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-secondary border-secondary'
                      : 'border-outline-variant'
                  }`}>
                    {isSelected && (
                      <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-8 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary rounded-xl font-lexend font-bold text-xl tracking-tight shadow-2xl hover:bg-primary-container transition-all duration-300 active:scale-95 flex items-center justify-center gap-3">
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraMudanADeHBitos;
