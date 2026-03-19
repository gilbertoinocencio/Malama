import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraConsumoDeGua: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const options = [
    { value: 'sim', label: 'Sim', icon: 'check_circle', desc: 'Bebo pelo menos 2L por dia' },
    { value: 'nao', label: 'Não', icon: 'close', desc: 'Sei que preciso melhorar' },
    { value: 'nao_sei', label: 'Não tenho a certeza', icon: 'question_mark', desc: 'Nunca prestei atenção' },
  ];

  const handleSelect = (value: string) => {
    updateData({ drinksEnoughWater: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <nav className="shrink-0 w-full z-10 flex items-center justify-between px-8 h-20 bg-stone-50/70 backdrop-blur-xl">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-stone-200/50 transition-all duration-300">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl flex flex-col items-center">
          <div className="mb-12 flex items-center justify-center w-24 h-24 rounded-full bg-surface-container-lowest shadow-[0_16px_32px_rgba(0,0,0,0.02)] border border-outline-variant/10">
            <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          </div>

          <div className="text-center mb-16 px-4">
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary leading-tight">
              Bebe água suficiente?
            </h1>
            <p className="mt-6 text-on-surface-variant text-lg max-w-sm mx-auto leading-relaxed">
              A hidratação é o pilar invisível da sua performance cognitiva e física.
            </p>
          </div>

          <div className="w-full space-y-4">
            {options.map((opt) => {
              const isSelected = data.drinksEnoughWater === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`group w-full flex items-center justify-between p-8 rounded-xl transition-all duration-300 ease-in-out text-left ${
                    isSelected
                      ? 'bg-primary-fixed-dim/10 border-2 border-primary-fixed-dim'
                      : 'bg-surface-container-low hover:bg-surface-container-high border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-primary-fixed-dim' : 'bg-surface-container-lowest group-hover:bg-primary-container/10'
                    }`}>
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>{opt.icon}</span>
                    </div>
                    <span className={`text-xl font-headline ${isSelected ? 'font-semibold text-primary' : 'font-medium text-on-surface'}`}>{opt.label}</span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-12 w-full">
            <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary rounded-xl font-headline font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all duration-300 group">
              Continuar
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            <p className="mt-6 text-center text-on-surface-variant/60 text-sm font-medium">
              Fase 4 de 6 · Hidratação & Fluxo
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NuraConsumoDeGua;
