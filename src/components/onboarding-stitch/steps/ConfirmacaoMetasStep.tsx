import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const PETROL = '#7d4a3c';

const ConfirmacaoMetasStep: React.FC<StepProps> = ({ data, onNext, onBack, currentStep, totalSteps }) => {
  const pesoObjetivo = data.pesoObjetivo || 70;
  const peso = data.peso || 75;
  const semanas = Math.max(1, Math.round(Math.abs(peso - pesoObjetivo) * 2));

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={onNext}
      nextLabel="Confirmar Metas"
      secondaryLabel="Ajustar intensidade"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Suas Metas
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Com base no seu biotipo e rotina, este é o caminho ideal.
        </p>
      </div>

      {/* Target weight */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col items-center mb-4">
        <span className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-3">Peso alvo</span>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-7xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
            {pesoObjetivo}
          </span>
          <span className="text-2xl text-stone-400 font-light">kg</span>
        </div>
        <div className="w-16 h-px bg-stone-200 mt-3" />
      </div>

      {/* Two stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col justify-between">
          <span className="material-symbols-outlined text-stone-400 text-lg mb-4">calendar_today</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Prazo estimado</p>
            <p className="text-3xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{semanas}</p>
            <p className="text-stone-400 text-sm font-light">semanas</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col justify-between">
          <span className="material-symbols-outlined text-stone-400 text-lg mb-4">auto_awesome</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Taxa de sucesso</p>
            <p className="text-3xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>94%</p>
            <p className="text-stone-400 text-sm font-light">IA confidence</p>
          </div>
        </div>
      </div>

      {/* Progress curve */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>Curva de Progressão</p>
          <span className="flex items-center gap-1 text-stone-400 text-xs font-light">
            <span className="material-symbols-outlined text-sm">trending_down</span>
            Ritmo sustentável
          </span>
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {[80, 75, 70, 60, 50, 40, 30, 20, 10, 0].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(h, 4)}%`,
                background: i === 9 ? PETROL : `${PETROL}${Math.round(30 + i * 7).toString(16)}`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 font-light uppercase tracking-widest mt-2 border-t border-stone-100 pt-2">
          <span>Início</span>
          <span>Semana {Math.floor(semanas / 2)}</span>
          <span>Objetivo</span>
        </div>
      </div>

      {/* Quote */}
      <p className="text-stone-400 text-sm text-center font-light italic px-4">
        "O Flow não é sobre pressa, é sobre ritmo sustentável e precisão biológica."
      </p>
    </StepContainer>
  );
};

export default ConfirmacaoMetasStep;
