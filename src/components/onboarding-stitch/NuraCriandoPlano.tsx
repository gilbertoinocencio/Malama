import React, { useEffect, useState } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraCriandoPlano: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onNext(), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 70);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: 'Analisando seu perfil metabólico...', threshold: 15, icon: 'biotech' },
    { label: 'Calculando necessidades calóricas...', threshold: 35, icon: 'calculate' },
    { label: 'Definindo janela de jejum ideal...', threshold: 55, icon: 'schedule' },
    { label: 'Montando plano nutricional...', threshold: 75, icon: 'restaurant_menu' },
    { label: 'Finalizando personalização...', threshold: 90, icon: 'auto_awesome' },
  ];

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-center px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-10 animate-pulse">
          <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4 text-center">
          Criando seu plano
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-md text-center mb-12">
          Estamos personalizando tudo com base no seu perfil único.
        </p>

        <div className="w-full max-w-md mb-10">
          <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-on-surface-variant mt-3 font-headline">{progress}%</p>
        </div>

        <div className="space-y-4 w-full max-w-md">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 transition-all duration-500 ${
                progress >= step.threshold ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${progress >= step.threshold ? 'text-secondary' : 'text-on-surface-variant/30'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >{progress >= step.threshold ? 'check_circle' : step.icon}</span>
              <span className={`font-headline text-sm ${progress >= step.threshold ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default NuraCriandoPlano;
