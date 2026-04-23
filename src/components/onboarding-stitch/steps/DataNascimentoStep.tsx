import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const DataNascimentoStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  // Inicializa com a data existente, ou vazio
  const [dataNascimento, setDataNascimento] = useState<string>(data.dataNascimento || '');

  const handleContinue = () => {
    if (dataNascimento) {
      updateData({ dataNascimento });
      onNext();
    }
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <main className="flex-grow flex flex-col items-center justify-center pt-10 pb-10 max-w-2xl mx-auto w-full relative">
        <div className="text-center mb-12 space-y-2 w-full">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 
            className="text-4xl text-stone-800 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Qual é a sua data de nascimento?
          </h1>
          <p className="text-stone-400 text-base font-light">
            A idade influencia nas recomendações metabólicas.
          </p>
        </div>

        {/* Date Picker UI */}
        <div className="relative w-full max-w-xs flex flex-col items-center bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // Não permite datas futuras
            className="w-full text-center text-2xl text-stone-800 focus:outline-none bg-transparent cursor-pointer"
            style={{ fontFamily: "'Playfair Display', serif" }}
          />
        </div>
      </main>
    </StepContainer>
  );
};

export default DataNascimentoStep;
