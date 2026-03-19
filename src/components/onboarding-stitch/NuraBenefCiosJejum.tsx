import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraBenefCiosJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="text-on-surface antialiased">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-surface-container-high">
        <div className="h-full bg-secondary w-2/3 transition-all duration-1000 ease-in-out"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl flex items-center justify-between px-8 h-20 w-full">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend tracking-tight font-medium">
          NURA
        </div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all duration-300 ease-in-out rounded-full scale-95 duration-300">
          <span className="material-symbols-outlined text-teal-900 dark:text-teal-500">close</span>
        </button>
      </header>

      <main className="relative min-h-screen pt-32 pb-40 px-6 max-w-2xl mx-auto flex flex-col items-center">
        {/* Contextual Leaf Decoration */}
        <div className="fixed top-40 right-[10%] opacity-20 pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-secondary-container blur-[120px]"></div>
        </div>

        <div className="w-full mb-12 text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-6 leading-tight tracking-tighter">
            O Poder do Jejum
          </h1>
          <p className="text-lg text-on-surface-variant font-light leading-relaxed max-w-md">
            Sua biologia está prestes a entrar em um estado de restauração profunda. Veja o que acontece com você.
          </p>
        </div>

        <div className="w-full space-y-6">
          {/* Autofagia */}
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

          {/* Queima de Gordura */}
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

          {/* Clareza Mental */}
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

        {/* Decorative Element */}
        <div className="mt-16 w-full flex justify-end">
          <div className="w-16 h-16 rounded-full border border-secondary/20 flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-secondary text-lg">eco</span>
          </div>
        </div>
      </main>

      {/* Footer with Glass Effect */}
      <footer className="fixed bottom-0 left-0 w-full p-8 md:px-12 glass-effect z-50 flex flex-col md:flex-row items-center justify-between gap-6" style={{ backdropFilter: 'blur(20px)', background: 'rgba(255, 255, 255, 0.7)' }}>
        <div className="hidden md:block">
          <p className="text-on-surface-variant text-xs font-medium tracking-widest uppercase">Fase 02 • Benefícios</p>
        </div>
        <button
          onClick={onNext}
          className="w-full md:w-auto min-w-[280px] h-16 px-12 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-lg transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10"
        >
          Continuar Jornada
        </button>
      </footer>

      {/* Bottom Left Decoration */}
      <div className="fixed bottom-32 left-[5%] opacity-10 pointer-events-none rotate-12">
        <span className="material-symbols-outlined text-[120px] text-secondary">filter_vintage</span>
      </div>
    </div>
  );
};

export default NuraBenefCiosJejum;
