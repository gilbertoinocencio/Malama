import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

type ObjetivoPrincipal = 'perder_peso' | 'manter_peso' | 'ganhar_peso';

const PETROL = '#7d4a3c';

const ObjetivosPrincipaisStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [objetivoPrincipal, setObjetivoPrincipal] = useState<ObjetivoPrincipal>(
    data.primary_goal as ObjetivoPrincipal || 'perder_peso'
  );

  const handleSelect = (objetivo: ObjetivoPrincipal) => {
    setObjetivoPrincipal(objetivo);
    updateData({ primary_goal: objetivo });
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
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={onNext}
    >
      <main className="flex-1 flex flex-col pt-10 pb-10 max-w-lg mx-auto w-full relative">
        <header className="text-center mb-12 space-y-4">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
            Passo {currentStep} de {totalSteps}
          </span>
          <h2 
            className="text-4xl text-stone-800 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Qual é o seu objetivo principal?
          </h2>
          <p className="text-stone-400 text-base font-light">
            Personalize sua jornada para o seu bem-estar.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {objetivos.map((objetivo) => {
            const isSelected = objetivoPrincipal === objetivo.id;
            return (
              <button
                key={objetivo.id}
                onClick={() => handleSelect(objetivo.id)}
                className="flex items-center justify-between w-full p-6 text-left rounded-2xl transition-all duration-300 active:scale-[0.98] bg-white shadow-sm"
                style={{
                  border: isSelected ? `2px solid ${PETROL}` : '2px solid transparent',
                  boxShadow: isSelected ? `0 0 0 1px ${PETROL}20, 0 2px 12px rgba(0,0,0,0.04)` : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div className="space-y-0.5">
                  <span
                    className="block text-lg"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: isSelected ? PETROL : '#292524',
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    {objetivo.title}
                  </span>
                  <span
                    className="block text-sm font-light transition-colors"
                    style={{ color: isSelected ? '#57534e' : '#a8a29e' }}
                  >
                    {objetivo.description}
                  </span>
                </div>
                
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    background: isSelected ? PETROL : '#f5f5f4', // stone-100
                    border: isSelected ? 'none' : '1px solid #e7e5e4' // stone-200
                  }}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: 16 }}>
                      check
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </StepContainer>
  );
};

export default ObjetivosPrincipaisStep;
