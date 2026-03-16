import React, { useState } from 'react';
import { StepLayout } from './StepLayout';
import { ScaleSlider } from './ScaleSlider';
import { SelectionCard } from './SelectionCard';

interface WellnessStepProps {
  intermittentFasting?: { enabled: boolean; window?: string; startTime?: string };
  gutHealth?: number;
  energyLevel?: number;
  sleepQuality?: number;
  stressLevel?: number;
  onNext: (data: {
    intermittentFasting: { enabled: boolean; window?: string; startTime?: string };
    gutHealth: number;
    energyLevel: number;
    sleepQuality: number;
    stressLevel: number;
  }) => void;
  onBack: () => void;
}

export const WellnessStep: React.FC<WellnessStepProps> = ({
  intermittentFasting: initialIF = { enabled: false },
  gutHealth: initialGutHealth = 5,
  energyLevel: initialEnergyLevel = 5,
  sleepQuality: initialSleepQuality = 5,
  stressLevel: initialStressLevel = 5,
  onNext,
  onBack,
}) => {
  const [ifEnabled, setIfEnabled] = useState(initialIF.enabled);
  const [ifWindow, setIfWindow] = useState(initialIF.window || '16:8');
  const [gutHealth, setGutHealth] = useState(initialGutHealth);
  const [energyLevel, setEnergyLevel] = useState(initialEnergyLevel);
  const [sleepQuality, setSleepQuality] = useState(initialSleepQuality);
  const [stressLevel, setStressLevel] = useState(initialStressLevel);

  const handleNext = () => {
    onNext({
      intermittentFasting: {
        enabled: ifEnabled,
        window: ifEnabled ? ifWindow : undefined,
      },
      gutHealth,
      energyLevel,
      sleepQuality,
      stressLevel,
    });
  };

  return (
    <StepLayout
      title="Bem-estar"
      subtitle="Essas informações nos ajudam a criar um plano mais personalizado"
      icon="health_and_safety"
      onNext={handleNext}
      onBack={onBack}
      progress={77}
    >
      <div className="space-y-6">
        {/* Intermittent Fasting */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Você pratica jejum intermitente?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <SelectionCard
              icon="schedule"
              title="Sim"
              selected={ifEnabled}
              onClick={() => setIfEnabled(true)}
            />
            <SelectionCard
              icon="cancel"
              title="Não"
              selected={!ifEnabled}
              onClick={() => setIfEnabled(false)}
            />
          </div>

          {ifEnabled && (
            <div className="space-y-2 animate-fade-in">
              <label className="block text-xs font-semibold text-nura-main dark:text-white">
                Janela de alimentação
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['16:8', '18:6', '20:4'].map((window) => (
                  <button
                    key={window}
                    type="button"
                    onClick={() => setIfWindow(window)}
                    className={`
                      py-2.5 rounded-xl font-semibold text-sm transition-all
                      ${ifWindow === window
                        ? 'bg-nura-petrol dark:bg-primary text-white shadow-md'
                        : 'bg-white dark:bg-surface-dark border-2 border-nura-border dark:border-gray-700 text-nura-main dark:text-white'
                      }
                    `}
                  >
                    {window}
                  </button>
                ))}
              </div>
              <p className="text-xs text-nura-muted dark:text-gray-500">
                Ex: 16:8 = 16h jejum, 8h alimentação
              </p>
            </div>
          )}
        </div>

        {/* Health Metrics */}
        <div className="space-y-5 bg-white dark:bg-surface-dark border border-nura-border dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-nura-main dark:text-white text-center">
            Como você avalia atualmente?
          </p>

          <ScaleSlider
            label="Saúde Intestinal"
            icon="nutrition"
            value={gutHealth}
            onChange={setGutHealth}
            lowLabel="Ruim"
            highLabel="Ótima"
          />

          <ScaleSlider
            label="Nível de Energia"
            icon="bolt"
            value={energyLevel}
            onChange={setEnergyLevel}
            lowLabel="Baixo"
            highLabel="Alto"
          />

          <ScaleSlider
            label="Qualidade do Sono"
            icon="bedtime"
            value={sleepQuality}
            onChange={setSleepQuality}
            lowLabel="Ruim"
            highLabel="Ótima"
          />

          <ScaleSlider
            label="Nível de Estresse"
            icon="psychology_alt"
            value={stressLevel}
            onChange={setStressLevel}
            lowLabel="Baixo"
            highLabel="Alto"
          />
        </div>

        {/* Info */}
        <div className="bg-nura-pastel-orange/20 dark:bg-primary/5 border border-nura-petrol/20 dark:border-primary/20 rounded-2xl p-4">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[20px] mt-0.5">
              info
            </span>
            <div className="flex-1">
              <p className="text-xs text-nura-muted dark:text-gray-400 leading-relaxed">
                Essas informações nos ajudam a identificar possíveis ajustes na alimentação para melhorar seu bem-estar geral.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepLayout>
  );
};

export default WellnessStep;
