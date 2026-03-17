import React, { useState } from 'react';
import { StepContainer } from './StepContainer';

interface MeasurementsStepProps {
  onNext: (data: {
    weight: number;
    height: number;
    age: number;
    gender: 'M' | 'F';
  }) => void;
  onBack: () => void;
  initialValue?: {
    weight?: number;
    height?: number;
    age?: number;
    gender?: 'M' | 'F';
  };
}

export const MeasurementsStep: React.FC<MeasurementsStepProps> = ({
  onNext,
  onBack,
  initialValue = {}
}) => {
  const [weight, setWeight] = useState(initialValue.weight?.toString() || '');
  const [height, setHeight] = useState(initialValue.height?.toString() || '');
  const [age, setAge] = useState(initialValue.age?.toString() || '');
  const [gender, setGender] = useState<'M' | 'F' | ''>(initialValue.gender || '');

  const isValid =
    weight &&
    parseFloat(weight) > 0 &&
    height &&
    parseFloat(height) > 0 &&
    age &&
    parseInt(age) > 0 &&
    gender;

  const handleContinue = () => {
    if (isValid) {
      onNext({
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        gender: gender as 'M' | 'F'
      });
    }
  };

  return (
    <StepContainer currentStep={3} totalSteps={10} onBack={onBack} showBack>
      <div className="space-y-8">
        {/* Question */}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-nura-main dark:text-white">
            Vamos registrar suas medidas
          </h2>
          <p className="text-lg text-nura-muted dark:text-gray-300">
            Essas informações são essenciais para calcular suas necessidades nutricionais
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Weight */}
          <div>
            <label className="block text-sm font-semibold text-nura-main dark:text-white mb-2">
              Peso atual (kg)
            </label>
            <div className="relative">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex: 70"
                step="0.1"
                className="w-full px-6 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-gray-500 focus:border-nura-petrol dark:focus:border-primary focus:outline-none transition-colors"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-nura-muted dark:text-gray-400">
                kg
              </span>
            </div>
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-semibold text-nura-main dark:text-white mb-2">
              Altura (cm)
            </label>
            <div className="relative">
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Ex: 170"
                step="1"
                className="w-full px-6 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-gray-500 focus:border-nura-petrol dark:focus:border-primary focus:outline-none transition-colors"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-nura-muted dark:text-gray-400">
                cm
              </span>
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-semibold text-nura-main dark:text-white mb-2">
              Idade (anos)
            </label>
            <div className="relative">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ex: 30"
                step="1"
                className="w-full px-6 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-gray-500 focus:border-nura-petrol dark:focus:border-primary focus:outline-none transition-colors"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-nura-muted dark:text-gray-400">
                anos
              </span>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-nura-main dark:text-white mb-3">
              Sexo biológico
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGender('M')}
                className={`
                  p-4 rounded-xl border-2 font-semibold transition-all
                  ${
                    gender === 'M'
                      ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/10 text-nura-petrol dark:text-primary'
                      : 'border-gray-200 dark:border-gray-700 text-nura-main dark:text-gray-300 hover:border-nura-petrol/50 dark:hover:border-primary/50'
                  }
                `}
              >
                <span className="material-symbols-outlined block text-3xl mb-1">
                  male
                </span>
                Masculino
              </button>
              <button
                onClick={() => setGender('F')}
                className={`
                  p-4 rounded-xl border-2 font-semibold transition-all
                  ${
                    gender === 'F'
                      ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/10 text-nura-petrol dark:text-primary'
                      : 'border-gray-200 dark:border-gray-700 text-nura-main dark:text-gray-300 hover:border-nura-petrol/50 dark:hover:border-primary/50'
                  }
                `}
              >
                <span className="material-symbols-outlined block text-3xl mb-1">
                  female
                </span>
                Feminino
              </button>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          Continuar
        </button>
      </div>
    </StepContainer>
  );
};
