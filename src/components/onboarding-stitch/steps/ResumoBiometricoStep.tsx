import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const ResumoBiometricoStep: React.FC<StepProps> = ({ data, onNext, onBack, currentStep, totalSteps }) => {
  // Height in cm, weight in kg
  const height = data.height || 178;
  const weight = data.weight || 71.0;

  // BMI calculation
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  const bmiFormatted = bmi.toFixed(1);

  // Gauge calculation (Normal range is 18.5 - 24.9)
  // We'll map BMI to a stroke-dashoffset.
  // Full circle (r=88) is 552.9.
  // Roughly map 15-35 range to 0-100% of the gauge.
  const percentage = Math.min(Math.max((bmi - 15) / (35 - 15), 0), 1);
  const dashoffset = 552.9 * (1 - percentage);

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
      nextLabel="Continuar para Metas"
    >
      <header className="mb-12 text-center md:text-left">
        <h2 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight mb-4">
          Seu Perfil Biométrico
        </h2>
        <p className="text-on-surface-variant text-lg leading-relaxed font-body">
          Analisamos seus dados para criar um ponto de partida preciso. Este é o alicerce da sua jornada personalizada.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container-highest" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="8"></circle>
                <circle 
                  className="text-secondary" 
                  cx="96" 
                  cy="96" 
                  fill="transparent" 
                  r="88" 
                  stroke="currentColor" 
                  strokeDasharray="552.9" 
                  strokeDashoffset={dashoffset} 
                  strokeLinecap="round" 
                  strokeWidth="12"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline text-5xl font-extrabold text-primary">{bmiFormatted}</span>
                <span className="text-sm font-medium uppercase tracking-widest text-on-surface-variant">IMC</span>
              </div>
            </div>
            <div className="text-center">
              <span className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container text-sm font-bold rounded-full mb-2">
                {bmi < 18.5 ? 'Abaixo do Peso' : bmi < 25 ? 'Peso Saudável' : bmi < 30 ? 'Sobrepeso' : 'Obesidade'}
              </span>
              <p className="text-on-surface-variant text-sm max-w-[280px] leading-snug">
                {bmi < 25 ? 'Seu índice está dentro da zona ideal para sua altura e idade.' : 'Seu índice indica que podemos otimizar sua composição corporal.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-surface-container">
          <div className="mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">straighten</span>
          </div>
          <div>
            <span className="text-on-surface-variant text-sm block mb-1">Altura</span>
            <h3 className="font-headline text-2xl font-bold text-primary">{Math.round(height)} <span className="text-base font-normal">cm</span></h3>
          </div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-surface-container">
          <div className="mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">monitor_weight</span>
          </div>
          <div>
            <span className="text-on-surface-variant text-sm block mb-1">Peso Atual</span>
            <h3 className="font-headline text-2xl font-bold text-primary">{weight.toFixed(1)} <span className="text-base font-normal">kg</span></h3>
          </div>
        </div>

        <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-surface-container-highest">
          <div className="flex justify-between items-end mb-4">
            <h4 className="font-headline font-semibold text-primary">Escala de Composição</h4>
            <span className="text-xs text-on-surface-variant font-medium">18.5 — 24.9 Normal</span>
          </div>
          <div className="h-2 w-full bg-surface-container-highest rounded-full flex overflow-hidden">
            <div className="h-full bg-amber-200 w-[15%]"></div>
            <div className="h-full bg-secondary w-[35%] relative">
              <div 
                className="absolute top-0 w-0.5 h-full bg-white/80 shadow-sm transition-all duration-500" 
                style={{ left: `${percentage * 100}%` }}
              ></div>
            </div>
            <div className="h-full bg-amber-400 w-[25%]"></div>
            <div className="h-full bg-red-400 w-[25%]"></div>
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
            <span>Abaixo</span>
            <span>Normal</span>
            <span>Sobrepeso</span>
            <span>Obesidade</span>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default ResumoBiometricoStep;
