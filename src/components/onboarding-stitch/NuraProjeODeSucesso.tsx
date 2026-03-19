import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraProjeODeSucesso: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <span className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</span>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-10">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-primary leading-tight tracking-tight mb-4">
            Sua Projeção de Sucesso
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Baseado no seu perfil metabólico, desenhamos o caminho para sua transformação nos próximos 3 meses.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_16px_32px_rgba(0,0,0,0.02)] border border-outline-variant/10 relative overflow-hidden">
            <div className="flex justify-between items-end mb-12">
              <div>
                <p className="text-sm font-body uppercase tracking-widest text-on-surface-variant mb-1">Meta Estimada</p>
                <p className="text-4xl font-headline font-bold text-secondary">-8.5kg</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-body text-on-surface-variant">Data Alvo</p>
                <p className="text-xl font-headline font-medium text-primary">12 Semanas</p>
              </div>
            </div>

            <div className="relative h-48 w-full mt-8">
              <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 400 150">
                <line stroke="#e2e3df" strokeDasharray="4" x1="0" x2="400" y1="20" y2="20"></line>
                <line stroke="#e2e3df" strokeDasharray="4" x1="0" x2="400" y1="60" y2="60"></line>
                <line stroke="#e2e3df" strokeDasharray="4" x1="0" x2="400" y1="100" y2="100"></line>
                <defs>
                  <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#006d36" stopOpacity="0.15"></stop>
                    <stop offset="100%" stopColor="#006d36" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0,20 L50,25 L100,45 L150,55 L200,80 L250,90 L300,115 L350,125 L400,140 L400,150 L0,150 Z" fill="url(#chartGradient)"></path>
                <path d="M0,20 L50,25 L100,45 L150,55 L200,80 L250,90 L300,115 L350,125 L400,140" fill="none" stroke="#006d36" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
                <circle className="fill-secondary shadow-lg" cx="400" cy="140" r="6"></circle>
                <circle className="fill-secondary/20 animate-pulse" cx="400" cy="140" r="12"></circle>
              </svg>
              <div className="flex justify-between mt-4 text-[10px] font-body text-stone-400 uppercase tracking-tighter">
                <span>Hoje</span>
                <span>Semana 4</span>
                <span>Semana 8</span>
                <span>Semana 12</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-6 rounded-xl flex flex-col gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <p className="text-xs font-body text-on-surface-variant">Metabolismo</p>
              <p className="text-xl font-headline font-semibold text-primary">+14% Eficiência</p>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl flex flex-col gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              <p className="text-xs font-body text-on-surface-variant">Saúde Celular</p>
              <p className="text-xl font-headline font-semibold text-primary">Nível Ótimo</p>
            </div>
          </div>

          <div className="flex items-center gap-6 p-6 bg-primary-container/10 rounded-xl border border-primary-container/20">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-fixed text-3xl">auto_awesome</span>
            </div>
            <div>
              <h4 className="font-headline font-bold text-primary">Seu "Novo Eu" em 90 dias</h4>
              <p className="text-sm text-on-surface-variant">72% dos usuários NURA alcançam a meta projetada mantendo a consistência sugerida.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 bg-primary hover:bg-primary-container text-on-primary font-headline font-bold text-lg rounded-xl transition-all active:scale-95 shadow-xl shadow-primary/10 flex items-center justify-center gap-2 group">
            Continuar
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          <p className="text-center mt-4 text-xs font-body text-stone-400">
            Dados baseados em modelos científicos de termogênese aplicada.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NuraProjeODeSucesso;
