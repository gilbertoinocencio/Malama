import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraRestriEsAlimentares: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const restrictions = [
    { value: 'gluten', label: 'Glúten', icon: 'do_not_disturb' },
    { value: 'lactose', label: 'Lactose', icon: 'water_drop' },
    { value: 'frutos_do_mar', label: 'Frutos do Mar', icon: 'set_meal' },
    { value: 'nozes', label: 'Nozes', icon: 'forest' },
    { value: 'soja', label: 'Soja', icon: 'grass' },
    { value: 'ovos', label: 'Ovos', icon: 'egg' },
    { value: 'nenhuma', label: 'Nenhuma restrição', icon: 'check_circle' }
  ];

  const toggleRestriction = (value: string) => {
    const current = data.dietaryRestrictions || [];
    if (value === 'nenhuma') {
      updateData({ dietaryRestrictions: ['nenhuma'] });
      return;
    }
    const filtered = current.filter((r: string) => r !== 'nenhuma');
    const updated = filtered.includes(value)
      ? filtered.filter((r: string) => r !== value)
      : [...filtered, value];
    updateData({ dietaryRestrictions: updated });
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
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Alguma restrição alimentar?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Selecione todas as restrições que se aplicam para um plano seguro.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {restrictions.map((item) => {
            const isSelected = (data.dietaryRestrictions || []).includes(item.value);
            return (
              <button
                key={item.value}
                onClick={() => toggleRestriction(item.value)}
                className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 ${
                  isSelected
                    ? 'bg-primary-fixed-dim shadow-md border-2 border-primary/20'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-2 border-transparent hover:bg-surface-container-low'
                } ${item.value === 'nenhuma' ? 'col-span-2' : ''}`}
              >
                <span className={`material-symbols-outlined text-3xl mb-2 ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                <span className={`font-headline font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{item.label}</span>
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

export default NuraRestriEsAlimentares;
