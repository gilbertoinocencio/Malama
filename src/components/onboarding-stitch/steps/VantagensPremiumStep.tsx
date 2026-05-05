import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const FEATURES = [
  {
    icon: 'psychology',
    title: 'Coach de IA Personalizado',
    desc: 'Orientação 24/7 ajustada ao seu ritmo e biotipo.',
    featured: false,
  },
  {
    icon: 'photo_camera',
    title: 'Scan de Fotos para Macros',
    desc: 'Aponte a câmera, capture os nutrientes. Simples assim.',
    featured: true,
  },
  {
    icon: 'restaurant_menu',
    title: 'Planos Alimentares Ilimitados',
    desc: 'Variedade gastronômica sem restrições de acesso.',
    featured: false,
    wide: true,
  },
  {
    icon: 'sync_saved_locally',
    title: 'Integrações Premium',
    desc: 'Sincronia com Apple Health, Google Fit e dispositivos wearable.',
    featured: false,
    wide: true,
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
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Eleve sua jornada ao{' '}
          <span style={{ color: PETROL, fontStyle: 'italic' }}>Premium.</span>
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Ferramentas exclusivas desenhadas para acelerar seus resultados com serenidade.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`rounded-2xl border shadow-sm p-6 flex flex-col ${f.wide ? 'col-span-2 flex-row items-center gap-5' : 'col-span-1'}`}
            style={{
              background: f.featured ? PETROL : 'white',
              borderColor: f.featured ? PETROL : '#f5f5f4',
            }}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${f.wide ? '' : 'mb-4'}`}
              style={{ background: f.featured ? 'rgba(255,255,255,0.15)' : '#f5f5f4' }}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: f.featured ? 'white' : '#a8a29e' }}
              >
                {f.icon}
              </span>
            </div>
            <div>
              <p
                className="text-base mb-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: f.featured ? 'white' : '#292524',
                }}
              >
                {f.title}
              </p>
              <p
                className="text-sm font-light leading-snug"
                style={{ color: f.featured ? 'rgba(255,255,255,0.7)' : '#a8a29e' }}
              >
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-stone-400 text-xs font-light">
        Cancele quando quiser. Sem taxas ocultas.
      </p>
    </StepContainer>
  );
};

export default VantagensPremiumStep;
