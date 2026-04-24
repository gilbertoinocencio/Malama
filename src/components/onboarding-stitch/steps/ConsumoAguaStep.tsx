import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const OPTIONS = [
  { id: 'sim', label: 'Sim', icon: 'check', selectedIcon: 'check_circle', isBinary: true },
  { id: 'nao', label: 'Não', icon: 'close', selectedIcon: 'check_circle', isBinary: false },
  { id: 'incerto', label: 'Não tenho certeza', icon: 'question_mark', isBinary: null },
];

const ConsumoAguaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const selected = data.drinksEnoughWater || data.waterIntakeAwareness;

  const handleSelect = (value: string) => {
    updateData({ drinksEnoughWater: value, waterIntakeAwareness: value });
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!selected}
    >
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        
        <div className="text-center mb-10 w-full">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 
            className="text-4xl text-stone-800 leading-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Bebe água suficiente?
          </h1>
          <p className="mt-4 text-stone-400 text-base font-light max-w-sm mx-auto leading-relaxed">
            A hidratação é o pilar invisível da sua performance cognitiva e física.
          </p>
        </div>

        {/* Subtle Water Drop Icon */}
        <div className="mb-10 flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm border border-stone-100">
          <span className="material-symbols-outlined text-4xl text-Malama-petrol opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>
            water_drop
          </span>
        </div>

        {/* Elegance Selector Cards */}
        <div className="w-full max-w-md mx-auto space-y-3">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
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
                      {opt.icon}
                    </span>
                  </div>
                  <span className={`text-base transition-colors ${
                    isSelected ? 'text-stone-800 font-medium' : 'text-stone-600 font-light'
                  }`}>
                    {opt.label}
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
      </div>
    </StepContainer>
  );
};

export default ConsumoAguaStep;
