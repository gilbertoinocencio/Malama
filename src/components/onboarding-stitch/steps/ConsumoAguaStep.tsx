import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const OPTIONS = [
  { id: 'sim', label: 'Sim', icon: 'check_circle', selectedIcon: 'check_circle', isBinary: true },
  { id: 'nao', label: 'Não', icon: 'close', selectedIcon: 'check_circle', isBinary: false },
  { id: 'incerto', label: 'Não tenho a certeza', icon: 'question_mark', isBinary: null },
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
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
    >
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        {/* Subtle Water Drop Icon */}
        <div className="mb-12 flex items-center justify-center w-24 h-24 rounded-full bg-surface-container-lowest shadow-sm border border-outline-variant/10">
          <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            water_drop
          </span>
        </div>

        {/* Header Section */}
        <div className="text-center mb-16 px-4">
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary leading-tight">
            Bebe água suficiente?
          </h1>
          <p className="mt-6 text-on-surface-variant text-lg max-w-sm mx-auto leading-relaxed">
            A hidratação é o pilar invisível da sua performance cognitiva e física.
          </p>
        </div>

        {/* Elegance Selector Cards */}
        <div className="w-full space-y-4">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`group w-full flex items-center justify-between p-8 rounded-xl transition-all duration-300 ease-in-out text-left border-2 ${
                  isSelected 
                    ? 'bg-primary-fixed-dim/30 border-primary-fixed-dim ring-2 ring-primary/5 shadow-md' 
                    : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-fixed-dim' : 'bg-surface-container-lowest group-hover:bg-primary-container/10'}`}>
                    <span className={`material-symbols-outlined ${isSelected ? 'text-primary' : 'text-primary/70'}`}>
                      {opt.icon}
                    </span>
                  </div>
                  <span className={`text-xl font-headline font-medium ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                    {opt.label}
                  </span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );
};

export default ConsumoAguaStep;
