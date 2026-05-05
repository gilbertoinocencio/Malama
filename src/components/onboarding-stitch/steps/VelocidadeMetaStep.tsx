import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const SPEEDS = [
  { value: 1, label: 'Muito suave',  rate: 0.25, desc: 'Adaptação gradual ao novo ritmo' },
  { value: 2, label: 'Suave',        rate: 0.50, desc: 'Mudança gentil e sustentável' },
  { value: 3, label: 'Moderado',     rate: 0.75, desc: 'Equilíbrio entre resultado e conforto' },
  { value: 4, label: 'Intenso',      rate: 1.00, desc: 'Progresso acelerado com disciplina' },
  { value: 5, label: 'Muito intenso',rate: 1.25, desc: 'Máximo foco e comprometimento' },
];

const VelocidadeMetaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const speed = data.goalSpeed || 3;
  const selected = SPEEDS.find(s => s.value === speed) ?? SPEEDS[2];

  const peso = data.peso || 75;
  const pesoObjetivo = data.pesoObjetivo || 70;
  const semanas = Math.max(4, Math.ceil(Math.abs(peso - pesoObjetivo) / selected.rate));

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Confirmar ritmo"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Qual o seu ritmo?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Escolha a velocidade que melhor se adapta à sua rotina. Consistência supera intensidade.
        </p>
      </div>

      {/* Speed options */}
      <div className="space-y-2 mb-6">
        {SPEEDS.map((s) => {
          const isSelected = speed === s.value;
          return (
            <button
              key={s.value}
              onClick={() => updateData({ goalSpeed: s.value })}
              className="w-full text-left rounded-2xl border shadow-sm p-4 transition-all duration-200 flex items-center justify-between"
              style={{
                background: 'white',
                borderColor: isSelected ? PETROL : '#f5f5f4',
                borderWidth: isSelected ? '1.5px' : '1px',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex gap-0.5">
                  {SPEEDS.map((dot) => (
                    <div
                      key={dot.value}
                      className="w-2 h-2 rounded-full transition-all duration-200"
                      style={{
                        background: dot.value <= s.value
                          ? (isSelected ? PETROL : '#d6d3d1')
                          : '#e7e5e4',
                      }}
                    />
                  ))}
                </div>
                <div>
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: isSelected ? '#292524' : '#78716c',
                    }}
                  >
                    {s.label}
                  </p>
                  <p className="text-xs text-stone-400 font-light">{s.desc}</p>
                </div>
              </div>
              <span
                className="text-xs font-light tabular-nums"
                style={{ color: isSelected ? PETROL : '#a8a29e' }}
              >
                {s.rate} kg/sem
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview card */}
      <div
        className="rounded-2xl p-6 flex items-center gap-4"
        style={{ background: `${PETROL}10`, border: `1px solid ${PETROL}30` }}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: `${PETROL}20` }}
        >
          <span className="material-symbols-outlined text-lg" style={{ color: PETROL }}>schedule</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest font-light text-stone-400 mb-0.5">Previsão de chegada</p>
          <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Aproximadamente{' '}
            <span style={{ color: PETROL }} className="font-medium">{semanas} semanas</span>
            {' '}no ritmo {selected.label.toLowerCase()}
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default VelocidadeMetaStep;
