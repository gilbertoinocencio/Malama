import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const ProvaSucessoStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Tudo pronto para sua jornada.
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Seu plano personalizado foi gerado com base nos seus objetivos e biotipo.
        </p>
      </div>

      {/* Social proof card */}
      <div
        className="rounded-2xl p-8 flex flex-col items-center text-center mb-4"
        style={{ background: PETROL }}
      >
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-5 border border-white/20">
          <span
            className="material-symbols-outlined text-white text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            workspace_premium
          </span>
        </div>
        <p
          className="text-white text-2xl leading-snug mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          87% das pessoas com o seu perfil atingem a meta seguindo o plano Malama.
        </p>
        <div className="w-12 h-px bg-white/30 mb-3" />
        <p className="text-white/60 text-xs uppercase tracking-widest font-light">
          Selo Malama Science
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
            <span className="material-symbols-outlined text-stone-400 text-lg">bolt</span>
          </div>
          <div>
            <p className="text-stone-700 text-sm mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>Início Imediato</p>
            <p className="text-stone-400 text-sm font-light leading-snug">
              Seu primeiro passo começa agora com uma rotina adaptada ao seu ritmo.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
            <span className="material-symbols-outlined text-stone-400 text-lg">auto_graph</span>
          </div>
          <div>
            <p className="text-stone-700 text-sm mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>Acompanhamento em Tempo Real</p>
            <p className="text-stone-400 text-sm font-light leading-snug">
              Métricas precisas para garantir que você esteja sempre no caminho certo.
            </p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProvaSucessoStep;
