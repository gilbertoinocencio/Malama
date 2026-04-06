import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const RESTRICOES = [
  { id: 'lactose', label: 'Sem lactose', desc: 'Evita derivados de leite e produtos contendo lactose.', icon: 'water_drop' },
  { id: 'gluten', label: 'Sem glúten', desc: 'Ideal para celíacos ou sensibilidade ao trigo e cevada.', icon: 'bakery_dining' },
  { id: 'acucar', label: 'Sem açúcar', desc: 'Foco em alimentos naturais sem adição de sacarose.', icon: 'destruction' },
  { id: 'alergias', label: 'Alergias', desc: 'Amendoim, frutos do mar, ovos ou outros específicos.', icon: 'warning' },
];

const RestricoesAlimentaresStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const selected = data.dietaryRestrictions || [];

  const toggleRestriction = (id: string) => {
    const next = selected.includes(id) 
      ? selected.filter(r => r !== id)
      : [...selected, id];
    updateData({ dietaryRestrictions: next });
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={onNext}
      nextLabel={selected.length === 0 ? 'Não tenho restrições' : 'Isso é tudo'}
    >
      <header className="w-full mb-12 space-y-4">
        <h1 className="font-headline text-4xl md:text-5xl text-primary font-bold leading-tight tracking-tight">
          Tem alguma restrição alimentar?
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md">
          Isso nos ajuda a personalizar suas recomendações e receitas para o seu bem-estar.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {RESTRICOES.map((res) => {
          const isSelected = selected.includes(res.id);
          return (
            <button
              key={res.id}
              onClick={() => toggleRestriction(res.id)}
              className={`group flex flex-col items-start p-8 rounded-xl text-left transition-all duration-500 border-2 ${
                isSelected 
                  ? 'bg-primary-fixed-dim border-secondary/40 ring-2 ring-secondary/10 shadow-lg' 
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
              } relative`}
            >
              {isSelected && (
                <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white shadow-sm">
                  <span className="material-symbols-outlined text-lg">check</span>
                </div>
              )}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${isSelected ? 'bg-secondary-container' : 'bg-surface-container-highest group-hover:bg-secondary-container/20'}`}>
                <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-primary' : 'text-primary opacity-70'}`}>
                  {res.icon}
                </span>
              </div>
              <span className={`text-xl font-headline font-medium mb-2 ${isSelected ? 'text-primary' : 'text-primary opacity-80'}`}>
                {res.label}
              </span>
              <span className="text-sm text-on-surface-variant leading-relaxed opacity-80">
                {res.desc}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <label htmlFor="restrictionsDetail" className="block text-sm font-medium text-primary mb-2">
            Especifique suas alergias ou restrições (Opcional)
          </label>
          <textarea
            id="restrictionsDetail"
            value={data.restrictionsDetail || ''}
            onChange={(e) => updateData({ restrictionsDetail: e.target.value })}
            placeholder="Ex: Alergia a frutos do mar, intolerância severa a lactose, não como carne de porco..."
            className="w-full bg-surface-container-low border border-outline/30 rounded-xl p-4 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[100px] resize-y transition-all"
          />
        </div>
      )}
      
    </StepContainer>
  );
};

export default RestricoesAlimentaresStep;
