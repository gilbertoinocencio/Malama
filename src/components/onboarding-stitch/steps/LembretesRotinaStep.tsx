import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const LembretesRotinaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const schedule = data.reminderSchedule || '08:30 - 20:00';
  const [start, end] = schedule.split(' - ');

  return (
    <StepContainer
      currentStep={19}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Salvar e Continuar"
    >
      <div className="fixed top-1/4 -right-20 opacity-20 pointer-events-none">
        <span className="material-symbols-outlined text-[20rem] text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
          eco
        </span>
      </div>

      <div className="w-full max-w-xl space-y-12 relative z-10">
        <div className="space-y-4">
          <h2 className="font-headline text-on-surface-variant text-sm font-medium tracking-[0.2em] uppercase">Mantenha o seu Flow</h2>
          <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight leading-tight">
            Quando quer ser lembrado das suas refeições?
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Window Card */}
          <div className="bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest transition-all duration-500 cursor-pointer border-2 border-transparent hover:border-primary-fixed-dim/30">
            <p className="font-headline text-primary-container font-semibold mb-6 uppercase text-xs tracking-widest">Início da Janela</p>
            <div className="flex items-end gap-2">
              <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{start.split(':')[0]}</span>
              <span className="font-headline text-4xl text-outline-variant mb-2">:</span>
              <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{start.split(':')[1]}</span>
            </div>
            <div className="mt-8 h-0.5 w-full bg-surface-container-highest group-hover:bg-primary transition-all duration-500"></div>
            <p className="mt-4 text-on-surface-variant text-sm font-light">Primeiro alerta do dia</p>
          </div>

          {/* End Window Card */}
          <div className="bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest transition-all duration-500 cursor-pointer border-2 border-primary-fixed-dim">
            <div className="flex justify-between items-start">
              <p className="font-headline text-primary-container font-semibold mb-6 uppercase text-xs tracking-widest">Fim da Janela</p>
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{end.split(':')[0]}</span>
              <span className="font-headline text-4xl text-outline-variant mb-2">:</span>
              <span className="font-headline text-6xl md:text-7xl text-primary tracking-tighter">{end.split(':')[1]}</span>
            </div>
            <div className="mt-8 h-0.5 w-full bg-primary transition-all duration-500"></div>
            <p className="mt-4 text-on-surface-variant text-sm font-light">Último alerta do dia</p>
          </div>
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
