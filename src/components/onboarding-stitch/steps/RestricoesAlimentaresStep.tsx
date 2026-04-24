import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const RESTRICOES = [
  { id: 'lactose', label: 'Sem lactose', desc: 'Evita derivados de leite e produtos contendo lactose.', icon: 'water_drop' },
  { id: 'gluten', label: 'Sem glúten', desc: 'Ideal para celíacos ou sensibilidade ao trigo e cevada.', icon: 'bakery_dining' },
  { id: 'acucar', label: 'Sem açúcar', desc: 'Foco em alimentos naturais sem adição de sacarose.', icon: 'eco' }, // Changed icon to eco for without sugar (destruction is too aggressive)
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
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Tem alguma restrição alimentar?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          Isso nos ajuda a personalizar suas recomendações e receitas para o seu bem-estar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {RESTRICOES.map((res) => {
          const isSelected = selected.includes(res.id);
          return (
            <button
              key={res.id}
              onClick={() => toggleRestriction(res.id)}
              className={`group relative flex flex-col items-start p-6 rounded-[1.5rem] text-left transition-all duration-300 border shadow-sm ${
                isSelected 
                  ? 'bg-stone-50/50 border-Malama-petrol' 
                  : 'bg-white border-stone-100 hover:bg-stone-50/30'
              }`}
            >
              <div className="absolute top-6 right-6">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                  isSelected ? 'bg-Malama-petrol border-Malama-petrol' : 'border border-stone-200 bg-white'
                }`}>
                  {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                </div>
              </div>
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${
                isSelected ? 'bg-Malama-petrol/10 text-Malama-petrol' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {res.icon}
                </span>
              </div>
              
              <span className={`text-lg font-medium mb-1 transition-colors ${
                isSelected ? 'text-stone-800' : 'text-stone-700'
              }`}>
                {res.label}
              </span>
              <span className="text-sm text-stone-400 leading-relaxed font-light">
                {res.desc}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="w-full mt-6 animate-fade-in-up">
          <label htmlFor="restrictionsDetail" className="block text-sm font-medium text-stone-500 mb-2 ml-1">
            Especifique suas alergias ou restrições (Opcional)
          </label>
          <textarea
            id="restrictionsDetail"
            value={data.restrictionsDetail || ''}
            onChange={(e) => updateData({ restrictionsDetail: e.target.value })}
            placeholder="Ex: Alergia a frutos do mar, intolerância severa a lactose..."
            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-stone-800 focus:outline-none focus:border-Malama-petrol focus:ring-1 focus:ring-Malama-petrol min-h-[100px] resize-y transition-all placeholder:text-stone-300 font-light shadow-sm"
          />
        </div>
      )}
      
    </StepContainer>
  );
};

export default RestricoesAlimentaresStep;
