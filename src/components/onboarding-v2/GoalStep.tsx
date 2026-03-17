import React, { useState } from 'react';
import { StepContainer } from './StepContainer';
import { OptionCard } from './OptionCard';

interface GoalStepProps {
  onNext: (goal: string) => void;
  onBack: () => void;
  initialValue?: string;
}

type GoalOption = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'emagrecimento',
    icon: 'trending_down',
    title: 'Emagrecimento',
    description: 'Perder peso e reduzir gordura corporal'
  },
  {
    id: 'ganho_massa',
    icon: 'fitness_center',
    title: 'Ganho de Massa',
    description: 'Aumentar músculos e melhorar composição corporal'
  },
  {
    id: 'performance',
    icon: 'bolt',
    title: 'Performance Esportiva',
    description: 'Melhorar desempenho atlético e rendimento'
  },
  {
    id: 'saude',
    icon: 'favorite',
    title: 'Saúde e Bem-Estar',
    description: 'Manter equilíbrio e qualidade de vida'
  }
];

export const GoalStep: React.FC<GoalStepProps> = ({
  onNext,
  onBack,
  initialValue = ''
}) => {
  const [selectedGoal, setSelectedGoal] = useState(initialValue);

  const handleContinue = () => {
    if (selectedGoal) {
      onNext(selectedGoal);
    }
  };

  return (
    <StepContainer currentStep={2} totalSteps={10} onBack={onBack} showBack>
      <div className="space-y-8">
        {/* Question */}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Qual é o seu principal objetivo?
          </h2>
          <p className="text-lg text-nura-muted dark:text-gray-300">
            Isso nos ajudará a personalizar seu plano alimentar
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {GOAL_OPTIONS.map((option) => (
            <OptionCard
              key={option.id}
              icon={option.icon}
              title={option.title}
              description={option.description}
              selected={selectedGoal === option.id}
              onClick={() => setSelectedGoal(option.id)}
            />
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedGoal}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          Continuar
        </button>
      </div>
    </StepContainer>
  );
};
