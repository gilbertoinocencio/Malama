import React, { useState } from 'react';
import { StepContainer } from './StepContainer';
import { OptionCard } from './OptionCard';

interface BiotypeStepProps {
  onNext: (biotype: string) => void;
  onBack: () => void;
  initialValue?: string;
}

const BIOTYPE_OPTIONS = [
  {
    id: 'ecto',
    icon: 'trending_up',
    title: 'Ectomorfo',
    description: 'Magro, metabolismo rápido, dificuldade para ganhar peso'
  },
  {
    id: 'meso',
    icon: 'fitness_center',
    title: 'Mesomorfo',
    description: 'Atlético, ganha músculo facilmente, corpo equilibrado'
  },
  {
    id: 'endo',
    icon: 'circle',
    title: 'Endomorfo',
    description: 'Estrutura mais larga, ganha peso facilmente'
  }
];

export const BiotypeStep: React.FC<BiotypeStepProps> = ({
  onNext,
  onBack,
  initialValue = ''
}) => {
  const [selected, setSelected] = useState(initialValue);

  return (
    <StepContainer currentStep={4} totalSteps={10} onBack={onBack} showBack>
      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Qual biotipo mais se parece com você?
          </h2>
          <p className="text-lg text-nura-muted dark:text-gray-300">
            Isso nos ajuda a ajustar sua distribuição de macronutrientes
          </p>
        </div>

        <div className="space-y-3">
          {BIOTYPE_OPTIONS.map((option) => (
            <OptionCard
              key={option.id}
              icon={option.icon}
              title={option.title}
              description={option.description}
              selected={selected === option.id}
              onClick={() => setSelected(option.id)}
            />
          ))}
        </div>

        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          Continuar
        </button>
      </div>
    </StepContainer>
  );
};
