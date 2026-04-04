import React, { useState } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const fmt = (n: number) => String(n).padStart(2, '0');

const TimeControl: React.FC<{
  label: string;
  caption: string;
  hour: number;
  minute: number;
  isActive?: boolean;
  onHourChange: (delta: number) => void;
  onMinuteChange: (delta: number) => void;
}> = ({ label, caption, hour, minute, isActive, onHourChange, onMinuteChange }) => (
  <div className={`p-8 rounded-lg border-2 transition-all duration-300 ${isActive ? 'bg-surface-container-lowest border-primary-fixed-dim shadow-md' : 'bg-surface-container-low border-transparent'}`}>
    <div className="flex justify-between items-start mb-6">
      <p className="font-headline text-primary-container font-semibold uppercase text-xs tracking-widest">{label}</p>
      {isActive && (
        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      )}
    </div>

    <div className="flex items-end gap-2">
      {/* Hour */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onHourChange(1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-high transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">expand_less</span>
        </button>
        <span className="font-headline text-6xl text-primary tracking-tighter w-[2.5ch] text-center">{fmt(hour)}</span>
        <button
          onClick={() => onHourChange(-1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-high transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">expand_more</span>
        </button>
      </div>

      <span className="font-headline text-4xl text-outline-variant mb-2">:</span>

      {/* Minute */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onMinuteChange(15)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-high transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">expand_less</span>
        </button>
        <span className="font-headline text-6xl text-primary tracking-tighter w-[2.5ch] text-center">{fmt(minute)}</span>
        <button
          onClick={() => onMinuteChange(-15)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-high transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">expand_more</span>
        </button>
      </div>
    </div>

    <div className={`mt-6 h-0.5 w-full transition-all duration-500 ${isActive ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
    <p className="mt-3 text-on-surface-variant text-sm font-light">{caption}</p>
  </div>
);

const LembretesRotinaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const schedule = data.reminderSchedule || '08:30 - 20:00';
  const [rawStart, rawEnd] = schedule.split(' - ');

  const [startHour, setStartHour] = useState(parseInt(rawStart.split(':')[0]));
  const [startMin, setStartMin]   = useState(parseInt(rawStart.split(':')[1]));
  const [endHour, setEndHour]     = useState(parseInt(rawEnd.split(':')[0]));
  const [endMin, setEndMin]       = useState(parseInt(rawEnd.split(':')[1]));

  const changeHour = (setter: React.Dispatch<React.SetStateAction<number>>) => (delta: number) => {
    setter((prev: number) => (prev + delta + 24) % 24);
  };

  const changeMinute = (setter: React.Dispatch<React.SetStateAction<number>>) => (delta: number) => {
    setter((prev: number) => (prev + delta + 60) % 60);
  };

  const windowHours = ((endHour * 60 + endMin) - (startHour * 60 + startMin) + 1440) % 1440 / 60;

  const handleSave = () => {
    updateData({
      reminderSchedule: `${fmt(startHour)}:${fmt(startMin)} - ${fmt(endHour)}:${fmt(endMin)}`,
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


      <div className="w-full max-w-xl space-y-10 relative z-10">
        <div className="space-y-4">
          <h2 className="font-headline text-on-surface-variant text-sm font-medium tracking-[0.2em] uppercase">Mantenha o seu Flow</h2>
          <h1 className="font-headline text-4xl md:text-5xl text-primary font-bold tracking-tight leading-tight">
            Quando quer ser lembrado das suas refeições?
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TimeControl
            label="Início da Janela"
            caption="Primeiro alerta do dia"
            hour={startHour}
            minute={startMin}
            onHourChange={changeHour(setStartHour)}
            onMinuteChange={changeMinute(setStartMin)}
          />
          <TimeControl
            label="Fim da Janela"
            caption="Último alerta do dia"
            hour={endHour}
            minute={endMin}
            isActive
            onHourChange={changeHour(setEndHour)}
            onMinuteChange={changeMinute(setEndMin)}
          />
        </div>

        {/* Window duration */}
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="material-symbols-outlined text-secondary">schedule</span>
          <span className="font-headline font-semibold text-primary">
            Janela de <span className="text-secondary">{windowHours.toFixed(1).replace('.0', '')}h</span>
          </span>
        </div>

        <div className="flex items-start gap-4 p-6 bg-surface-container/50 rounded-xl border border-surface-container-highest">
          <span className="material-symbols-outlined text-primary mt-1">info</span>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Sugerimos uma janela de 12 horas para manter o equilíbrio metabólico e a clareza mental durante o dia.
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default LembretesRotinaStep;
