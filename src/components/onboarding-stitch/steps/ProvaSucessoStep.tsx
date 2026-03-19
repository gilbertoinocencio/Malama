import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const ProvaSucessoStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  return (
    <StepContainer
      currentStep={18}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="fixed -top-10 -right-10 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[20rem] text-secondary-container" style={{ fontVariationSettings: "'FILL' 0" }}>eco</span>
      </div>

      <div className="w-full text-center space-y-4 mb-10 relative z-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-medium text-sm tracking-wide mb-2">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          PERFIL ANALISADO
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-primary tracking-tight leading-tight">
          Tudo pronto para sua jornada.
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
          Seu plano personalizado foi gerado com base em seus objetivos e biotipo.
        </p>
      </div>

      <div className="w-full grid grid-cols-1 gap-6 relative z-10">
        <div className="relative bg-secondary p-10 md:p-12 rounded-xl shadow-xl overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-45">
            <span className="material-symbols-outlined text-[12rem]">trending_up</span>
          </div>
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2 shadow-inner border border-white/20">
              <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            </div>
            <h2 className="text-white font-headline text-2xl md:text-3xl font-bold leading-snug">
              87% das pessoas com o seu perfil atingem a meta seguindo o plano NURA.
            </h2>
            <div className="h-px w-24 bg-white/30"></div>
            <p className="text-secondary-fixed font-medium tracking-wide text-sm uppercase">
              Selo de Confiança NURA Science
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container border border-surface-container-highest">
            <div className="p-3 bg-primary/5 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-primary">bolt</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-primary mb-1">Início Imediato</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Seu primeiro passo começa agora com uma rotina adaptada.</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container border border-surface-container-highest">
            <div className="p-3 bg-secondary/5 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-secondary">auto_graph</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-secondary mb-1">Acompanhamento</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Métricas em tempo real para garantir que você esteja no plano.</p>
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProvaSucessoStep;
