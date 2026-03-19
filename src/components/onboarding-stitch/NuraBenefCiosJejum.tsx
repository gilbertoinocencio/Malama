import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraBenefCiosJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all active:scale-95">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-full mb-12 text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline mb-6 leading-tight tracking-tight">
            O Poder do Jejum
          </h1>
          <p className="text-lg text-on-surface-variant font-light leading-relaxed max-w-md">
            Sua biologia está prestes a entrar em um estado de restauração profunda. Veja o que acontece com você.
          </p>
        </div>

        <div className="w-full space-y-6">
          <div className="group bg-surface-container-lowest p-8 rounded-xl transition-all duration-500 hover:bg-surface-container-low flex items-start gap-8 shadow-[0_16px_32px_rgba(0,0,0,0.02)]">
            <div className="bg-secondary-container/30 p-4 rounded-xl text-secondary">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 0" }}>repeat</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">Autofagia</h3>
              <p className="text-on-surface-variant text-sm font-normal leading-relaxed">
                A reciclagem celular inteligente. Seu corpo identifica e remove componentes danificados, promovendo a renovação biológica.
              </p>
            </div>
          </div>

          <div className="group bg-surface-container-lowest p-8 rounded-xl transition-all duration-500 hover:bg-surface-container-low flex items-start gap-8 shadow-[0_16px_32px_rgba(0,0,0,0.02)]">
            <div className="bg-secondary-container/30 p-4 rounded-xl text-secondary">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 0" }}>local_fire_department</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">Queima de Gordura</h3>
              <p className="text-on-surface-variant text-sm font-normal leading-relaxed">
                A transição metabólica para a cetose. Sua reserva de gordura torna-se a principal fonte de energia limpa e constante.
              </p>
            </div>
          </div>

          <div className="group bg-surface-container-lowest p-8 rounded-xl transition-all duration-500 hover:bg-surface-container-low flex items-start gap-8 shadow-[0_16px_32px_rgba(0,0,0,0.02)]">
            <div className="bg-secondary-container/30 p-4 rounded-xl text-secondary">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 0" }}>psychology</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">Clareza Mental</h3>
              <p className="text-on-surface-variant text-sm font-normal leading-relaxed">
                Redução da névoa cerebral. O aumento do BDNF protege seus neurônios e potencializa seu foco e desempenho cognitivo.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-8 bg-surface/90 backdrop-blur-md z-10">
        <button onClick={onNext} className="w-full h-16 px-12 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
          Continuar Jornada
        </button>
        <p className="text-center mt-4 text-on-surface-variant text-xs font-medium tracking-widest uppercase">Fase 02 · Benefícios</p>
      </footer>
    </div>
  );
};

export default NuraBenefCiosJejum;
