import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraExperiNciaCalorias: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const options = [
    { value: 'iniciante', label: 'Iniciante', desc: 'nunca tentei' },
    { value: 'intermediario', label: 'Intermédio', desc: 'já tentei' },
    { value: 'experiente', label: 'Experiente', desc: 'faço regularmente' },
  ];

  const handleSelect = (value: string) => {
    updateData({ calorieTrackingExperience: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="text-on-surface min-h-screen flex flex-col">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-1/3 transition-all duration-700 ease-in-out"></div>
      </div>

      {/* Top Navigation */}
      <header className="bg-stone-50/70 backdrop-blur-xl fixed top-0 w-full z-50 bg-stone-100/50 flex items-center justify-between px-8 h-20 w-full">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="transition-all duration-300 cursor-pointer">
            <span className="material-symbols-outlined text-teal-900 scale-95">close</span>
          </button>
        </div>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-lexend tracking-tight font-medium">NURA</div>
        <div className="w-10"></div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow pt-32 pb-40 px-6 max-w-2xl mx-auto w-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Contextual Leaf (Decorative) */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 -left-10 w-48 h-48 bg-primary-fixed-dim opacity-10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Headline (The Hook) */}
        <section className="text-center mb-16 space-y-4">
          <h1 className="font-lexend text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight">
            Qual é a sua experiência com contagem de calorias?
          </h1>
          <p className="text-on-surface-variant font-body text-lg max-w-md mx-auto">
            Personalizamos o seu percurso com base no seu conhecimento atual.
          </p>
        </section>

        {/* Selective Option Cards (The Elegance Selector) */}
        <div className="w-full space-y-6">
          {options.map((opt) => {
            const isSelected = data.calorieTrackingExperience === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full group text-left p-8 rounded-[1.5rem] transition-all duration-${isSelected ? '500' : '300'} ease-in-out flex items-center justify-between ${
                  isSelected
                    ? 'bg-primary-fixed-dim ring-2 ring-secondary'
                    : 'bg-surface-container-low hover:bg-surface-container-highest'
                }`}
              >
                <div className="space-y-1">
                  <span className={`block font-lexend text-xl font-semibold ${isSelected ? 'text-primary' : 'text-primary'}`}>{opt.label}</span>
                  <span className={`block font-body ${isSelected ? 'text-primary/80' : 'text-on-surface-variant'}`}>({opt.desc})</span>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                  isSelected
                    ? 'bg-secondary scale-110'
                    : 'border-2 border-outline-variant group-hover:border-primary transition-colors'
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

      {/* Fixed Action Bar (The Digital Sanctuary) */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-12 pt-8 z-40" style={{ backdropFilter: 'blur(20px)', background: 'rgba(255, 255, 255, 0.7)' }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onNext}
            className="w-full h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-lexend text-lg font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all duration-300 ease-in-out flex items-center justify-center gap-3"
          >
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <p className="text-center mt-4 text-xs font-label text-on-surface-variant uppercase tracking-widest opacity-60">
            Passo 1 de 6
          </p>
        </div>
      </div>
    </div>
  );
};

export default NuraExperiNciaCalorias;
