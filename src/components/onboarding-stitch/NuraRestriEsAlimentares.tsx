import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraRestriEsAlimentares: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const restrictions = [
    { id: 'sem_lactose', label: 'Sem lactose', desc: 'Evita derivados de leite e produtos contendo lactose.', icon: 'water_drop' },
    { id: 'sem_gluten', label: 'Sem glúten', desc: 'Ideal para celíacos ou sensibilidade ao trigo e cevada.', icon: 'bakery_dining' },
    { id: 'sem_acucar', label: 'Sem açúcar', desc: 'Foco em alimentos naturais sem adição de sacarose.', icon: 'destruction' },
    { id: 'alergias', label: 'Alergias', desc: 'Amendoim, frutos do mar, ovos ou outros específicos.', icon: 'warning' },
  ];

  const toggleRestriction = (id: string) => {
    const current = data.dietaryRestrictions || [];
    const updated = current.includes(id)
      ? current.filter(r => r !== id)
      : [...current, id];
    updateData({ dietaryRestrictions: updated });
  };

  return (
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          <div className="fixed top-40 -left-20 opacity-20 pointer-events-none transform -rotate-12">
            <span className="material-symbols-outlined text-[20rem] text-secondary-container">eco</span>
          </div>
          <header className="w-full mb-12 space-y-4">
            <h1 className="font-headline text-4xl md:text-5xl text-primary font-bold leading-tight tracking-tight">
              Tem alguma restrição alimentar?
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md">
              Isso nos ajuda a personalizar suas recomendações e receitas para o seu bem-estar.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative z-10">
            {restrictions.map(r => {
              const isSelected = (data.dietaryRestrictions || []).includes(r.id);
              return (
                <button 
                  key={r.id}
                  onClick={() => toggleRestriction(r.id)}
                  className={`group flex flex-col items-start p-8 rounded-xl text-left transition-all duration-300 relative ${
                    isSelected 
                      ? 'bg-primary-fixed-dim ring-2 ring-secondary/40' 
                      : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white shadow-sm">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${isSelected ? 'bg-secondary-container' : 'bg-surface-container-highest group-hover:bg-secondary-container'}`}>
                    <span className="material-symbols-outlined text-tertiary text-2xl">{r.icon}</span>
                  </div>
                  <span className={`text-xl font-headline font-medium mb-2 ${isSelected ? 'text-primary' : 'text-primary'}`}>{r.label}</span>
                  <span className="text-sm text-on-surface-variant leading-relaxed">{r.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full mt-16 flex flex-col items-center gap-6 relative z-10">
            <button onClick={onNext} className="w-full md:w-80 h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-lexend font-medium text-lg rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-300">
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
