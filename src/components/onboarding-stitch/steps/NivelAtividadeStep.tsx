import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'muito_ativo';

const PETROL = '#1A6070';

const NivelAtividadeStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [nivel, setNivel] = useState<NivelAtividade>(data.nivelAtividade || 'moderado');

  const handleSelect = (value: NivelAtividade) => {
    setNivel(value);
    updateData({ nivelAtividade: value });
  };

  const handleContinue = () => {
    onNext();
  };

  const activities = [
    {
      id: 'sedentario' as NivelAtividade,
      icon: 'airline_seat_recline_normal',
      title: 'Sedentário',
      description: 'Passo a maior parte do dia sentado, pouco esforço físico.',
    },
    {
      id: 'leve' as NivelAtividade,
      icon: 'directions_walk',
      title: 'Levemente ativo',
      description: 'Caminhadas leves ou atividades domésticas rotineiras.',
    },
    {
      id: 'moderado' as NivelAtividade,
      icon: 'fitness_center',
      title: 'Moderadamente ativo',
      description: 'Exercícios moderados 3-5 vezes por semana.',
    },
    {
      id: 'muito_ativo' as NivelAtividade,
      icon: 'bolt',
      title: 'Muito ativo',
      description: 'Atividade física intensa diária ou trabalho braçal.',
    },
  ];

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
      showFooter={false}
    >
      <main className="flex-grow pt-20 pb-32 px-6 max-w-2xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-10 space-y-2">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 
            className="text-4xl text-stone-800 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Nível de atividade física
          </h1>
          <p className="text-stone-400 text-base font-light">Como é o seu dia a dia?</p>
        </div>

        {/* Activity Options Bento Grid-ish Layout */}
        <div className="grid grid-cols-1 gap-4">
          {activities.map((activity) => {
            const selected = nivel === activity.id;
            return (
              <button
                key={activity.id}
                onClick={() => handleSelect(activity.id)}
                className="group relative flex items-center p-6 rounded-2xl transition-all duration-300 active:scale-[0.98] text-left bg-white shadow-sm"
                style={{
                  border: selected ? `2px solid ${PETROL}` : '2px solid transparent',
                  boxShadow: selected ? `0 0 0 1px ${PETROL}20, 0 2px 12px rgba(0,0,0,0.04)` : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-5 transition-all"
                  style={{
                    background: selected ? PETROL : '#f5f5f4', // stone-100
                  }}
                >
                  <span
                    className="material-symbols-outlined text-xl transition-colors"
                    style={{
                      color: selected ? '#ffffff' : '#a8a29e', // stone-400
                      fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0"
                    }}
                  >
                    {activity.icon}
                  </span>
                </div>
                <div className="flex-grow pr-6">
                  <h3
                    className="text-lg mb-1"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: selected ? PETROL : '#292524', // stone-800
                      fontWeight: selected ? 600 : 400
                    }}
                  >
                    {activity.title}
                  </h3>
                  <p
                    className="text-sm font-light leading-relaxed transition-colors"
                    style={{ color: selected ? '#57534e' : '#a8a29e' }} // stone-500 : stone-400
                  >
                    {activity.description}
                  </p>
                </div>
                {selected && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: PETROL }}>
                    <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1", fontSize: 14 }}>
                      check
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Custom Footer */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-10 flex justify-center z-50 bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9]/90 to-transparent">
        <div className="max-w-md w-full space-y-1">
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl text-white text-base font-light tracking-wider transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
            style={{ background: PETROL }}
          >
            Continuar
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 text-sm font-light text-center transition-colors"
            style={{ color: PETROL }}
          >
            Anterior
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default NivelAtividadeStep;
