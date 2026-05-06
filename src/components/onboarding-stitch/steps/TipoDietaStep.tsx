import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const DIETAS = [
  'Equilibrada',
  'Vegetariana',
  'Vegan',
  'Paleo',
  'Cetogénica',
  'Rica em proteína',
  'Baixa em carbo',
];

const TipoDietaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const selected = data.dietType ?? 'Equilibrada';

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!data.dietType}
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Que tipo de dieta prefere?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          Personalize a sua experiência nutritiva selecionando o estilo que melhor se adapta a você.
        </p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-3">
        {DIETAS.map((dieta) => {
          const isSelected = selected === dieta;
          return (
            <button
              key={dieta}
              onClick={() => updateData({ dietType: dieta })}
              className={`w-full group flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all duration-300 border shadow-sm ${
                isSelected 
                  ? 'bg-stone-50/50 border-Malama-petrol' 
                  : 'bg-white border-stone-100 hover:bg-stone-50/30'
              }`}
            >
              <span className={`text-base transition-colors ml-2 ${
                isSelected ? 'text-stone-800 font-medium' : 'text-stone-600 font-light'
              }`}>
                {dieta}
              </span>
              <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                isSelected ? 'bg-Malama-petrol border-Malama-petrol' : 'border border-stone-200 bg-white'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
              </div>
            </button>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default TipoDietaStep;
