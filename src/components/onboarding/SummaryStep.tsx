import React from 'react';
import { StepLayout } from './StepLayout';
import { OnboardingData } from '../../services/nutritionistAgentService';

interface SummaryStepProps {
  data: OnboardingData;
  onNext: () => void;
  onBack: () => void;
  onEdit: (step: number) => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  data,
  onNext,
  onBack,
  onEdit,
}) => {
  const getGoalLabel = (goal?: string) => {
    const labels: Record<string, string> = {
      emagrecimento: 'Emagrecimento',
      ganho_massa: 'Ganho de Massa',
      performance: 'Performance',
      saude: 'Saúde',
      aesthetic: 'Estético',
      health: 'Saúde',
    };
    return goal ? labels[goal] || goal : '-';
  };

  const getBiotypeLabel = (biotype?: string) => {
    const labels: Record<string, string> = {
      ecto: 'Ectomorfo',
      meso: 'Mesomorfo',
      endo: 'Endomorfo',
    };
    return biotype ? labels[biotype] || biotype : '-';
  };

  const getIntensityLabel = (intensity?: string) => {
    const labels: Record<string, string> = {
      leve: 'Leve',
      moderada: 'Moderada',
      alta: 'Alta',
    };
    return intensity ? labels[intensity] || intensity : '-';
  };

  return (
    <StepLayout
      title="Resumo do Perfil"
      subtitle="Revise suas informações antes de finalizar"
      icon="assignment_turned_in"
      onNext={onNext}
      onBack={onBack}
      nextLabel="Finalizar e Criar Plano"
      progress={88}
    >
      <div className="space-y-4">
        {/* Basic Info */}
        <SummarySection
          title="Informações Básicas"
          icon="person"
          onEdit={() => onEdit(1)}
        >
          <SummaryItem label="Nome" value={data.fullName || '-'} />
          <SummaryItem label="Idade" value={data.age ? `${data.age} anos` : '-'} />
          <SummaryItem label="Sexo" value={data.biologicalSex === 'M' ? 'Masculino' : data.biologicalSex === 'F' ? 'Feminino' : '-'} />
        </SummarySection>

        {/* Anthropometry */}
        <SummarySection
          title="Medidas"
          icon="straighten"
          onEdit={() => onEdit(2)}
        >
          <SummaryItem label="Altura" value={data.height ? `${data.height} cm` : '-'} />
          <SummaryItem label="Peso" value={data.weight ? `${data.weight} kg` : '-'} />
          <SummaryItem label="IMC" value={data.bmi ? `${data.bmi}` : '-'} />
          {data.bodyFatPercentage && (
            <SummaryItem label="% Gordura" value={`${data.bodyFatPercentage}%`} />
          )}
        </SummarySection>

        {/* Goals */}
        <SummarySection
          title="Objetivo"
          icon="flag"
          onEdit={() => onEdit(3)}
        >
          <SummaryItem label="Meta Principal" value={getGoalLabel(data.mainGoal)} />
          <SummaryItem label="Biotipo" value={getBiotypeLabel(data.biotype)} />
        </SummarySection>

        {/* Activity */}
        <SummarySection
          title="Atividade Física"
          icon="sports_gymnastics"
          onEdit={() => onEdit(4)}
        >
          <SummaryItem
            label="Atividades"
            value={data.activityTypes && data.activityTypes.length > 0 ? data.activityTypes.join(', ') : '-'}
          />
          <SummaryItem label="Frequência" value={data.weeklyFrequency ? `${data.weeklyFrequency}x/semana` : '-'} />
          <SummaryItem label="Intensidade" value={getIntensityLabel(data.intensity)} />
        </SummarySection>

        {/* Nutrition */}
        <SummarySection
          title="Alimentação"
          icon="restaurant"
          onEdit={() => onEdit(5)}
        >
          <SummaryItem
            label="Restrições"
            value={data.restrictions && data.restrictions.length > 0 ? data.restrictions.join(', ') : 'Nenhuma'}
          />
          <SummaryItem
            label="Preferências"
            value={data.preferences && data.preferences.length > 0 ? data.preferences.join(', ') : 'Não informado'}
          />
        </SummarySection>

        {/* Wellness */}
        <SummarySection
          title="Bem-estar"
          icon="health_and_safety"
          onEdit={() => onEdit(6)}
        >
          <SummaryItem
            label="Jejum Intermitente"
            value={data.intermittentFasting?.enabled ? `Sim (${data.intermittentFasting.window})` : 'Não'}
          />
          <SummaryItem label="Saúde Intestinal" value={data.gutHealth ? `${data.gutHealth}/10` : '-'} />
          <SummaryItem label="Nível de Energia" value={data.energyLevel ? `${data.energyLevel}/10` : '-'} />
          <SummaryItem label="Qualidade do Sono" value={data.sleepQuality ? `${data.sleepQuality}/10` : '-'} />
          <SummaryItem label="Nível de Estresse" value={data.stressLevel ? `${data.stressLevel}/10` : '-'} />
        </SummarySection>

        {/* Info */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-4">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px] mt-0.5">
              verified
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                Tudo pronto!
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                Com essas informações, vamos criar um plano alimentar personalizado de 3 meses para você alcançar seus objetivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepLayout>
  );
};

// Helper Components
interface SummarySectionProps {
  title: string;
  icon: string;
  onEdit: () => void;
  children: React.ReactNode;
}

const SummarySection: React.FC<SummarySectionProps> = ({ title, icon, onEdit, children }) => {
  return (
    <div className="bg-white dark:bg-surface-dark border border-nura-border dark:border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-nura-border dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-[20px]">
            {icon}
          </span>
          <h3 className="text-sm font-bold text-nura-main dark:text-white">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-nura-petrol dark:text-primary hover:underline"
        >
          Editar
        </button>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
};

interface SummaryItemProps {
  label: string;
  value: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-nura-muted dark:text-gray-400">{label}</span>
      <span className="font-semibold text-nura-main dark:text-white">{value}</span>
    </div>
  );
};

export default SummaryStep;
