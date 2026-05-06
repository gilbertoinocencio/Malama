import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const ExperienciaCaloriasStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const options = [
    { id: 'beginner', label: 'Iniciante', sub: '(nunca tentei)' },
    { id: 'intermediate', label: 'Intermédio', sub: '(já tentei)' },
    { id: 'pro', label: 'Experiente', sub: '(faço regularmente)' },
  ];

  const selected = data.calorieExperience || 'intermediate';

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!data.calorieExperience}
    >
      <section className="text-center mb-12 space-y-4">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Qual é a sua experiência com contagem de calorias?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto">
          Personalizamos o seu percurso com base no seu conhecimento atual.
        </p>
      </section>

      <div className="w-full space-y-4 max-w-xl mx-auto">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => updateData({ calorieExperience: opt.id as any })}
              className="w-full text-left p-6 rounded-2xl transition-all duration-300 flex items-center justify-between active:scale-[0.98] bg-white shadow-sm"
              style={{
                border: isSelected ? `2px solid ${PETROL}` : '2px solid transparent',
                boxShadow: isSelected ? `0 0 0 1px ${PETROL}20, 0 2px 12px rgba(0,0,0,0.04)` : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div className="space-y-0.5">
                <span 
                  className="block text-lg"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: isSelected ? PETROL : '#292524',
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  {opt.label}
                </span>
                <span 
                  className="block text-sm font-light transition-colors"
                  style={{ color: isSelected ? '#57534e' : '#a8a29e' }}
                >
                  {opt.sub}
                </span>
              </div>
              
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isSelected ? PETROL : '#f5f5f4', // stone-100
                  border: isSelected ? 'none' : '1px solid #e7e5e4' // stone-200
                }}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: 16 }}>
                    check
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </StepContainer>
  );
};

export default ExperienciaCaloriasStep;
