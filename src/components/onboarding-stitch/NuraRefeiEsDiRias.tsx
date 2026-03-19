import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraRefeiEsDiRias: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Header Section */}
<header className="text-center mb-16 space-y-4">
<h1 className="text-4xl md:text-5xl font-extrabold text-primary font-lexend tracking-tight leading-tight">
                Quantas refeições faz por dia?
            </h1>
<p className="text-on-surface-variant text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">
                Ajustamos a densidade calórica de cada prato para o seu ritmo.
            </p>
</header>
{/* Stepper Component: The "Elegance" Selector */}
<div className="w-full flex flex-col items-center space-y-12">
{/* Numerical Input Area */}
<div className="relative flex items-center justify-center space-x-12">
{/* Visual Anchor Left */}
<div className="hidden sm:block opacity-20 transform -scale-x-100">
<span className="material-symbols-outlined text-tertiary text-6xl" data-icon="restaurant">restaurant</span>
</div>
<div className="flex items-center space-x-8">
<button 
  onClick={() => {
    const newVal = Math.max(1, (data.mealsPerDay || 3) - 1);
    updateData({ mealsPerDay: newVal });
  }}
  className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-[0_16px_32px_rgba(0,0,0,0.04)] text-primary flex items-center justify-center hover:bg-surface-container-high transition-all duration-300 active:scale-90 border border-outline-variant/10">
<span className="material-symbols-outlined text-3xl font-bold">remove</span>
</button>
<div className="flex flex-col items-center min-w-[100px]">
<span className="text-8xl md:text-9xl font-extrabold text-primary font-lexend tabular-nums tracking-tighter">
                            {data.mealsPerDay || 3}
                        </span>
<div className="w-24 h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
<div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, (data.mealsPerDay || 3) * 20)}%` }}></div>
</div>
</div>
<button 
  onClick={() => {
    const newVal = Math.min(6, (data.mealsPerDay || 3) + 1);
    updateData({ mealsPerDay: newVal });
  }}
  className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-[0_16px_32px_rgba(0,0,0,0.04)] text-primary flex items-center justify-center hover:bg-surface-container-high transition-all duration-300 active:scale-90 border border-outline-variant/10">
<span className="material-symbols-outlined text-3xl font-bold">add</span>
</button>
</div>
{/* Visual Anchor Right */}
<div className="hidden sm:block opacity-20">
<span className="material-symbols-outlined text-tertiary text-6xl" data-icon="restaurant">restaurant</span>
</div>
</div>
{/* Descriptive State Card (Bento-style Glassmorphism) */}
<div className="w-full bg-surface-container-low rounded-lg p-8 flex items-center gap-6 border border-white/40 backdrop-blur-sm">
<div className="w-14 h-14 rounded-full bg-tertiary-fixed-dim/30 flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>set_meal</span>
</div>
<div>
<h3 className="text-tertiary font-bold font-lexend text-lg">Padrão Nutritivo</h3>
<p className="text-on-surface-variant text-sm font-medium">Café da manhã, almoço e jantar equilibrados.</p>
</div>
</div>
</div>
{/* Sticky Footer Action */}
<footer className="shrink-0 w-full p-8 flex justify-center bg-gradient-to-t from-surface via-surface to-transparent p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
<div className="max-w-md w-full">
<button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-lexend font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-primary-container hover:scale-[1.02] transition-all duration-500 active:scale-95 group">
                    Continuar
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
</div>
</footer>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             
<div className="max-w-md w-full">
<button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-lexend font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-primary-container hover:scale-[1.02] transition-all duration-500 active:scale-95 group">
                    Continuar
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
</div>

          </div>
        </footer>
      </div>
  
  );
};

export default NuraRefeiEsDiRias;
