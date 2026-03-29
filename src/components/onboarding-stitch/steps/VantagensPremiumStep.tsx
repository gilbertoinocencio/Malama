import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const FEATURES = [
  {
    icon: 'psychology',
    title: 'Coach de IA Personalizado',
    desc: 'Orientação 24/7 ajustada ao seu ritmo e biotipo.',
    bg: 'bg-surface-container-lowest',
    iconBg: 'bg-tertiary-container',
    iconColor: 'text-on-tertiary-container',
    full: false,
  },
  {
    icon: 'photo_camera',
    title: 'Scan de Fotos para Macros',
    desc: 'Aponte a câmera, capture os nutrientes. Simples assim.',
    bg: 'bg-tertiary',
    iconBg: 'bg-tertiary-fixed-dim',
    iconColor: 'text-on-tertiary-fixed',
    textColor: 'text-on-tertiary',
    full: false,
  },
  {
    icon: 'restaurant_menu',
    title: 'Planos Alimentares Ilimitados',
    desc: 'Variedade gastronômica sem restrições de acesso.',
    bg: 'bg-surface-container-low',
    iconBg: 'bg-secondary-container',
    iconColor: 'text-on-secondary-container',
    full: true,
  },
  {
    icon: 'sync_saved_locally',
    title: 'Integrações Premium',
    desc: 'Sincronia perfeita com Apple Health, Google Fit e dispositivos wearable.',
    bg: 'bg-surface-container-highest',
    iconBg: 'bg-white shadow-sm',
    iconColor: 'text-tertiary',
    full: true,
  },
];

const VantagensPremiumStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Ver planos disponíveis"
      secondaryLabel="Agora não"
    >
      {/* Decorative leaves */}

      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-12">
          <p className="font-headline font-semibold text-tertiary mb-2 tracking-widest uppercase text-xs">
            Passo {currentStep} de {totalSteps}
          </p>
          <h2 className="font-headline font-bold text-4xl text-on-surface leading-tight tracking-tight">
            Eleve sua jornada <br />ao nível <span className="text-tertiary">Premium.</span>
          </h2>
          <p className="font-body text-on-surface-variant mt-4 text-lg">
            Desbloqueie ferramentas exclusivas desenhadas para acelerar seus resultados com serenidade.
          </p>
        </header>

        {/* Features Bento Grid */}
        <div className="grid grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`${f.bg} p-8 rounded-lg flex flex-col justify-between min-h-[200px] transition-all duration-300 hover:scale-[1.02] ${f.full ? 'col-span-2 flex-row items-center gap-6' : 'col-span-1'}`}
            >
              <div className={`h-12 w-12 ${f.iconBg} rounded-full flex items-center justify-center flex-shrink-0 ${f.full ? '' : 'mb-6'}`}>
                <span
                  className={`material-symbols-outlined ${f.iconColor}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
              </div>
              <div>
                <h3 className={`font-headline font-bold text-xl mb-2 ${f.textColor ?? 'text-tertiary'}`}>
                  {f.title}
                </h3>
                <p className={`font-body text-sm ${f.textColor ? 'opacity-80' : 'text-on-surface-variant'}`}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center font-body text-sm text-on-surface-variant opacity-60">
          Cancele quando quiser. Sem taxas ocultas.
        </p>
      </div>
    </StepContainer>
  );
};

export default VantagensPremiumStep;
