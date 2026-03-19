import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraEducaOJejum: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-2/3 transition-all duration-1000 ease-in-out"></div>
      </div>

      {/* TopAppBar */}
      <header className="bg-stone-50/70 dark:bg-stone-950/70 backdrop-blur-xl fixed top-0 w-full z-50 no-border tonal-shift bg-stone-100/50 dark:bg-stone-900/50 flat no shadows">
        <div className="flex items-center justify-between px-8 h-20 w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-teal-900 dark:text-teal-500 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all duration-300 ease-in-out p-2 rounded-full scale-95 duration-300"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full flex flex-col">
        {/* Hero Section */}
        <section className="mt-8 mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-extrabold font-lexend text-primary leading-tight tracking-tight mb-6">
            O que é o Jejum Intermitente?
          </h2>
          <p className="text-lg md:text-xl text-on-surface-variant font-body leading-relaxed max-w-prose">
            Uma pausa consciente na alimentação para recalibrar o seu metabolismo.
          </p>
        </section>

        {/* Visual Explanation: Circadian Cycle Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Circadian Rhythm Card */}
          <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group">
            {/* Background Decorative Leaf */}
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-secondary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-48 h-48 md:w-56 md:h-56 relative flex items-center justify-center">
                {/* Abstract Circadian Ring */}
                <div className="absolute inset-0 border-4 border-dashed border-outline-variant/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
                <div className="w-full h-full rounded-full border-[10px] border-surface-container-highest flex items-center justify-center overflow-hidden">
                  <div className="w-full h-1/2 bg-tertiary-fixed absolute top-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary text-4xl">light_mode</span>
                  </div>
                  <div className="w-full h-1/2 bg-primary absolute bottom-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-fixed text-4xl">dark_mode</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold font-lexend text-primary mb-3">Ciclo Circadiano</h3>
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

          {/* Nutrition Card */}
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between group hover:bg-surface-container transition-colors duration-500">
            <div>
              <span className="material-symbols-outlined text-secondary text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
              <h3 className="text-lg font-bold font-lexend text-primary mb-2">Nutrição Consciente</h3>
              <p className="text-sm text-on-surface-variant">Qualidade sobre quantidade. A janela de alimentação é o momento de nutrir cada célula com intenção.</p>
            </div>
          </div>

          {/* Metabolism Card */}
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between group hover:bg-surface-container transition-colors duration-500">
            <div>
              <span className="material-symbols-outlined text-tertiary text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>energy_savings_leaf</span>
              <h3 className="text-lg font-bold font-lexend text-primary mb-2">Pausa Metabólica</h3>
              <p className="text-sm text-on-surface-variant">Dê ao seu sistema digestivo o descanso necessário para focar na renovação e longevidade.</p>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="mt-auto pt-8 flex flex-col gap-4">
          <button
            onClick={onNext}
            className="w-full h-16 bg-primary text-on-primary rounded-xl font-lexend font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            Entendi, continuar jornada
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          <button className="w-full h-14 bg-transparent text-primary font-lexend font-medium text-sm hover:bg-surface-variant transition-colors duration-300 rounded-xl">
            Quero saber mais detalhes técnicos
          </button>
        </div>
      </main>

      {/* Dot Indicators */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
        <div className="w-8 h-2 rounded-full bg-secondary"></div>
        <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
        <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
      </div>

      {/* Background Decoration */}
      <div className="fixed top-1/4 -left-20 w-80 h-80 bg-secondary-container/10 blur-[100px] -z-10 rounded-full"></div>
      <div className="fixed bottom-1/4 -right-20 w-80 h-80 bg-tertiary-fixed/10 blur-[100px] -z-10 rounded-full"></div>
    </div>
  );
};

export default NuraEducaOJejum;
