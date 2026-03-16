import React, { useState } from 'react';
import { StepLayout } from './StepLayout';
import { ActivityChip } from './ActivityChip';

interface NutritionStepProps {
  restrictions?: string[];
  preferences?: string[];
  currentRoutine?: string;
  onNext: (data: {
    restrictions: string[];
    preferences: string[];
    currentRoutine: string;
  }) => void;
  onBack: () => void;
}

const RESTRICTION_OPTIONS = [
  { label: 'Vegetariano', icon: 'eco' },
  { label: 'Vegano', icon: 'park' },
  { label: 'Sem Lactose', icon: 'block' },
  { label: 'Sem Glúten', icon: 'cancel' },
  { label: 'Halal', icon: 'mosque' },
  { label: 'Kosher', icon: 'star_of_david' },
  { label: 'Nenhuma', icon: 'check_circle' },
];

const PREFERENCE_OPTIONS = [
  { label: 'Carboidratos', icon: 'rice_bowl' },
  { label: 'Proteínas', icon: 'egg' },
  { label: 'Gorduras Boas', icon: 'water_drop' },
  { label: 'Doces', icon: 'cake' },
  { label: 'Salgados', icon: 'fastfood' },
  { label: 'Frutas', icon: 'nutrition' },
  { label: 'Verduras', icon: 'grass' },
];

export const NutritionStep: React.FC<NutritionStepProps> = ({
  restrictions: initialRestrictions = [],
  preferences: initialPreferences = [],
  currentRoutine: initialRoutine = '',
  onNext,
  onBack,
}) => {
  const [restrictions, setRestrictions] = useState<string[]>(initialRestrictions);
  const [preferences, setPreferences] = useState<string[]>(initialPreferences);
  const [routine, setRoutine] = useState(initialRoutine);

  const toggleRestriction = (restriction: string) => {
    if (restriction === 'Nenhuma') {
      setRestrictions(['Nenhuma']);
      return;
    }

    setRestrictions((prev) => {
      const filtered = prev.filter((r) => r !== 'Nenhuma');
      return filtered.includes(restriction)
        ? filtered.filter((r) => r !== restriction)
        : [...filtered, restriction];
    });
  };

  const togglePreference = (preference: string) => {
    setPreferences((prev) =>
      prev.includes(preference)
        ? prev.filter((p) => p !== preference)
        : [...prev, preference]
    );
  };

  const isValid = restrictions.length > 0;

  const handleNext = () => {
    if (!isValid) return;
    onNext({
      restrictions,
      preferences,
      currentRoutine: routine,
    });
  };

  return (
    <StepLayout
      title="Alimentação"
      subtitle="Vamos entender suas preferências e restrições alimentares"
      icon="restaurant"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!isValid}
      progress={66}
    >
      <div className="space-y-6">
        {/* Restrictions */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Você tem alguma restrição alimentar?
          </label>
          <div className="flex flex-wrap gap-2">
            {RESTRICTION_OPTIONS.map((option) => (
              <ActivityChip
                key={option.label}
                label={option.label}
                icon={option.icon}
                selected={restrictions.includes(option.label)}
                onToggle={() => toggleRestriction(option.label)}
              />
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            O que você mais gosta de comer?
          </label>
          <div className="flex flex-wrap gap-2">
            {PREFERENCE_OPTIONS.map((option) => (
              <ActivityChip
                key={option.label}
                label={option.label}
                icon={option.icon}
                selected={preferences.includes(option.label)}
                onToggle={() => togglePreference(option.label)}
              />
            ))}
          </div>
          <p className="text-xs text-nura-muted dark:text-gray-500">
            Opcional - isso nos ajuda a personalizar sugestões
          </p>
        </div>

        {/* Current Routine */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Como é sua rotina alimentar atual? (Opcional)
          </label>
          <textarea
            value={routine}
            onChange={(e) => setRoutine(e.target.value)}
            placeholder="Ex: Pulo o café da manhã, almoço em casa, lanches rápidos à tarde..."
            rows={4}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-nura-border dark:border-gray-700
              bg-white dark:bg-surface-dark text-nura-main dark:text-white
              placeholder-nura-muted dark:placeholder-gray-500
              focus:outline-none focus:border-nura-petrol dark:focus:border-primary
              transition-colors resize-none"
          />
          <p className="text-xs text-nura-muted dark:text-gray-500">
            Quanto mais detalhes, melhor conseguiremos adaptar o plano à sua realidade
          </p>
        </div>
      </div>
    </StepLayout>
  );
};

export default NutritionStep;
