import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const PETROL = '#7d4a3c';

const ImpactoAguaStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={onNext}
      nextLabel="Entendi"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          O impacto da água
        </h1>
        <p className="text-stone-400 text-base font-light max-w-sm mx-auto leading-relaxed">
          Manter-se hidratado não é apenas sobre sede. É o combustível silencioso do seu metabolismo.
        </p>
      </div>

      {/* Chart card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-stone-700 text-base mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Taxa Metabólica
            </p>
            <p className="text-stone-400 text-xs font-light">Aumento calórico por hidratação</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-stone-400 text-lg">bolt</span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-2 h-28 mb-4">
          {[30, 45, 60, 75, 85, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg transition-all duration-300"
              style={{
                height: `${h}%`,
                background: i === 5 ? PETROL : i >= 3 ? `${PETROL}55` : '#e7e5e4',
              }}
            />
          ))}
        </div>

        <div className="flex justify-between items-center border-t border-stone-100 pt-4">
          <div className="text-center">
            <p className="text-2xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>24%</p>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light">Aumento médio</p>
          </div>
          <div className="w-px h-8 bg-stone-100" />
          <div className="text-center">
            <p className="text-2xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>400ml</p>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light">Dose ideal</p>
          </div>
        </div>
      </div>

      {/* Science note */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">science</span>
        </div>
        <p className="text-sm font-light text-stone-500 leading-relaxed">
          Beber 500ml de água pode elevar temporariamente o metabolismo em até 30% nos 60 minutos seguintes.
        </p>
      </div>
    </StepContainer>
  );
};

export default ImpactoAguaStep;
