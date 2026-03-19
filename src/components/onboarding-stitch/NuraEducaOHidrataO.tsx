import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraEducaOHidrataO: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <nav className="shrink-0 w-full h-1 z-20 flex">
        <div className="h-full bg-secondary w-3/4 transition-all duration-700"></div>
        <div className="h-full bg-surface-container-high flex-1"></div>
      </nav>

      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-200/50 transition-all active:scale-95">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <span className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</span>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            O Poder da Hidratação
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Água é o combustível silencioso do seu metabolismo. Cada gole faz diferença.
          </p>
        </section>

        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_16px_32px_rgba(0,0,0,0.04)] mb-8">
          <div className="relative h-48 w-full flex items-end gap-2 px-2">
            <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-10 pointer-events-none">
              <div className="border-t border-primary w-full"></div>
              <div className="border-t border-primary w-full"></div>
              <div className="border-t border-primary w-full"></div>
            </div>
            <div className="flex-1 bg-surface-container-high h-[30%] rounded-t-lg transition-all duration-500 hover:bg-primary-fixed-dim"></div>
            <div className="flex-1 bg-surface-container-high h-[42%] rounded-t-lg transition-all duration-500 hover:bg-primary-fixed-dim"></div>
            <div className="flex-1 bg-surface-container-high h-[55%] rounded-t-lg transition-all duration-500 hover:bg-primary-fixed-dim"></div>
            <div className="flex-1 bg-primary-container h-[72%] rounded-t-lg transition-all duration-500"></div>
            <div className="flex-1 bg-secondary h-[95%] rounded-t-lg transition-all duration-700 relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] px-2 py-1 rounded font-bold">PICO</div>
            </div>
          </div>
          <div className="mt-6 flex justify-between text-[10px] font-bold text-outline uppercase tracking-widest border-t border-surface-container-highest pt-4">
            <span>Desidratado</span>
            <span>Hidratado</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            </div>
            <div>
              <span className="text-xs font-bold text-outline uppercase tracking-widest block mb-1">Volume Ideal</span>
              <h4 className="text-2xl font-bold text-primary font-headline">500ml</h4>
              <p className="text-xs text-on-surface-variant mt-2">Ingestão matinal aumenta o metabolismo em 30% nos primeiros 60 min.</p>
            </div>
          </div>
        </div>

        <div className="bg-primary text-on-primary p-8 rounded-xl shadow-2xl relative overflow-hidden mb-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-secondary flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-3xl">bolt</span>
            </div>
            <div>
              <h3 className="text-2xl font-headline font-bold mb-2">Combustão Celular</h3>
              <p className="text-on-primary-container opacity-90 leading-relaxed">
                A água é essencial para a <span className="text-secondary-fixed-dim font-bold">lipólise</span> — o processo metabólico de queima de gordura.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button onClick={onNext} className="w-full md:w-auto min-w-[300px] h-16 bg-primary text-on-primary rounded-xl font-headline font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 px-12 group">
            Entendi
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
          </button>
          <p className="mt-6 text-on-surface-variant text-sm font-medium">Próximo: Definindo sua meta diária personalizada</p>
        </div>
      </main>
    </div>
  );
};

export default NuraEducaOHidrataO;
