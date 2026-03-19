import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraExperiNciaCalorias: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const options = [
    { value: 'iniciante', label: 'Iniciante', desc: 'Nunca tentei', icon: 'school' },
    { value: 'intermediario', label: 'Intermédio', desc: 'Já tentei', icon: 'trending_up' },
    { value: 'experiente', label: 'Experiente', desc: 'Faço regularmente', icon: 'emoji_events' },
  ];

  const handleSelect = (value: string) => {
    updateData({ calorieTrackingExperience: value });
    setTimeout(() => onNext(), 300);
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

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full flex flex-col items-center justify-center">
        <section className="text-center mb-16 space-y-4">
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight">
            Qual é a sua experiência com contagem de calorias?
          </h1>
          <p className="text-on-surface-variant text-lg max-w-md mx-auto">
            Personalizamos o seu percurso com base no seu conhecimento atual.
          </p>
        </section>

        <div className="w-full space-y-6">
          {options.map((opt) => {
            const isSelected = data.calorieTrackingExperience === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full group text-left p-8 rounded-2xl transition-all duration-300 flex items-center justify-between ${
                  isSelected
                    ? 'bg-primary-fixed-dim ring-2 ring-secondary'
                    : 'bg-surface-container-low hover:bg-surface-container-highest'
                }`}
              >
                <div className="space-y-1">
                  <span className="block font-headline text-xl font-semibold text-primary">{opt.label}</span>
                  <span className="block text-on-surface-variant">({opt.desc})</span>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'bg-secondary scale-110' : 'border-2 border-outline-variant'
                }`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-on-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary font-headline font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraExperiNciaCalorias;
