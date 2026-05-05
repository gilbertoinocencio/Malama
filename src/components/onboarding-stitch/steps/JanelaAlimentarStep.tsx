import React, { useState } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';
const CIRCUMFERENCE = 283; // 2π × 45

const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const toTime = (mins: number) => {
  const total = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const JanelaAlimentarStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [startMins, setStartMins] = useState(toMins(data.eatingWindowStart || '08:00'));
  const [endMins, setEndMins] = useState(toMins(data.eatingWindowEnd || '20:00'));

  const durationMins = ((endMins - startMins) + 1440) % 1440;
  const durationH = Math.floor(durationMins / 60);
  const durationM = durationMins % 60;

  const arcLength = (durationMins / 1440) * CIRCUMFERENCE;
  // Rotate arc to start at startMins: 0=midnight at top (-90° base offset for SVG)
  const startDeg = (startMins / 1440) * 360 - 90;

  const adjustStart = (delta: number) => setStartMins(prev => ((prev + delta) + 1440) % 1440);
  const adjustEnd = (delta: number) => setEndMins(prev => ((prev + delta) + 1440) % 1440);

  const handleContinue = () => {
    const start = toTime(startMins);
    const end = toTime(endMins);
    updateData({
      eatingWindowStart: start,
      eatingWindowEnd: end,
      reminderSchedule: `${start} - ${end}`,
    });
    onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleContinue}
      onBack={onBack}
      nextLabel="Confirmar Janela"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Janela Alimentar
        </h1>
        <p className="text-stone-400 text-base font-light">
          O tempo entre a primeira e a última refeição.
        </p>
      </div>

      {/* Dynamic arc clock */}
      <div className="relative w-52 h-52 flex items-center justify-center mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-[10px] border-stone-100" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={PETROL} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - arcLength}
            transform={`rotate(${startDeg}, 50, 50)`}
          />
        </svg>
        <div className="text-center z-10">
          <span className="block text-[10px] tracking-widest uppercase text-stone-400 font-light mb-1">Duração</span>
          <span className="text-5xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
            {durationH}h{durationM > 0 ? <span className="text-2xl">{durationM}m</span> : null}
          </span>
        </div>
      </div>

      {/* Time pickers */}
      <div className="w-full space-y-3">
        {/* Início */}
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-stone-400 font-light block mb-1">Início</span>
            <span className="flex items-center gap-1 text-stone-400 text-sm font-light">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restaurant</span>
              Primeira refeição
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustStart(-30)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span
              className="text-2xl text-stone-800 w-16 text-center tabular-nums"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {toTime(startMins)}
            </span>
            <button
              onClick={() => adjustStart(30)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>

        {/* Fim */}
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-stone-400 font-light block mb-1">Fim</span>
            <span className="flex items-center gap-1 text-stone-400 text-sm font-light">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>dark_mode</span>
              Última refeição
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustEnd(-30)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span
              className="text-2xl text-stone-800 w-16 text-center tabular-nums"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {toTime(endMins)}
            </span>
            <button
              onClick={() => adjustEnd(30)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default JanelaAlimentarStep;
