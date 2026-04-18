import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#9c5d4b';

const PesoObjetivoStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const target = data.pesoObjetivo || data.targetWeight || 70;

  const handleDecrement = () => {
    const newValue = Math.max(30, target - 0.5);
    updateData({ pesoObjetivo: newValue, targetWeight: newValue });
  };

  const handleIncrement = () => {
    const newValue = Math.min(250, target + 0.5);
    updateData({ pesoObjetivo: newValue, targetWeight: newValue });
  };

  const handleChange = (value: number) => {
    updateData({ pesoObjetivo: value, targetWeight: value });
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Qual é o seu peso objetivo?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          Definir uma meta clara é o primeiro passo para uma jornada sustentável.
        </p>
      </div>

      <div className="w-full bg-white rounded-2xl p-10 flex flex-col items-center justify-center relative shadow-sm border border-stone-100">
        <span className="text-stone-400 tracking-widest text-xs uppercase mb-8 font-light">Meta Desejada</span>
        
        <div className="flex items-end justify-center gap-2 mb-8">
          <div className="relative group">
            <input
              className="w-48 bg-transparent border-none text-center text-7xl text-stone-800 p-0 focus:ring-0 transition-all duration-300"
              style={{ fontFamily: "'Playfair Display', serif" }}
              type="number"
              value={target}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              step="0.1"
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px bg-stone-200 group-focus-within:w-full transition-all duration-500"></div>
          </div>
          <span 
            className="text-2xl text-stone-400 pb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            kg
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <button 
            onClick={handleIncrement}
            className="w-10 h-10 flex items-center justify-center bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          <button 
            onClick={handleDecrement}
            className="w-10 h-10 flex items-center justify-center bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 w-full">
        <div className="bg-white border border-stone-100 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
            <span className="material-symbols-outlined text-stone-400 text-lg">eco</span>
          </div>
          <p className="text-sm font-light text-stone-500 leading-relaxed">
            Sua meta é avaliada de forma inteligente para garantir o equilíbrio metabólico durante e após a adaptação.
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default PesoObjetivoStep;
