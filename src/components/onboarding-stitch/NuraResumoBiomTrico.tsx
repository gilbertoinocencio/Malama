import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraResumoBiomTrico: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
<div className="max-w-xl w-full">
{/* Header Section */}
<header className="mb-12 text-center md:text-left">
<h2 className="headline-font text-display-sm md:text-headline-lg font-bold text-primary tracking-tight leading-tight mb-4">
                    Seu Perfil Biométrico
                </h2>
<p className="text-on-surface-variant text-lg leading-relaxed font-body">
                    Analisamos seus dados para criar um ponto de partida preciso. Este é o alicerce da sua jornada personalizada.
                </p>
</header>
{/* Bento Grid Layout for Summary */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* Main BMI Card (Asymmetric Focus) */}
<div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col items-center justify-center">
{/* Contextual Leaf (Decorative) */}
<div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
<div className="relative z-10 flex flex-col items-center">
<div className="relative w-48 h-48 flex items-center justify-center mb-6">
{/* Circular SVG Gauge */}
<svg className="w-full h-full transform -rotate-90">
<circle className="text-surface-container-highest" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="8"></circle>
<circle className="text-secondary" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" stroke-dasharray="552.9" stroke-dashoffset="138" strokeLinecap="round" strokeWidth="12"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="headline-font text-5xl font-extrabold text-primary">22.4</span>
<span className="text-sm font-medium uppercase tracking-widest text-on-surface-variant">IMC</span>
</div>
</div>
<div className="text-center">
<span className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container text-sm font-bold rounded-full mb-2">
                                Peso Saudável
                            </span>
<p className="text-on-surface-variant text-sm max-w-[280px] leading-snug">
                                Seu índice está dentro da zona ideal para sua altura e idade.
                            </p>
</div>
</div>
</div>
{/* Detail Cards */}
<div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-surface-container">
<div className="mb-4">
<span className="material-symbols-outlined text-primary text-3xl">straighten</span>
</div>
<div>
<span className="text-on-surface-variant text-sm block mb-1">Altura</span>
<h3 className="headline-font text-2xl font-bold text-primary">178 <span className="text-base font-normal">cm</span></h3>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-surface-container">
<div className="mb-4">
<span className="material-symbols-outlined text-primary text-3xl">monitor_weight</span>
</div>
<div>
<span className="text-on-surface-variant text-sm block mb-1">Peso Atual</span>
<h3 className="headline-font text-2xl font-bold text-primary">71.0 <span className="text-base font-normal">kg</span></h3>
</div>
</div>
{/* Metric Spectrum */}
<div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
<div className="flex justify-between items-end mb-4">
<h4 className="headline-font font-semibold text-primary">Escala de Composição</h4>
<span className="text-xs text-on-surface-variant font-medium">18.5 — 24.9 Normal</span>
</div>
<div className="h-2 w-full bg-surface-container-highest rounded-full flex overflow-hidden">
<div className="h-full bg-amber-200 w-[15%]"></div>
<div className="h-full bg-secondary w-[35%] relative">
{/* Indicator line for current BMI */}
<div className="absolute right-1/4 top-0 w-0.5 h-full bg-white/50"></div>
</div>
<div className="h-full bg-amber-400 w-[25%]"></div>
<div className="h-full bg-red-400 w-[25%]"></div>
</div>
<div className="flex justify-between mt-3 text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
<span>Abaixo</span>
<span>Normal</span>
<span>Sobrepeso</span>
<span>Obesidade</span>
</div>
</div>
</div>
{/* Primary Action */}
<div className="mt-12 flex flex-col items-center">
<button className="w-full h-16 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg shadow-lg active:scale-95 transition-all duration-300">
                    Continuar para Metas
                </button>
<p className="mt-4 text-xs text-on-surface-variant opacity-60">
                    *Cálculos baseados na fórmula padrão da OMS
                </p>
</div>
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraResumoBiomTrico;
