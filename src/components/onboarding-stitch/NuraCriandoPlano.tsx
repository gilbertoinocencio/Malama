import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraCriandoPlano: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Contextual Leaf (Decorative) */}
<div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
<div className="absolute -bottom-40 -left-20 w-[30rem] h-[30rem] bg-primary-fixed-dim opacity-10 rounded-full blur-[120px] pointer-events-none"></div>
{/* AI Core Visual */}
<div className="relative w-72 h-72 flex items-center justify-center mb-16">
{/* Animated Ambient Rings (CSS only concept) */}
<div className="absolute inset-0 border-[0.5px] border-secondary/20 rounded-full scale-110"></div>
<div className="absolute inset-0 border-[1px] border-secondary/10 rounded-full scale-[1.25]"></div>
{/* Central Processing Orb */}
<div className="relative z-10 w-48 h-48 rounded-full bg-surface-container-lowest shadow-[0_0_60px_rgba(0,109,54,0.1)] flex items-center justify-center group overflow-hidden">
<div className="ai-glow absolute inset-0"></div>
<div className="relative z-20 flex flex-col items-center">
<span className="material-symbols-outlined text-secondary text-5xl mb-2" data-icon="auto_awesome" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
<div className="flex gap-1.5">
<div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
<div className="w-1.5 h-1.5 rounded-full bg-secondary/40"></div>
<div className="w-1.5 h-1.5 rounded-full bg-secondary/20"></div>
</div>
</div>
{/* Micro-grid pattern overlay */}
<div className="absolute inset-0 opacity-[0.03]" style={{}}></div>
</div>
{/* Asymmetric Data Nodes */}
<div className="absolute top-0 right-4 p-3 bg-surface-container-lowest rounded-2xl shadow-sm border border-secondary/5 flex items-center gap-3 backdrop-blur-md">
<span className="material-symbols-outlined text-secondary text-lg" data-icon="monitor_heart">monitor_heart</span>
<span className="text-[10px] font-bold tracking-widest uppercase text-outline">BIOMETRIC_DATA</span>
</div>
<div className="absolute bottom-8 -left-8 p-3 bg-surface-container-lowest rounded-2xl shadow-sm border border-secondary/5 flex items-center gap-3 backdrop-blur-md">
<span className="material-symbols-outlined text-secondary text-lg" data-icon="restaurant">restaurant</span>
<span className="text-[10px] font-bold tracking-widest uppercase text-outline">MACRO_SYNC</span>
</div>
</div>
{/* Editorial Content */}
<div className="text-center max-w-md z-20">
<h1 className="font-headline text-4xl md:text-5xl font-medium tracking-tight text-primary mb-6">
                Criando seu <span className="text-secondary italic">Flow</span> único...
            </h1>
{/* Processing Messages Container */}
<div className="space-y-4">
<div className="flex items-center justify-center gap-3 text-on-surface-variant group">
<span className="material-symbols-outlined text-secondary text-xl" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
<p className="font-body text-lg font-light tracking-tight">Analisando biometria</p>
</div>
<div className="flex items-center justify-center gap-3 text-primary">
<div className="w-5 h-5 flex items-center justify-center">
<div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
</div>
<p className="font-body text-lg font-medium tracking-tight">Otimizando macros</p>
</div>
<div className="flex items-center justify-center gap-3 text-stone-400 opacity-60">
<span className="material-symbols-outlined text-xl" data-icon="circle">circle</span>
<p className="font-body text-lg font-light tracking-tight">Sincronizando com seu ritmo</p>
</div>
</div>
</div>
{/* Progress Indicator */}
<div className="mt-20 w-full max-w-xs h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-secondary w-[64%] rounded-full shadow-[0_0_8px_rgba(0,109,54,0.3)]"></div>
</div>
<p className="mt-4 text-outline text-xs tracking-widest font-bold uppercase font-label">Processando Algoritmo v2.4</p>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraCriandoPlano;
