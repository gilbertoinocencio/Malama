import React, { useState } from 'react';
import { StepContainer } from './StepContainer';
import { OptionCard } from './OptionCard';

// ============================================
// ACTIVITY LEVEL STEP
// ============================================
interface ActivityLevelStepProps {
  onNext: (data: { frequency: number; intensity: string }) => void;
  onBack: () => void;
  initialValue?: { frequency?: number; intensity?: string };
}

const ACTIVITY_LEVELS = [
  { id: 0, label: 'Sedentário', desc: '0-1x por semana' },
  { id: 2, label: 'Leve', desc: '2-3x por semana' },
  { id: 4, label: 'Moderado', desc: '4-5x por semana' },
  { id: 6, label: 'Intenso', desc: '6-7x por semana' }
];

export const ActivityLevelStep: React.FC<ActivityLevelStepProps> = ({
  onNext,
  onBack,
  initialValue = {}
}) => {
  const [frequency, setFrequency] = useState(initialValue.frequency || 0);
  const [intensity, setIntensity] = useState(initialValue.intensity || 'moderada');

  return (
    <StepContainer currentStep={5} totalSteps={10} onBack={onBack} showBack>
      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Com que frequência você se exercita?
          </h2>
        </div>

        <div className="space-y-3">
          {ACTIVITY_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setFrequency(level.id)}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                frequency === level.id
                  ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="font-bold text-lg text-nura-main dark:text-white">{level.label}</div>
              <div className="text-sm text-nura-muted dark:text-gray-400">{level.desc}</div>
            </button>
          ))}
        </div>

        {frequency > 0 && (
          <div>
            <label className="block text-sm font-semibold text-nura-main dark:text-white mb-3">
              Intensidade dos treinos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['leve', 'moderada', 'alta'].map((i) => (
                <button
                  key={i}
                  onClick={() => setIntensity(i)}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold capitalize ${
                    intensity === i
                      ? 'border-nura-petrol dark:border-primary text-nura-petrol dark:text-primary'
                      : 'border-gray-200 dark:border-gray-700 text-nura-muted dark:text-gray-400'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onNext({ frequency, intensity })}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Continuar
        </button>
      </div>
    </StepContainer>
  );
};

// ============================================
// RESTRICTIONS STEP
// ============================================
interface RestrictionsStepProps {
  onNext: (restrictions: string[]) => void;
  onBack: () => void;
  initialValue?: string[];
}

const RESTRICTION_OPTIONS = [
  'Vegetariano',
  'Vegano',
  'Sem Lactose',
  'Sem Glúten',
  'Low Carb',
  'Jejum Intermitente'
];

export const RestrictionsStep: React.FC<RestrictionsStepProps> = ({
  onNext,
  onBack,
  initialValue = []
}) => {
  const [selected, setSelected] = useState<string[]>(initialValue);

  const toggle = (option: string) => {
    setSelected((prev) =>
      prev.includes(option) ? prev.filter((i) => i !== option) : [...prev, option]
    );
  };

  return (
    <StepContainer currentStep={6} totalSteps={10} onBack={onBack} showBack>
      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Você tem alguma restrição alimentar?
          </h2>
          <p className="text-lg text-nura-muted dark:text-gray-300">
            Selecione todas que se aplicam ou pule se não tiver nenhuma
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {RESTRICTION_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => toggle(option)}
              className={`p-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                selected.includes(option)
                  ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/10 text-nura-petrol dark:text-primary'
                  : 'border-gray-200 dark:border-gray-700 text-nura-main dark:text-gray-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          onClick={() => onNext(selected)}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {selected.length > 0 ? 'Continuar' : 'Pular'}
        </button>
      </div>
    </StepContainer>
  );
};

// ============================================
// CALCULATING STEP (Final)
// ============================================
interface CalculatingStepProps {
  userName: string;
}

export const CalculatingStep: React.FC<CalculatingStepProps> = ({ userName }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nura-petrol/5 to-nura-pastel-orange/10 dark:from-primary/10 dark:to-background-dark flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-nura-petrol to-nura-petrol-light dark:from-primary dark:to-primary/70 rounded-full flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white text-5xl">restaurant</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Pronto, {userName}!
          </h2>
          <p className="text-lg text-nura-muted dark:text-gray-300">
            Estamos criando seu plano personalizado
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 justify-center text-nura-muted dark:text-gray-400">
            <div className="size-2 bg-nura-petrol dark:bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm">Calculando suas necessidades nutricionais...</span>
          </div>
          <div className="flex items-center gap-3 justify-center text-nura-muted dark:text-gray-400">
            <div className="size-2 bg-nura-petrol dark:bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <span className="text-sm">Ajustando macros ao seu biotipo...</span>
          </div>
          <div className="flex items-center gap-3 justify-center text-nura-muted dark:text-gray-400">
            <div className="size-2 bg-nura-petrol dark:bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-sm">Criando plano de 3 meses...</span>
          </div>
        </div>
      </div>
    </div>
  );
};
