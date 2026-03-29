import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const ConfirmacaoMetasStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  // Calculate target weight based on data
  const pesoObjetivo = data.pesoObjetivo || 70;
  const peso = data.peso || 75;
  const semanas = Math.max(1, Math.round(Math.abs(peso - pesoObjetivo) * 2)); // Estimate, mínimo 1 semana

  const handleConfirm = () => {
    onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleConfirm}
      nextLabel="Confirmar Metas"
      showHeader={false}
      secondaryLabel="Ajustar Intensidade"
    >
      <main className="flex-grow flex flex-col px-6 pb-32 max-w-lg mx-auto w-full relative">
        {/* Contextual Leaf Decoration */}
        <div className="fixed -top-10 -right-10 w-64 h-64 bg-secondary-container opacity-20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="fixed bottom-20 -left-10 w-48 h-48 bg-tertiary-container opacity-10 blur-3xl rounded-full pointer-events-none"></div>

        {/* Editorial Header */}
        <header className="mb-10 mt-4 text-center">
          <span className="text-tertiary font-medium tracking-widest text-xs uppercase mb-2 block">
            Cálculo de IA Finalizado
          </span>
          <h1 className="text-tertiary text-4xl font-bold tracking-tight leading-tight">Suas Metas do Flow</h1>
          <p className="text-on-surface-variant mt-4 text-lg leading-relaxed">
            Com base no seu biotipo e rotina, este é o caminho ideal para sua transformação.
          </p>
        </header>

        {/* Bento Grid Goal Confirmation */}
        <div className="grid grid-cols-2 gap-4">
          {/* Target Weight Card */}
          <div className="col-span-2 bg-surface-container-lowest p-8 rounded-lg shadow-[0_16px_32px_0_rgba(26,28,26,0.04)] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-7xl" data-icon="monitor_weight">
                monitor_weight
              </span>
            </div>
            <p className="text-on-surface-variant font-medium uppercase tracking-widest text-xs mb-2">Peso Alvo</p>
            <div className="flex items-baseline gap-1">
              <span className="text-tertiary text-7xl font-bold tracking-tighter">{pesoObjetivo}</span>
              <span className="text-tertiary-container text-2xl font-semibold uppercase">kg</span>
            </div>
            <div className="mt-4 h-[2px] w-24 bg-surface-container-highest"></div>
          </div>

          {/* Estimated Time Card */}
          <div className="col-span-1 bg-tertiary text-on-tertiary p-6 rounded-lg flex flex-col justify-between h-48">
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-3xl" data-icon="calendar_today">
              calendar_today
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-tertiary-fixed-dim/70 font-bold mb-1">
                Prazo Estimado
              </p>
              <h3 className="text-3xl font-bold">{semanas}</h3>
              <p className="text-sm font-medium opacity-80">Semanas</p>
            </div>
          </div>

          {/* Science Confirmation Card */}
          <div className="col-span-1 bg-tertiary text-on-tertiary p-6 rounded-lg flex flex-col justify-between h-48">
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-3xl" data-icon="auto_awesome">
              auto_awesome
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-tertiary-fixed-dim/70 font-bold mb-1">
                Taxa de Sucesso
              </p>
              <h3 className="text-3xl font-bold">94%</h3>
              <p className="text-sm font-medium opacity-80">IA Confidence</p>
            </div>
          </div>

          {/* Simple Elegant Graph Overlay */}
          <div className="col-span-2 bg-surface-container-low p-6 rounded-lg flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h4 className="text-tertiary font-bold text-sm tracking-tight uppercase">Curva de Progressão</h4>
              <span className="text-secondary font-bold text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" data-icon="trending_down">
                  trending_down
                </span>
                Ritmo Sustentável
              </span>
            </div>

            {/* Visualizing the Flow */}
            <div className="relative h-32 w-full flex items-end justify-between px-2">
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                <span className="material-symbols-outlined text-[8rem]" data-icon="waves">
                  waves
                </span>
              </div>
              {/* Simplified Bar Graph */}
              {[20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((height, index) => (
                <div
                  key={index}
                  className="w-[8%] bg-tertiary rounded-t-full"
                  style={{
                    height: `${100 - height}%`,
                    opacity: 0.2 + (index * 0.08),
                  }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              <span>Início</span>
              <span>Semana {Math.floor(semanas / 2)}</span>
              <span>Objetivo</span>
            </div>
          </div>

          {/* Commitment Affirmation */}
          <div className="col-span-2 mt-2 px-2">
            <p className="text-on-surface-variant text-sm text-center italic font-body">
              "O Flow não é sobre pressa, é sobre ritmo sustentável e precisão biológica."
            </p>
          </div>
        </div>

      </main>
    </StepContainer>
  );
};

export default ConfirmacaoMetasStep;
