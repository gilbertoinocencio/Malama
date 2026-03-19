import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraEducaOJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all active:scale-95">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full flex flex-col">
        <section className="mt-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-primary leading-tight tracking-tight mb-6">
            O que é o Jejum Intermitente?
          </h2>
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-prose">
            Uma pausa consciente na alimentação para recalibrar o seu metabolismo.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-secondary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-48 h-48 md:w-56 md:h-56 relative flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-dashed border-outline-variant/30 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
                <div className="w-full h-full rounded-full border-[10px] border-surface-container-highest flex items-center justify-center overflow-hidden relative">
                  <div className="w-full h-1/2 bg-tertiary-fixed absolute top-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary text-4xl">light_mode</span>
                  </div>
                  <div className="w-full h-1/2 bg-primary absolute bottom-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-fixed text-4xl">dark_mode</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold font-headline text-primary mb-3">Ciclo Circadiano</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                  Seu corpo possui um relógio interno natural. O jejum alinha sua nutrição a este ritmo, otimizando a queima de gordura e a reparação celular durante o descanso.
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-secondary-container/30 text-secondary text-xs font-semibold rounded-full">Metabolismo</span>
                  <span className="px-3 py-1 bg-tertiary-fixed/30 text-tertiary text-xs font-semibold rounded-full">Equilíbrio</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl hover:bg-surface-container transition-colors duration-500">
            <span className="material-symbols-outlined text-secondary text-4xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
            <h3 className="text-lg font-bold font-headline text-primary mb-2">Nutrição Consciente</h3>
            <p className="text-sm text-on-surface-variant">Qualidade sobre quantidade. A janela de alimentação é o momento de nutrir cada célula com intenção.</p>
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl hover:bg-surface-container transition-colors duration-500">
            <span className="material-symbols-outlined text-tertiary text-4xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>energy_savings_leaf</span>
            <h3 className="text-lg font-bold font-headline text-primary mb-2">Pausa Metabólica</h3>
            <p className="text-sm text-on-surface-variant">Dê ao seu sistema digestivo o descanso necessário para focar na renovação e longevidade.</p>
          </div>
        </div>

        <div className="mt-auto pt-8 flex flex-col gap-4">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary rounded-xl font-headline font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group">
            Entendi, continuar jornada
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default NuraEducaOJejum;
