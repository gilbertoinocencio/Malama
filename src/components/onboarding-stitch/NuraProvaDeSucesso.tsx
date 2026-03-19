import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraProvaDeSucesso: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <span className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</span>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all duration-300 rounded-full">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="text-center mb-12 space-y-4">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight">
            Prova de Sucesso
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md mx-auto">
            Milhares de pessoas transformaram suas vidas com o método NURA. Você será o próximo.
          </p>
        </section>

        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.04)] mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/10 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>trending_down</span>
            </div>
            <div>
              <p className="text-4xl font-headline font-extrabold text-secondary">92%</p>
              <p className="text-on-surface-variant text-sm">dos usuários atingem sua meta</p>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Nosso método baseado em ciência e IA entrega resultados reais e mensuráveis nos primeiros 30 dias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container">
            <div className="p-3 bg-primary/5 rounded-lg">
              <span className="material-symbols-outlined text-primary">bolt</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-primary mb-1">Início Imediato</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Seu primeiro passo começa agora com uma rotina adaptada.</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container">
            <div className="p-3 bg-secondary/5 rounded-lg">
              <span className="material-symbols-outlined text-secondary">auto_graph</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-secondary mb-1">Acompanhamento</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Métricas em tempo real para garantir que você esteja no plano.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-sm mx-auto space-y-4">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary font-headline font-bold text-lg rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl active:scale-95">
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraProvaDeSucesso;
