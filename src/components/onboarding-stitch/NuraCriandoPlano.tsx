import React, { useEffect, useState } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraCriandoPlano: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 64) {
          clearInterval(interval);
          setTimeout(() => onNext(), 2000);
          return 64;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [onNext]);

  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden min-h-screen flex flex-col">
      {/* Progress Bar (Sutil Flow) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-4/5"></div>
      </div>

      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-20 w-full bg-stone-50/70 backdrop-blur-xl">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-lexend">NURA</div>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-stone-200/50 transition-all">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden">
        {/* Contextual Leaf (Decorative) */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-20 w-[30rem] h-[30rem] bg-primary-fixed-dim opacity-10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* AI Core Visual */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-16">
          {/* Animated Ambient Rings */}
          <div className="absolute inset-0 border-[0.5px] border-secondary/20 rounded-full scale-110"></div>
          <div className="absolute inset-0 border-[1px] border-secondary/10 rounded-full scale-[1.25]"></div>

          {/* Central Processing Orb */}
          <div className="relative z-10 w-48 h-48 rounded-full bg-surface-container-lowest shadow-[0_0_60px_rgba(0,109,54,0.1)] flex items-center justify-center group overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(131, 251, 165, 0.15) 0%, rgba(249, 250, 246, 0) 70%)'
              }}
            ></div>
            <div className="relative z-20 flex flex-col items-center">
              <span className="material-symbols-outlined text-secondary text-5xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-secondary/40 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-secondary/20 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            {/* Micro-grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(circle, #00464f 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }}
            ></div>
          </div>

          {/* Asymmetric Data Nodes */}
          <div className="absolute top-0 right-4 p-3 bg-surface-container-lowest rounded-2xl shadow-sm border border-secondary/5 flex items-center gap-3 backdrop-blur-md">
            <span className="material-symbols-outlined text-secondary text-lg">monitor_heart</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">BIOMETRIC_DATA</span>
          </div>
          <div className="absolute bottom-8 -left-8 p-3 bg-surface-container-lowest rounded-2xl shadow-sm border border-secondary/5 flex items-center gap-3 backdrop-blur-md">
            <span className="material-symbols-outlined text-secondary text-lg">restaurant</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">MACRO_SYNC</span>
          </div>
        </div>

        {/* Editorial Content */}
        <div className="text-center max-w-md z-20">
          <h1 className="font-lexend text-4xl md:text-5xl font-medium tracking-tight text-primary mb-6">
            Criando seu <span className="text-secondary italic">Flow</span> único...
          </h1>

          {/* Processing Messages Container */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-on-surface-variant group">
              <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="font-body text-lg font-light tracking-tight">Analisando biometria</p>
            </div>
            <div className="flex items-center justify-center gap-3 text-primary">
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
              </div>
              <p className="font-body text-lg font-medium tracking-tight">Otimizando macros</p>
            </div>
            <div className="flex items-center justify-center gap-3 text-stone-400 opacity-60">
              <span className="material-symbols-outlined text-xl">circle</span>
              <p className="font-body text-lg font-light tracking-tight">Sincronizando com seu ritmo</p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-20 w-full max-w-xs h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary rounded-full shadow-[0_0_8px_rgba(0,109,54,0.3)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="mt-4 text-outline text-xs tracking-widest font-bold uppercase font-label">Processando Algoritmo v2.4</p>
      </main>

      {/* Decorative Corner Element */}
      <div className="fixed bottom-0 right-0 p-12 pointer-events-none opacity-20">
        <span className="material-symbols-outlined text-[12rem] text-secondary rotate-12">eco</span>
      </div>
    </div>
  );
};

export default NuraCriandoPlano;
