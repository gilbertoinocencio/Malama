import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraRestriEsAlimentares: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const restrictions = [
    { value: 'lactose', label: 'Sem lactose', icon: 'water_drop', desc: 'Evita derivados de leite e produtos contendo lactose.' },
    { value: 'gluten', label: 'Sem glúten', icon: 'bakery_dining', desc: 'Ideal para celíacos ou sensibilidade ao trigo e cevada.' },
    { value: 'acucar', label: 'Sem açúcar', icon: 'destruction', desc: 'Foco em alimentos naturais sem adição de sacarose.' },
    { value: 'alergias', label: 'Alergias', icon: 'warning', desc: 'Amendoim, frutos do mar, ovos ou outros específicos.' },
    { value: 'nenhuma', label: 'Nenhuma restrição', icon: 'check_circle', desc: 'Como de tudo sem restrições específicas.' }
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
    <div className="flex flex-col h-full bg-surface text-on-surface font-body overflow-hidden relative">
      <div className="fixed top-40 -left-20 opacity-20 pointer-events-none transform -rotate-12 z-0">
        <span className="material-symbols-outlined text-[20rem] text-secondary-container">eco</span>
      </div>
      <div className="fixed bottom-10 -right-20 opacity-10 pointer-events-none transform rotate-45 z-0">
        <span className="material-symbols-outlined text-[25rem] text-tertiary-fixed">spa</span>
      </div>

      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full z-10">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Tem alguma restrição alimentar?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Isso nos ajuda a personalizar suas recomendações e receitas para o seu bem-estar.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {restrictions.map((item) => {
            const isSelected = (data.dietaryRestrictions || []).includes(item.value);
            return (
              <button
                key={item.value}
                onClick={() => toggleRestriction(item.value)}
                className={`group flex flex-col items-start p-8 rounded-xl text-left transition-all duration-500 focus:outline-none relative ${
                  isSelected
                    ? 'bg-primary-fixed-dim ring-2 ring-secondary/40'
                    : 'bg-surface-container-low hover:bg-surface-container-high focus:ring-2 focus:ring-secondary/20'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${
                  isSelected ? 'bg-secondary-container' : 'bg-surface-container-highest group-focus:bg-secondary-container'
                }`}>
                  <span className="material-symbols-outlined text-tertiary text-2xl">{item.icon}</span>
                </div>
                <span className="text-xl font-headline font-medium text-primary mb-2">{item.label}</span>
                <span className="text-sm text-on-surface-variant leading-relaxed">{item.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="w-full mt-16 flex flex-col items-center gap-6">
          <button onClick={onNext} className="w-full md:w-80 h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-medium text-lg rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-300">
            Continuar
          </button>
          <button onClick={onNext} className="text-on-surface-variant font-medium hover:text-primary transition-colors py-2 px-6 rounded-full hover:bg-surface-container-high transition-all">
            Pular esta etapa
          </button>
        </div>
      </main>
    </div>
  );
};

export default NuraRestriEsAlimentares;
