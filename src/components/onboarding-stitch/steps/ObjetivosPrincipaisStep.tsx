import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

type ObjetivoPrincipal = 'perder_peso' | 'manter_peso' | 'ganhar_peso';

const ObjetivosPrincipaisStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [objetivoPrincipal, setObjetivoPrincipal] = useState<ObjetivoPrincipal>(
    data.primary_goal as ObjetivoPrincipal || 'perder_peso'
  );

  const handleSelect = (objetivo: ObjetivoPrincipal) => {
    setObjetivoPrincipal(objetivo);
    updateData({ primary_goal: objetivo });
  };

  const handleContinue = () => {
    onNext();
  };

  const objetivos = [
    {
      id: 'perder_peso' as ObjetivoPrincipal,
      title: 'Perder peso',
      description: 'Foco em déficit calórico e nutrição consciente.',
    },
    {
      id: 'manter_peso' as ObjetivoPrincipal,
      title: 'Manter o peso',
      description: 'Equilíbrio e longevidade alimentar.',
    },
    {
      id: 'ganhar_peso' as ObjetivoPrincipal,
      title: 'Ganhar peso',
      description: 'Ganho de massa muscular e vitalidade.',
    },
  ];

  return (
    <StepContainer
      progress={(currentStep / totalSteps) * 100}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col px-6 pt-28 pb-32 max-w-lg mx-auto w-full relative overflow-hidden">
        {/* Decorative "Contextual Leaf" */}
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -left-20 w-48 h-48 bg-tertiary-fixed/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Section 1: Objectives */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <header className="space-y-4">
            <span className="text-tertiary font-headline font-semibold text-sm tracking-widest uppercase">
              Passo {currentStep} de {totalSteps}
            </span>
            <h2 className="text-primary font-headline font-bold text-4xl leading-tight">
              Qual é o seu objetivo principal?
            </h2>
            <p className="text-on-surface-variant text-lg">Personalize sua jornada para o seu bem-estar.</p>
          </header>

          {/* Selective Option Cards (The Elegance Selector) */}
          <div className="grid grid-cols-1 gap-6">
            {objetivos.map((objetivo) => (
              <button
                key={objetivo.id}
                onClick={() => handleSelect(objetivo.id)}
                className={`flex items-center justify-between w-full p-8 rounded-lg text-left transition-all duration-300 transform hover:scale-[1.02] active:scale-95 group ${
                  objetivoPrincipal === objetivo.id
                    ? 'bg-primary-fixed-dim'
                    : 'bg-surface-container-low'
                }`}
              >
                <div className="space-y-1">
                  <span
                    className={`font-headline font-semibold text-xl block ${
                      objetivoPrincipal === objetivo.id ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {objetivo.title}
                  </span>
                  <span
                    className={`text-sm ${
                      objetivoPrincipal === objetivo.id
                        ? 'text-on-primary-fixed-variant/70'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {objetivo.description}
                  </span>
                </div>
                {objetivoPrincipal === objetivo.id ? (
                  <span
                    className="material-symbols-outlined text-secondary text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                    circle
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Fixed Action Bottom Bar (Onboarding Version) */}
      <div className="fixed bottom-0 left-0 w-full p-6 glass-effect z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleContinue}
            className="w-full h-16 bg-primary text-on-primary font-headline font-bold text-lg rounded-lg shadow-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Continuar
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </StepContainer>
  );
};

export default ObjetivosPrincipaisStep;
