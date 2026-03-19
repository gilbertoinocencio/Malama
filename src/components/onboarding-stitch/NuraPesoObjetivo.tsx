import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraPesoObjetivo: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const handleWeightChange = (newWeight: number) => {
    if (newWeight > 0 && newWeight < 300) {
      updateData({ targetWeight: newWeight });
    }
  };

  return (
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-container opacity-10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          
          <div className="text-center mb-12">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">
              Qual é o seu peso objetivo?
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
              Definir uma meta clara é o primeiro passo para uma jornada de transformação sustentável.
            </p>
          </div>

          <div className="w-full bg-surface-container-lowest rounded-xl p-10 flex flex-col items-center justify-center relative shadow-[0_-16px_32px_rgba(0,0,0,0.02)] border border-white/50">
            <span className="text-tertiary font-headline font-semibold tracking-widest text-xs uppercase mb-8">Meta Desejada</span>
            <div className="flex items-end justify-center gap-2 mb-10">
              <div className="relative group">
                <input 
                  className="w-48 bg-transparent border-none text-center font-headline text-6xl md:text-8xl font-extrabold text-primary p-0 focus:ring-0 placeholder-surface-container-highest transition-all duration-300" 
                  placeholder="70" 
                  step="0.1" 
                  type="number"
                  value={data.targetWeight || ''}
                  onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-surface-container-highest group-focus-within:w-full group-focus-within:bg-secondary transition-all duration-500 rounded-full"></div>
              </div>
              <span className="font-headline text-3xl font-medium text-tertiary pb-4">kg</span>
            </div>

            <div className="flex items-center gap-3 bg-surface-container-low px-6 py-3 rounded-full border border-surface-variant/30">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <p className="text-sm font-medium text-on-surface-variant">
                Sua meta é realista e saudável para o seu perfil.
              </p>
            </div>

            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              <button 
                onClick={() => handleWeightChange((data.targetWeight || 70) + 0.5)}
                className="w-12 h-12 flex items-center justify-center bg-surface-container-high rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-90"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
              <button 
                onClick={() => handleWeightChange((data.targetWeight || 70) - 0.5)}
                className="w-12 h-12 flex items-center justify-center bg-surface-container-high rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-90"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-6 w-full">
            <div className="flex-1 bg-tertiary-fixed text-on-tertiary-fixed p-6 rounded-lg flex flex-col justify-between min-h-[8rem] border border-tertiary/10">
              <span className="material-symbols-outlined text-tertiary text-3xl mb-2">psychology</span>
              <p className="text-xs font-medium leading-tight">A ciência mostra que metas visíveis aumentam a retenção em 40%.</p>
            </div>
            <div className="flex-1 bg-surface-container-high p-6 rounded-lg flex flex-col justify-between min-h-[8rem]">
              <span className="material-symbols-outlined text-secondary text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <p className="text-xs font-medium leading-tight text-on-surface-variant">Equilíbrio metabólico é nossa prioridade absoluta.</p>
            </div>
          </div>
        </main>
        
        <footer className="fixed bottom-0 left-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
            <div className="max-w-md w-full">
              <button onClick={onNext} className="w-full h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-semibold text-lg rounded-xl shadow-[0_16px_32px_rgba(0,70,79,0.2)] hover:shadow-[0_16px_40px_rgba(0,70,79,0.3)] hover:scale-[1.02] active:scale-95 transition-all duration-500 ease-in-out flex items-center justify-center gap-3">
                <span>Continuar</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
  );
};

export default NuraPesoObjetivo;
