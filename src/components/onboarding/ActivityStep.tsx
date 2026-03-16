import React, { useState } from 'react';
import { StepLayout } from './StepLayout';
import { ActivityChip } from './ActivityChip';
import { SelectionCard } from './SelectionCard';

type ActivityLevel = 'sedentary' | 'moderate' | 'intense';
type Intensity = 'leve' | 'moderada' | 'alta';

interface ActivityStepProps {
  activityTypes?: string[];
  weeklyFrequency?: number;
  intensity?: Intensity;
  onNext: (data: {
    activityTypes: string[];
    weeklyFrequency: number;
    intensity: Intensity;
    activityLevel: ActivityLevel;
  }) => void;
  onBack: () => void;
}

const ACTIVITY_OPTIONS = [
  { label: 'Musculação', icon: 'fitness_center' },
  { label: 'Corrida', icon: 'directions_run' },
  { label: 'Natação', icon: 'pool' },
  { label: 'Ciclismo', icon: 'directions_bike' },
  { label: 'Yoga/Pilates', icon: 'self_improvement' },
  { label: 'Crossfit', icon: 'sports_gymnastics' },
  { label: 'Esportes Coletivos', icon: 'sports_soccer' },
  { label: 'Caminhada', icon: 'directions_walk' },
  { label: 'Dança', icon: 'music_note' },
  { label: 'Lutas', icon: 'sports_martial_arts' },
];

export const ActivityStep: React.FC<ActivityStepProps> = ({
  activityTypes: initialTypes = [],
  weeklyFrequency: initialFrequency = 0,
  intensity: initialIntensity,
  onNext,
  onBack,
}) => {
  const [selectedActivities, setSelectedActivities] = useState<string[]>(initialTypes);
  const [frequency, setFrequency] = useState<number | undefined>(initialFrequency || undefined);
  const [intensity, setIntensity] = useState<Intensity | undefined>(initialIntensity);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const calculateActivityLevel = (): ActivityLevel => {
    if (!frequency || frequency === 0) return 'sedentary';
    if (frequency <= 2 && intensity !== 'alta') return 'sedentary';
    if (frequency <= 4 || intensity === 'leve') return 'moderate';
    return 'intense';
  };

  const isValid = selectedActivities.length > 0 && frequency !== undefined && frequency >= 0 && intensity;

  const handleNext = () => {
    if (!isValid || !intensity || frequency === undefined) return;

    const activityLevel = calculateActivityLevel();
    onNext({
      activityTypes: selectedActivities,
      weeklyFrequency: frequency,
      intensity,
      activityLevel,
    });
  };

  return (
    <StepLayout
      title="Atividade Física"
      subtitle="Conte-nos sobre sua rotina de exercícios"
      icon="sports_gymnastics"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!isValid}
      progress={55}
    >
      <div className="space-y-6">
        {/* Activity Types */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Que atividades você pratica?
          </label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_OPTIONS.map((activity) => (
              <ActivityChip
                key={activity.label}
                label={activity.label}
                icon={activity.icon}
                selected={selectedActivities.includes(activity.label)}
                onToggle={() => toggleActivity(activity.label)}
              />
            ))}
          </div>
          <p className="text-xs text-nura-muted dark:text-gray-500">
            Selecione todas que se aplicam
          </p>
        </div>

        {/* Frequency */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Quantas vezes por semana?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setFrequency(num)}
                className={`
                  py-3 rounded-xl font-bold text-sm transition-all
                  ${frequency === num
                    ? 'bg-nura-petrol dark:bg-primary text-white shadow-md scale-105'
                    : 'bg-white dark:bg-surface-dark border-2 border-nura-border dark:border-gray-700 text-nura-main dark:text-white hover:border-nura-petrol/50 dark:hover:border-primary/50'
                  }
                `}
              >
                {num === 0 ? 'Não' : `${num}x`}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        {selectedActivities.length > 0 && frequency !== undefined && frequency > 0 && (
          <div className="space-y-3 animate-fade-in">
            <label className="block text-sm font-semibold text-nura-main dark:text-white">
              Intensidade dos treinos
            </label>
            <div className="grid grid-cols-3 gap-3">
              <SelectionCard
                icon="sentiment_satisfied"
                title="Leve"
                subtitle="Baixo esforço"
                selected={intensity === 'leve'}
                onClick={() => setIntensity('leve')}
              />
              <SelectionCard
                icon="sentiment_neutral"
                title="Moderada"
                subtitle="Esforço médio"
                selected={intensity === 'moderada'}
                onClick={() => setIntensity('moderada')}
              />
              <SelectionCard
                icon="whatshot"
                title="Alta"
                subtitle="Máximo esforço"
                selected={intensity === 'alta'}
                onClick={() => setIntensity('alta')}
              />
            </div>
          </div>
        )}
      </div>
    </StepLayout>
  );
};

export default ActivityStep;
