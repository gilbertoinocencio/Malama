import React, { useState } from 'react';
import { StepLayout } from './StepLayout';
import { SelectionCard } from './SelectionCard';

type Biotype = 'ecto' | 'meso' | 'endo';

interface BiotypeStepProps {
  biotype?: Biotype;
  onNext: (data: { biotype: Biotype }) => void;
  onBack: () => void;
}

export const BiotypeStep: React.FC<BiotypeStepProps> = ({
  biotype: initialBiotype,
  onNext,
  onBack,
}) => {
  const [selectedBiotype, setSelectedBiotype] = useState<Biotype | undefined>(initialBiotype);

  const handleNext = () => {
    if (!selectedBiotype) return;
    onNext({ biotype: selectedBiotype });
  };

  return (
    <StepLayout
      title="Qual seu biotipo?"
      subtitle="Seu biotipo influencia como seu corpo responde à alimentação e exercícios"
      icon="accessibility"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedBiotype}
      progress={44}
    >
      <div className="space-y-4">
        <SelectionCard
          icon="height"
          title="Ectomorfo"
          subtitle="Magro, dificuldade para ganhar peso e massa muscular"
          selected={selectedBiotype === 'ecto'}
          onClick={() => setSelectedBiotype('ecto')}
          className="w-full"
        />
        <SelectionCard
          icon="fitness_center"
          title="Mesomorfo"
          subtitle="Atlético, ganha massa muscular com facilidade"
          selected={selectedBiotype === 'meso'}
          onClick={() => setSelectedBiotype('meso')}
          className="w-full"
        />
        <SelectionCard
          icon="account_circle"
          title="Endomorfo"
          subtitle="Tendência a acumular gordura, metabolismo mais lento"
          selected={selectedBiotype === 'endo'}
          onClick={() => setSelectedBiotype('endo')}
          className="w-full"
        />
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-nura-pastel-orange/20 dark:bg-primary/5 border border-nura-petrol/20 dark:border-primary/20 rounded-2xl p-4">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[20px] mt-0.5">
            info
          </span>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-nura-main dark:text-white">
              Como escolher?
            </p>
            <p className="text-xs text-nura-muted dark:text-gray-400 leading-relaxed">
              A maioria das pessoas é uma combinação. Escolha o que mais se parece com você. Usaremos isso para ajustar a distribuição de macronutrientes.
            </p>
          </div>
        </div>
      </div>
    </StepLayout>
  );
};

export default BiotypeStep;
