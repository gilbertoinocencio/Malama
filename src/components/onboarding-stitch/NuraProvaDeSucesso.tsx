import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraProvaDeSucesso: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="min-h-screen text-on-surface flex flex-col" style={{
      backgroundColor: '#f9faf6',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(131, 251, 165, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(167, 238, 252, 0.1) 0px, transparent 50%)'
    }}>
      {/* Top Navigation Shell - Transactional State: Minimal */}
      <header className="fixed top-0 w-full z-50 bg-stone-50/70 backdrop-blur-xl bg-stone-100/50 flex items-center justify-between px-8 h-20">
        <span className="text-2xl font-bold tracking-tighter text-teal-900 font-lexend">NURA</span>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all duration-300 rounded-full flex items-center justify-center scale-95 duration-300">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      {/* Progress Indicator - Sutil Flow */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-full transition-all duration-1000 ease-out"></div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
        {/* Contextual Leaf Decoration */}
        <div className="fixed -top-10 -right-10 opacity-20 pointer-events-none">
          <span className="material-symbols-outlined text-[20rem] text-secondary-container">eco</span>
        </div>

        {/* Hero Section */}
        <div className="w-full text-center space-y-4 mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-medium text-sm tracking-wide mb-2">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            PERFIL ANALISADO
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold font-lexend text-primary tracking-tight leading-tight">
            Tudo pronto para sua jornada.
          </h1>
          <p className="text-on-surface-variant text-lg max-w-md mx-auto">
            Seu plano personalizado foi gerado com base em seus objetivos e biotipo.
          </p>
        </div>

        {/* Main Content: Goal Success Bento Card */}
        <div className="w-full grid grid-cols-1 gap-6">
          {/* Success Highlight Card */}
          <div className="relative bg-secondary p-10 md:p-12 rounded-xl shadow-[0_16px_32px_rgba(0,109,54,0.12)] overflow-hidden group">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-45">
              <span className="material-symbols-outlined text-[12rem]">trending_up</span>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>
              <h2 className="text-white font-lexend text-2xl md:text-3xl font-bold leading-snug">
                87% das pessoas com o seu perfil atingem a meta seguindo o plano NURA.
              </h2>
              <div className="h-px w-24 bg-white/30"></div>
              <p className="text-secondary-fixed font-medium tracking-wide text-sm uppercase">
                Selo de Confiança NURA Science
              </p>
            </div>
          </div>

          {/* Supporting Info Cards (Asymmetric Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container">
              <div className="p-3 bg-primary/5 rounded-lg">
                <span className="material-symbols-outlined text-primary">bolt</span>
              </div>
              <div>
                <h3 className="font-lexend font-bold text-primary mb-1">Início Imediato</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Seu primeiro passo começa agora com uma rotina adaptada.</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container">
              <div className="p-3 bg-secondary/5 rounded-lg">
                <span className="material-symbols-outlined text-secondary">auto_graph</span>
              </div>
              <div>
                <h3 className="font-lexend font-bold text-secondary mb-1">Acompanhamento</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Métricas em tempo real para garantir que você esteja no plano.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <footer className="mt-12 w-full max-w-sm mx-auto space-y-4">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary font-lexend font-bold text-lg rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl active:scale-95">
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <p className="text-center text-xs text-on-surface-variant/60 font-medium">
            Ao continuar, você concorda com nossos Termos de Jornada.
          </p>
        </footer>
      </main>

      {/* Contextual Leaf (Bottom) */}
      <div className="fixed bottom-0 -left-16 opacity-10 pointer-events-none rotate-180">
        <span className="material-symbols-outlined text-[15rem] text-primary-fixed-dim">nest_eco_leaf</span>
      </div>
    </div>
  );
};

export default NuraProvaDeSucesso;
