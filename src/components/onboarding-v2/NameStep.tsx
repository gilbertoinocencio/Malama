import React, { useState } from 'react';
import { StepContainer } from './StepContainer';

interface NameStepProps {
  onNext: (name: string) => void;
  onBack: () => void;
  initialValue?: string;
}

export const NameStep: React.FC<NameStepProps> = ({
  onNext,
  onBack,
  initialValue = ''
}) => {
  const [name, setName] = useState(initialValue);

  const handleContinue = () => {
    if (name.trim()) {
      onNext(name.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleContinue();
    }
  };

  return (
    <StepContainer currentStep={1} totalSteps={10} onBack={onBack} showBack>
      <div className="space-y-8">
        {/* Question */}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Como você gostaria de ser chamado?
          </h2>
          <p className="text-lg text-nura-muted dark:text-gray-300">
            Isso tornará nossa conversa mais pessoal
          </p>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite seu nome ou apelido"
              className="w-full px-6 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-gray-500 focus:border-nura-petrol dark:focus:border-primary focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <p className="text-sm text-nura-muted dark:text-gray-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">info</span>
            Pode ser seu nome, apelido ou como prefere ser chamado
          </p>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!name.trim()}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          Continuar
        </button>
      </div>
    </StepContainer>
  );
};
