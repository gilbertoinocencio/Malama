import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

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
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
    >
      
      <section className="text-center mb-16 space-y-4">
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-tertiary tracking-tight leading-tight">
          Qual é a sua experiência com contagem de calorias?
        </h1>
        <p className="text-on-surface-variant font-body text-lg max-w-md mx-auto">
          Personalizamos o seu percurso com base no seu conhecimento atual.
        </p>
      </section>

      <div className="w-full space-y-6 max-w-xl mx-auto">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => updateData({ calorieExperience: opt.id as any })}
            className={`w-full group text-left p-8 rounded-[1.5rem] transition-all duration-300 flex items-center justify-between ${
              selected === opt.id 
                ? 'bg-tertiary-fixed-dim ring-2 ring-secondary' 
                : 'bg-surface-container-low hover:bg-surface-container-highest'
            }`}
          >
            <div className="space-y-1">
              <span className="block font-headline text-xl font-semibold text-tertiary">{opt.label}</span>
              <span className={`block font-body ${selected === opt.id ? 'text-tertiary/80' : 'text-on-surface-variant'}`}>{opt.sub}</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              selected === opt.id ? 'bg-secondary scale-110' : 'border-2 border-outline-variant group-hover:border-tertiary'
            }`}>
              {selected === opt.id && (
                <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </StepContainer>
  );
};

export default ExperienciaCaloriasStep;
