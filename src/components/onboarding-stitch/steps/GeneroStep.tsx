import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const PETROL = '#9c5d4b';

const GeneroStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [genero, setGenero] = useState<'masculino' | 'feminino' | null>(data.genero || null);

  const handleSelect = (value: 'masculino' | 'feminino') => {
    setGenero(value);
    updateData({ genero: value });
  };

  const handleContinue = () => {
    if (genero) onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
      showFooter={false}
    >
      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-20 pb-32 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="w-full mb-10 space-y-2">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1
            className="text-4xl text-stone-800 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Gênero Biológico
          </h1>
          <p className="text-stone-400 text-base font-light">
            Personalize a ciência por trás do seu plano.
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-2 gap-4 w-full">
          {(['masculino', 'feminino'] as const).map((value) => {
            const selected = genero === value;
            return (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                className="flex flex-col items-center justify-center p-10 rounded-2xl transition-all duration-200 active:scale-95 relative bg-white shadow-sm"
                style={{
                  border: selected ? `2px solid ${PETROL}` : '2px solid transparent',
                  boxShadow: selected ? `0 0 0 1px ${PETROL}20, 0 2px 12px rgba(0,0,0,0.04)` : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <span
                  className="material-symbols-outlined text-5xl mb-3 transition-all"
                  style={{ color: selected ? PETROL : '#a8a29e' }}
                >
                  {value === 'masculino' ? 'male' : 'female'}
                </span>
                <span
                  className="text-base font-light capitalize"
                  style={{
                    color: selected ? PETROL : '#78716c',
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {value === 'masculino' ? 'Masculino' : 'Feminino'}
                </span>
                {selected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: PETROL }}>
                    <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1", fontSize: 14 }}>check</span>
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
            disabled={!genero}
            className="w-full py-4 rounded-2xl text-white text-base font-light tracking-wider transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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

export default GeneroStep;
