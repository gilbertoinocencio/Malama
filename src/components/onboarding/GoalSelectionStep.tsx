import React, { useState } from 'react';
import { StepLayout } from './StepLayout';
import { SelectionCard } from './SelectionCard';

type Goal = 'aesthetic' | 'health' | 'performance' | 'emagrecimento' | 'ganho_massa';

interface GoalSelectionStepProps {
  mainGoal?: string;
  onNext: (data: { mainGoal: Goal }) => void;
  onBack: () => void;
}

export const GoalSelectionStep: React.FC<GoalSelectionStepProps> = ({
  mainGoal: initialGoal,
  onNext,
  onBack,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(initialGoal as Goal);

  const handleNext = () => {
    if (!selectedGoal) return;
    onNext({ mainGoal: selectedGoal });
  };

  return (
    <StepLayout
      title="Qual é seu objetivo?"
      subtitle="Isso nos ajuda a personalizar suas metas nutricionais"
      icon="flag"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedGoal}
      progress={33}
    >
      <div className="grid grid-cols-2 gap-4">
        <SelectionCard
          icon="trending_down"
          title="Emagrecimento"
          subtitle="Perder gordura com saúde"
          selected={selectedGoal === 'emagrecimento' || selectedGoal === 'aesthetic'}
          onClick={() => setSelectedGoal('emagrecimento')}
        />
        <SelectionCard
          icon="fitness_center"
          title="Ganho de Massa"
          subtitle="Construir músculos"
          selected={selectedGoal === 'ganho_massa' || selectedGoal === 'performance'}
          onClick={() => setSelectedGoal('ganho_massa')}
        />
        <SelectionCard
          icon="speed"
          title="Performance"
          subtitle="Melhorar desempenho"
          selected={selectedGoal === 'performance'}
          onClick={() => setSelectedGoal('performance')}
        />
        <SelectionCard
          icon="favorite"
          title="Saúde"
          subtitle="Bem-estar geral"
          selected={selectedGoal === 'saude' || selectedGoal === 'health'}
          onClick={() => setSelectedGoal('saude')}
        />
      </div>

      {/* Info */}
      <div className="mt-6 bg-white dark:bg-surface-dark border border-nura-border dark:border-gray-700 rounded-2xl p-4">
        <p className="text-xs text-nura-muted dark:text-gray-400 leading-relaxed">
          <span className="font-semibold text-nura-main dark:text-white">Dica:</span> Seu objetivo pode mudar ao longo do tempo. Você poderá ajustá-lo depois.
        </p>
      </div>
    </StepLayout>
  );
};

export default GoalSelectionStep;
