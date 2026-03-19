import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraPlanoPersonalizado: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-primary min-h-screen flex flex-col">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-[85%] transition-all duration-1000 ease-out"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20 w-full bg-stone-100/50">
        <div className="flex items-center gap-2">
          <button onClick={onBack}>
            <span className="material-symbols-outlined text-teal-900 text-2xl">close</span>
          </button>
        </div>
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-lexend tracking-tight font-medium">NURA</div>
        <div className="w-8"></div>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-grow pt-32 pb-40 px-6 max-w-5xl mx-auto w-full">
        {/* Header Editorial */}
        <header className="mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-lexend font-extrabold tracking-tight text-primary leading-tight">
            Seu caminho para <br />o equilíbrio está pronto.
          </h1>
          <p className="text-on-surface-variant text-lg max-w-xl font-light leading-relaxed">
            Desenhamos um plano de 90 dias baseado no seu perfil. Uma jornada gradual para transformar sua rotina em um ritual de bem-estar.
          </p>
        </header>

        {/* Bento Grid Layout for Phases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative">
          {/* Contextual Leaf Decoration (Absolute Position) */}
          <div className="absolute -right-20 top-40 opacity-20 pointer-events-none hidden lg:block">
            <span className="material-symbols-outlined text-[200px] text-secondary-container">eco</span>
          </div>
          {/* Phase 1 Card */}
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.04)] flex flex-col h-full border-b-4 border-tertiary-fixed transition-transform duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-8">
              <span className="text-tertiary font-headline font-bold text-sm tracking-widest uppercase">Fase 1</span>
              <span className="material-symbols-outlined text-tertiary text-4xl">energy_savings_leaf</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-primary mb-4">Adaptação</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
              Os primeiros 30 dias focam em identificar gatilhos e estabelecer micrometas sem pressão.
            </p>
            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
                <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Mapeamento de rotina
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
                <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Introdução ao Flow
              </div>
            </div>
          </div>

          <div className="bg-primary text-on-primary p-8 rounded-xl shadow-[0_24px_48px_rgba(0,70,79,0.15)] flex flex-col h-full md:scale-105 z-10 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-container rounded-full blur-3xl opacity-50"></div>
            <div className="flex justify-between items-start mb-8 relative z-20">
              <span className="text-primary-fixed font-headline font-bold text-sm tracking-widest uppercase">Fase 2</span>
              <span className="material-symbols-outlined text-primary-fixed text-4xl">auto_awesome</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-surface-container-lowest mb-4 relative z-20">Flow</h3>
            <p className="text-primary-fixed-dim text-sm leading-relaxed mb-8 relative z-20">
              Do dia 31 ao 60, intensificamos as práticas. Você começará a sentir a clareza mental e a consistência.
            </p>
            <div className="mt-auto space-y-3 relative z-20">
              <div className="flex items-center gap-3 text-xs text-on-primary font-medium">
                <span className="material-symbols-outlined text-secondary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Práticas avançadas
              </div>
              <div className="flex items-center gap-3 text-xs text-on-primary font-medium">
                <span className="material-symbols-outlined text-secondary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Otimização de sono
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.04)] flex flex-col h-full border-b-4 border-primary-fixed transition-transform duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-8">
              <span className="text-primary font-headline font-bold text-sm tracking-widest uppercase">Fase 3</span>
              <span className="material-symbols-outlined text-primary text-4xl">verified</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-primary mb-4">Consolidação</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
              Reta final. Transformação de hábitos em identidade. O bem-estar torna-se seu estado natural.
            </p>
            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
                <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Sustentabilidade
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
                <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Certificação NURA
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 bg-surface-container-low p-8 rounded-xl mb-8">
          <div className="space-y-2">
            <p className="text-xl font-body italic text-primary leading-snug">
              "O sucesso não vem da intensidade, mas da consistência. Este plano foi feito para você nunca mais precisar recomeçar."
            </p>
            <p className="text-sm font-headline font-bold text-tertiary">Dra. Helena Souza, Head de Neurociência NURA</p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <button onClick={onNext} className="bg-primary text-on-primary font-headline font-bold text-lg px-12 py-4 rounded-xl transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-95 w-full shadow-lg">
            Começar Agora
          </button>
          <p className="text-on-surface-variant text-xs font-medium tracking-wide">
            *Você pode ajustar seu ritmo a qualquer momento.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NuraPlanoPersonalizado;
