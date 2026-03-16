import React, { useState } from 'react';
import { StepLayout } from './StepLayout';

interface AnthropometryStepProps {
  height?: number;
  weight?: number;
  bodyFatPercentage?: number;
  onNext: (data: { height: number; weight: number; bodyFatPercentage?: number; bmi: number }) => void;
  onBack: () => void;
}

export const AnthropometryStep: React.FC<AnthropometryStepProps> = ({
  height: initialHeight = 0,
  weight: initialWeight = 0,
  bodyFatPercentage: initialBodyFat,
  onNext,
  onBack,
}) => {
  const [height, setHeight] = useState(initialHeight || '');
  const [weight, setWeight] = useState(initialWeight || '');
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | ''>(initialBodyFat || '');
  const [showBodyFat, setShowBodyFat] = useState(!!initialBodyFat);

  const calculateBMI = (weightKg: number, heightCm: number): number => {
    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(1));
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600 dark:text-blue-400' };
    if (bmi < 25) return { label: 'Peso normal', color: 'text-green-600 dark:text-green-400' };
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Obesidade', color: 'text-red-600 dark:text-red-400' };
  };

  const isValid = Number(height) >= 100 && Number(height) <= 250 && Number(weight) >= 30 && Number(weight) <= 300;
  const bmi = isValid ? calculateBMI(Number(weight), Number(height)) : 0;
  const bmiCategory = bmi > 0 ? getBMICategory(bmi) : null;

  const handleNext = () => {
    if (!isValid) return;

    onNext({
      height: Number(height),
      weight: Number(weight),
      bodyFatPercentage: bodyFatPercentage ? Number(bodyFatPercentage) : undefined,
      bmi,
    });
  };

  return (
    <StepLayout
      title="Medidas Corporais"
      subtitle="Essas informações nos ajudam a calcular suas necessidades nutricionais"
      icon="straighten"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!isValid}
      progress={22}
    >
      <div className="space-y-6">
        {/* Height & Weight Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Height */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-nura-main dark:text-white">
              Altura
            </label>
            <div className="relative">
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                min="100"
                max="250"
                className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 border-nura-border dark:border-gray-700
                  bg-white dark:bg-surface-dark text-nura-main dark:text-white
                  placeholder-nura-muted dark:placeholder-gray-500
                  focus:outline-none focus:border-nura-petrol dark:focus:border-primary
                  transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nura-muted dark:text-gray-500">
                cm
              </span>
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-nura-main dark:text-white">
              Peso
            </label>
            <div className="relative">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                min="30"
                max="300"
                step="0.1"
                className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 border-nura-border dark:border-gray-700
                  bg-white dark:bg-surface-dark text-nura-main dark:text-white
                  placeholder-nura-muted dark:placeholder-gray-500
                  focus:outline-none focus:border-nura-petrol dark:focus:border-primary
                  transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nura-muted dark:text-gray-500">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* BMI Display */}
        {bmi > 0 && bmiCategory && (
          <div className="bg-nura-pastel-orange/20 dark:bg-primary/5 border border-nura-petrol/20 dark:border-primary/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-nura-muted dark:text-gray-400">Seu IMC</p>
                <p className="text-2xl font-bold text-nura-petrol dark:text-primary">{bmi}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${bmiCategory.color}`}>
                  {bmiCategory.label}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Body Fat (Optional) */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowBodyFat(!showBodyFat)}
            className="flex items-center justify-between w-full p-4 rounded-2xl
              bg-white dark:bg-surface-dark border-2 border-nura-border dark:border-gray-700
              hover:border-nura-petrol/50 dark:hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary">
                {showBodyFat ? 'remove_circle' : 'add_circle'}
              </span>
              <span className="text-sm font-semibold text-nura-main dark:text-white">
                Adicionar % de Gordura (Opcional)
              </span>
            </div>
            <span className="text-xs text-nura-muted dark:text-gray-500">
              {showBodyFat ? 'Ocultar' : 'Mostrar'}
            </span>
          </button>

          {showBodyFat && (
            <div className="space-y-2 animate-fade-in">
              <label className="block text-sm font-semibold text-nura-main dark:text-white">
                Percentual de Gordura Corporal
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={bodyFatPercentage}
                  onChange={(e) => setBodyFatPercentage(e.target.value)}
                  placeholder="20"
                  min="3"
                  max="60"
                  step="0.1"
                  className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 border-nura-border dark:border-gray-700
                    bg-white dark:bg-surface-dark text-nura-main dark:text-white
                    placeholder-nura-muted dark:placeholder-gray-500
                    focus:outline-none focus:border-nura-petrol dark:focus:border-primary
                    transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nura-muted dark:text-gray-500">
                  %
                </span>
              </div>
              <p className="text-xs text-nura-muted dark:text-gray-500">
                Se você fez bioimpedância, adipômetro ou DEXA, pode adicionar aqui
              </p>
            </div>
          )}
        </div>
      </div>
    </StepLayout>
  );
};

export default AnthropometryStep;
