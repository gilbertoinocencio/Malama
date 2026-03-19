import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraMetodologiaFlow: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Background Elements */}
<div className="contextual-leaf w-64 h-64 -top-20 -left-20"></div>
<div className="contextual-leaf w-96 h-96 top-1/2 -right-32"></div>
{/* Header Section */}
<header className="mb-16 space-y-6">
<h1 className="font-headline text-4xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight leading-tight">
                O que torna o <span className="text-secondary">NURA</span> diferente?
            </h1>
<p className="text-on-surface-variant text-xl md:text-2xl font-light max-w-2xl leading-relaxed">
                Nossa metodologia foi desenhada para quem busca harmonia, não restrição.
            </p>
</header>
{/* Bento-style Grid for Methodology Features */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
{/* Main Methodology Card */}
<div className="md:col-span-12 bg-surface-container-lowest p-8 md:p-12 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.02)] border border-outline-variant/10 relative overflow-hidden group">
<div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
<div className="flex-1">
<div className="inline-flex items-center gap-2 bg-secondary-container/30 text-secondary px-4 py-1 rounded-full text-sm font-semibold mb-4">
<span className="material-symbols-outlined text-sm" data-icon="auto_awesome">auto_awesome</span>
                            METODOLOGIA NURA FLOW
                        </div>
<h2 className="font-headline text-3xl text-primary font-semibold mb-4">Nutrição sem rigidez, disciplina sem culpa.</h2>
<p className="text-on-surface-variant text-lg leading-relaxed">
                            O Flow não é uma dieta, é um ritmo. Criamos um sistema que se adapta ao seu estilo de vida, permitindo progresso real sem a ansiedade dos métodos tradicionais.
                        </p>
</div>
<div className="flex-shrink-0 flex justify-center">
<div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-secondary/10 flex items-center justify-center relative">
<div className="absolute inset-0 border-t-4 border-secondary rounded-full animate-[spin_8s_linear_infinite]"></div>
<span className="material-symbols-outlined text-6xl text-secondary" data-icon="water_drop">water_drop</span>
</div>
</div>
</div>
</div>
{/* Asymmetric Secondary Cards */}
<div className="md:col-span-7 bg-primary-container text-on-primary-container p-8 rounded-xl flex flex-col justify-between min-h-[280px]">
<span className="material-symbols-outlined text-4xl" data-icon="psychology">psychology</span>
<div>
<h3 className="font-headline text-2xl font-medium mb-2">Foco no Bem-estar Mental</h3>
<p className="opacity-80 font-light">Eliminamos a obsessão calórica para focar na qualidade dos nutrientes e na sua relação com a comida.</p>
</div>
</div>
<div className="md:col-span-5 bg-surface-container-high p-8 rounded-xl flex flex-col justify-between min-h-[280px]">
<div className="flex -space-x-4">
<div className="w-12 h-12 rounded-full bg-secondary-fixed-dim flex items-center justify-center border-2 border-surface">
<span className="material-symbols-outlined text-on-secondary-fixed" data-icon="check">check</span>
</div>
<div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center border-2 border-surface">
<span className="material-symbols-outlined text-on-secondary" data-icon="check">check</span>
</div>
</div>
<div>
<h3 className="font-headline text-2xl text-primary font-medium mb-2">Ritmos Flexíveis</h3>
<p className="text-on-surface-variant font-light">Seu plano respira com você. Dias intensos pedem nutrição de suporte, não cobrança.</p>
</div>
</div>
{/* Numerical Depth Input (Contextual representation) */}
<div className="md:col-span-12 flex flex-col items-center justify-center py-12 bg-surface-container-low rounded-xl">
<p className="text-on-surface-variant mb-6 font-medium">Sua meta de equilíbrio atual</p>
<div className="flex items-baseline gap-2 group cursor-pointer">
<span className="font-headline text-7xl md:text-9xl text-primary font-extrabold tracking-tighter">85</span>
<span className="text-3xl font-headline text-secondary font-bold">%</span>
</div>
<div className="w-48 h-[2px] bg-surface-container-highest mt-2 relative overflow-hidden">
<div className="absolute inset-0 bg-primary w-4/5"></div>
</div>
<p className="mt-8 text-sm text-on-surface-variant/60 max-w-xs text-center italic">
                    "85% de constância no NURA Flow gera mais resultados do que 100% de perfeição em dietas temporárias."
                </p>
</div>
</div>
{/* Call to Action */}
<div className="flex flex-col gap-4 items-center">
<button onClick={onNext} className="w-full max-w-md h-16 bg-primary text-on-primary font-headline font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3">
                Entendi o NURA Flow
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<button className="text-primary font-medium px-8 py-3 rounded-full hover:bg-surface-variant/40 transition-colors">
                Saiba mais sobre a ciência
            </button>
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             
<div className="flex flex-col items-center justify-center text-stone-400 py-3 px-6 hover:text-teal-700 transition-colors">
<span className="material-symbols-outlined" data-icon="target">target</span>
<span className="font-lexend text-xs font-light tracking-wide mt-1">Focus</span>
</div>
<div className="flex flex-col items-center justify-center bg-teal-50 text-teal-900 rounded-full py-3 px-6 transition-all duration-500">
<span className="material-symbols-outlined" data-icon="auto_awesome" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
<span className="font-lexend text-xs font-semibold tracking-wide mt-1">Journey</span>
</div>
<div className="flex flex-col items-center justify-center text-stone-400 py-3 px-6 hover:text-teal-700 transition-colors">
<span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
<span className="font-lexend text-xs font-light tracking-wide mt-1">Learn</span>
</div>
<div className="flex flex-col items-center justify-center text-stone-400 py-3 px-6 hover:text-teal-700 transition-colors">
<span className="material-symbols-outlined" data-icon="person">person</span>
<span className="font-lexend text-xs font-light tracking-wide mt-1">Profile</span>
</div>

          </div>
        </footer>
      </div>
  
  );
};

export default NuraMetodologiaFlow;
