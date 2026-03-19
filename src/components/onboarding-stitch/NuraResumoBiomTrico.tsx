import React, { useMemo } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraResumoBiomTrico: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const height = data.height || 170;
  const weight = data.currentWeight || 70;
  const age = data.age || 25;

  const bmi = useMemo(() => {
    const h = height / 100;
    return (weight / (h * h)).toFixed(1);
  }, [height, weight]);

  const bmiNum = parseFloat(bmi);
  const bmiCategory = bmiNum < 18.5 ? 'Abaixo do peso' : bmiNum < 25 ? 'Peso Saudável' : bmiNum < 30 ? 'Sobrepeso' : 'Obesidade';

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all">
          <span className="material-symbols-outlined text-teal-900">arrow_back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-xl mx-auto w-full">
        <section className="mb-10 text-center md:text-left">
          <h2 className="font-headline text-4xl font-bold text-primary tracking-tight leading-tight mb-4">
            Seu Perfil Biométrico
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Analisamos seus dados para criar um ponto de partida preciso.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col items-center">
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" fill="transparent" r="88" stroke="#e2e3df" strokeWidth="8"></circle>
                <circle cx="100" cy="100" fill="transparent" r="88" stroke="#006d36" strokeDasharray="552.9" strokeDashoffset="138" strokeLinecap="round" strokeWidth="12"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline text-5xl font-extrabold text-primary">{bmi}</span>
                <span className="text-sm font-medium uppercase tracking-widest text-on-surface-variant">IMC</span>
              </div>
            </div>
            <span className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container text-sm font-bold rounded-full mb-2">
              {bmiCategory}
            </span>
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col gap-4 hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-primary text-3xl">straighten</span>
            <div>
              <span className="text-on-surface-variant text-sm block mb-1">Altura</span>
              <h3 className="font-headline text-2xl font-bold text-primary">{height} <span className="text-base font-normal">cm</span></h3>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col gap-4 hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-primary text-3xl">monitor_weight</span>
            <div>
              <span className="text-on-surface-variant text-sm block mb-1">Peso Atual</span>
              <h3 className="font-headline text-2xl font-bold text-primary">{weight} <span className="text-base font-normal">kg</span></h3>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <h4 className="font-headline font-semibold text-primary">Escala de Composição</h4>
              <span className="text-xs text-on-surface-variant font-medium">18.5 — 24.9 Normal</span>
            </div>
            <div className="h-2 w-full bg-surface-container-highest rounded-full flex overflow-hidden">
              <div className="h-full bg-amber-200 w-[15%]"></div>
              <div className="h-full bg-secondary w-[35%] relative">
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

        <div className="mt-10 flex flex-col items-center">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg shadow-lg active:scale-95 transition-all">
            Continuar para Metas
          </button>
          <p className="mt-4 text-xs text-on-surface-variant opacity-60">*Cálculos baseados na fórmula padrão da OMS</p>
        </div>
      </main>
    </div>
  );
};

export default NuraResumoBiomTrico;
