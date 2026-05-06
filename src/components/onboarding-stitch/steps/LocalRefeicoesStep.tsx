import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const LOCAIS = [
  { id: 'casa', label: 'Em casa', icon: 'home' },
  { id: 'trabalho', label: 'No trabalho', icon: 'work' },
  { id: 'restaurante', label: 'Restaurantes/Rua', icon: 'restaurant' },
];

const LocalRefeicoesStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const selected = data.eatingLocation ?? 'casa';

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!data.eatingLocation}
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Onde você costuma comer?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          Para personalizar seu plano alimentar, precisamos entender sua rotina.
        </p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-3">
        {LOCAIS.map((local) => {
          const isSelected = selected === local.id;
          return (
            <button
              key={local.id}
              onClick={() => updateData({ eatingLocation: local.id })}
              className={`w-full group flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all duration-300 border shadow-sm ${
                isSelected 
                  ? 'bg-stone-50/50 border-Malama-petrol' 
                  : 'bg-white border-stone-100 hover:bg-stone-50/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  isSelected ? 'bg-Malama-petrol/10 text-Malama-petrol' : 'bg-stone-50 text-stone-400'
                }`}>
                  <span className="material-symbols-outlined text-xl">
                    {local.icon}
                  </span>
                </div>
                <span className={`text-base transition-colors ${
                  isSelected ? 'text-stone-800 font-medium' : 'text-stone-600 font-light'
                }`}>
                  {local.label}
                </span>
              </div>
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

export default LocalRefeicoesStep;
