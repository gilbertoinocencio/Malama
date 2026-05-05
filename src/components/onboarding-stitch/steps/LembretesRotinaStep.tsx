import React, { useState } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const fmt = (n: number) => String(n).padStart(2, '0');

interface TimeCardProps {
  label: string;
  caption: string;
  icon: string;
  hour: number;
  minute: number;
  onHourChange: (delta: number) => void;
  onMinuteChange: (delta: number) => void;
}

const TimeCard: React.FC<TimeCardProps> = ({ label, caption, icon, hour, minute, onHourChange, onMinuteChange }) => (
  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-stone-400 text-lg">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light">{label}</p>
        <p className="text-stone-500 text-xs font-light">{caption}</p>
      </div>
    </div>

    <div className="flex items-center justify-center gap-3">
      {/* Hour */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onHourChange(1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_less</span>
        </button>
        <span className="text-4xl text-stone-800 w-12 text-center tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
          {fmt(hour)}
        </span>
        <button
          onClick={() => onHourChange(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
      </div>

      <span className="text-3xl text-stone-300 font-light mb-1">:</span>

      {/* Minute */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onMinuteChange(15)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_less</span>
        </button>
        <span className="text-4xl text-stone-800 w-12 text-center tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
          {fmt(minute)}
        </span>
        <button
          onClick={() => onMinuteChange(-15)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
      </div>
    </div>
  </div>
);

const LembretesRotinaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const schedule = data.reminderSchedule || data.eatingWindowStart
    ? `${data.eatingWindowStart || '08:00'} - ${data.eatingWindowEnd || '20:00'}`
    : '08:00 - 20:00';

  const [rawStart, rawEnd] = schedule.split(' - ');

  const [startHour, setStartHour] = useState(parseInt(rawStart?.split(':')[0] || '8'));
  const [startMin, setStartMin]   = useState(parseInt(rawStart?.split(':')[1] || '0'));
  const [endHour, setEndHour]     = useState(parseInt(rawEnd?.split(':')[0] || '20'));
  const [endMin, setEndMin]       = useState(parseInt(rawEnd?.split(':')[1] || '0'));

  const changeHour = (setter: React.Dispatch<React.SetStateAction<number>>) => (delta: number) => {
    setter((prev: number) => (prev + delta + 24) % 24);
  };

  const changeMinute = (setter: React.Dispatch<React.SetStateAction<number>>) => (delta: number) => {
    setter((prev: number) => (prev + delta + 60) % 60);
  };

  const windowMins = ((endHour * 60 + endMin) - (startHour * 60 + startMin) + 1440) % 1440;
  const windowH = Math.floor(windowMins / 60);
  const windowM = windowMins % 60;

  const handleSave = () => {
    const start = `${fmt(startHour)}:${fmt(startMin)}`;
    const end = `${fmt(endHour)}:${fmt(endMin)}`;
    updateData({
      reminderSchedule: `${start} - ${end}`,
      eatingWindowStart: start,
      eatingWindowEnd: end,
    });
    onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleSave}
      onBack={onBack}
      nextLabel="Salvar e Continuar"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Lembretes de Rotina
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Quando quer ser lembrado das suas refeições?
        </p>
      </div>

      <div className="space-y-3 mb-4">
        <TimeCard
          label="Início da janela"
          caption="Primeiro alerta do dia"
          icon="wb_sunny"
          hour={startHour}
          minute={startMin}
          onHourChange={changeHour(setStartHour)}
          onMinuteChange={changeMinute(setStartMin)}
        />
        <TimeCard
          label="Fim da janela"
          caption="Último alerta do dia"
          icon="dark_mode"
          hour={endHour}
          minute={endMin}
          onHourChange={changeHour(setEndHour)}
          onMinuteChange={changeMinute(setEndMin)}
        />
      </div>

      {/* Duration badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="material-symbols-outlined text-stone-400 text-lg">schedule</span>
        <span className="text-stone-500 text-sm font-light">
          Janela de{' '}
          <span className="font-medium" style={{ color: PETROL }}>
            {windowH}h{windowM > 0 ? `${windowM}m` : ''}
          </span>
        </span>
      </div>

      {/* Info note */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">info</span>
        </div>
        <p className="text-sm font-light text-stone-500 leading-relaxed">
          Sugerimos uma janela de 12 horas para manter o equilíbrio metabólico e a clareza mental durante o dia.
        </p>
      </div>
    </StepContainer>
  );
};

export default LembretesRotinaStep;
