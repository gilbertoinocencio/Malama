import React from 'react';
import { StepLayout } from './StepLayout';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <StepLayout
      title="Bem-vindo ao NURA"
      subtitle="Vamos criar seu plano alimentar personalizado de 3 meses baseado em evidências científicas"
      icon="auto_awesome"
      onNext={onNext}
      nextLabel="Começar"
      progress={0}
    >
      <div className="space-y-6 py-4">
        {/* Feature Cards */}
        <div className="space-y-3">
          <FeatureItem
            icon="psychology"
            title="Nutricionista IA"
            description="Atendimento personalizado com inteligência artificial"
          />
          <FeatureItem
            icon="restaurant"
            title="Plano de 3 Meses"
            description="Adaptação, progressão e consolidação dos resultados"
          />
          <FeatureItem
            icon="insights"
            title="Baseado em Ciência"
            description="Estratégias validadas por estudos científicos"
          />
          <FeatureItem
            icon="favorite"
            title="Respeita sua Realidade"
            description="Adaptado à sua rotina, cultura e preferências"
          />
        </div>

        {/* Info Box */}
        <div className="bg-nura-pastel-orange/20 dark:bg-primary/5 border border-nura-petrol/20 dark:border-primary/20 rounded-2xl p-4">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[20px] mt-0.5">
              info
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-nura-main dark:text-white">
                Levará apenas 3-5 minutos
              </p>
              <p className="text-xs text-nura-muted dark:text-gray-400">
                Faremos algumas perguntas para entender seu perfil, objetivos e estilo de vida.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepLayout>
  );
};

// Helper Component
interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-surface-dark rounded-2xl border border-nura-border dark:border-gray-700">
      <div className="size-12 rounded-xl bg-nura-petrol/10 dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-2xl">
          {icon}
        </span>
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-bold text-nura-main dark:text-white">{title}</h3>
        <p className="text-xs text-nura-muted dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default WelcomeStep;
