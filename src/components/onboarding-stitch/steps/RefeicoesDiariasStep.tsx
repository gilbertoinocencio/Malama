import React, { useState } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const MEAL_LABELS: Record<number, { title: string; description: string }> = {
  1: { title: 'Jejum Estruturado', description: 'Uma janela única de alimentação densa e nutritiva.' },
  2: { title: 'Ritmo Leve', description: 'Foco em densidade nutricional em poucas janelas.' },
  3: { title: 'Padrão Nutritivo', description: 'Café da manhã, almoço e jantar equilibrados.' },
  4: { title: 'Metabolismo Ativo', description: 'Quatro refeições para manter o metabolismo acelerado.' },
  5: { title: 'Alta Frequência', description: 'Pequenas porções ao longo do dia para energia constante.' },
  6: { title: 'Frequência Máxima', description: 'Seis refeições distribuídas para atletas e alta demanda.' },
};

const RefeicoesDiariasStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [meals, setMeals] = useState(data.mealsPerDay || 3);

  const handleDecrement = () => setMeals(prev => Math.max(1, prev - 1));
  const handleIncrement = () => setMeals(prev => Math.min(6, prev + 1));

  const handleContinue = () => {
    updateData({ mealsPerDay: meals });
    onNext();
  };

  const label = MEAL_LABELS[meals];

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleContinue}
      onBack={onBack}
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Refeições por dia
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Ajustamos a densidade calórica de cada prato para o seu ritmo.
        </p>
      </div>

      {/* Counter */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex items-center justify-between mb-4">
        <button
          onClick={handleDecrement}
          disabled={meals <= 1}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>

        <div className="flex flex-col items-center">
          <span
            className="text-7xl text-stone-800 tabular-nums leading-none"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {meals}
          </span>
          <span className="text-stone-400 text-sm font-light mt-2 tracking-wide">
            {meals === 1 ? 'refeição' : 'refeições'}
          </span>
        </div>

        <button
          onClick={handleIncrement}
          disabled={meals >= 6}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i < meals ? 20 : 8,
              height: 8,
              background: i < meals ? '#7d4a3c' : '#e7e5e4',
            }}
          />
        ))}
      </div>

      {/* Info card */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">set_meal</span>
        </div>
        <div>
          <p className="text-stone-700 text-sm font-medium mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
            {label.title}
          </p>
          <p className="text-stone-400 text-sm font-light leading-snug">
            {label.description}
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default RefeicoesDiariasStep;
