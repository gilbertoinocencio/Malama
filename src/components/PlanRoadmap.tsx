import React, { useState } from 'react';

interface Phase {
  id: number;
  title: string;
  subtitle: string;
  weeks: string;
  description: string;
  keyActions: string[];
  focus: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const PLAN_PHASES: Phase[] = [
  {
    id: 1,
    title: 'Fase 1: Adaptação',
    subtitle: 'Reorganização Alimentar Gradual',
    weeks: 'Semanas 1-4',
    description: 'Estabelecer fundações sólidas com hábitos alimentares consistentes e horários regulares.',
    keyActions: [
      'Estabelecer horários fixos para as refeições',
      'Incluir proteína magra em cada refeição principal',
      'Beber 3-4L de água por dia',
      'Permitir 1 refeição livre por semana sem culpa',
      'Observar sinais de energia e recuperação',
    ],
    focus: 'Construir a base sem radicalismos',
    icon: 'rocket_launch',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
  },
  {
    id: 2,
    title: 'Fase 2: Progressão',
    subtitle: 'Intensificação das Estratégias',
    weeks: 'Semanas 5-8',
    description: 'Ajustar distribuição de macronutrientes e timing nutricional para otimizar resultados.',
    keyActions: [
      'Ajustar carboidratos conforme treinos',
      'Implementar refeição pré/pós-treino estratégica',
      'Refinar timing de proteínas (a cada 3-4h)',
      'Monitorar composição corporal semanalmente',
      'Aumentar variedade de fontes proteicas',
    ],
    focus: 'Maximizar performance e resultados',
    icon: 'trending_up',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
  },
  {
    id: 3,
    title: 'Fase 3: Consolidação',
    subtitle: 'Autonomia Alimentar',
    weeks: 'Semanas 9-12',
    description: 'Manter resultados alcançados e desenvolver autonomia para escolhas alimentares conscientes.',
    keyActions: [
      'Praticar flexibilidade alimentar inteligente',
      'Identificar sinais de fome/saciedade',
      'Criar cardápio pessoal de receitas favoritas',
      'Planejar estratégia de manutenção pós-12 semanas',
      'Celebrar conquistas e ajustes finais',
    ],
    focus: 'Sustentabilidade e independência',
    icon: 'emoji_events',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
  },
];

interface PlanRoadmapProps {
  currentWeek?: number; // Week 1-12
}

export const PlanRoadmap: React.FC<PlanRoadmapProps> = ({ currentWeek = 1 }) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const getCurrentPhase = (): number => {
    if (currentWeek <= 4) return 1;
    if (currentWeek <= 8) return 2;
    return 3;
  };

  const currentPhase = getCurrentPhase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-Malama-main dark:text-white">
          Seu Plano de 3 Meses
        </h2>
        <p className="text-sm text-Malama-muted dark:text-gray-400">
          Jornada estruturada em 3 fases • Semana {currentWeek} de 12
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="relative px-8">
        <div className="absolute left-8 right-8 top-6 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentWeek / 12) * 100}%` }}
          />
        </div>

        <div className="relative flex justify-between items-start">
          {PLAN_PHASES.map((phase) => {
            const isActive = phase.id === currentPhase;
            const isCompleted = phase.id < currentPhase;

            return (
              <div key={phase.id} className="flex flex-col items-center gap-2">
                <div
                  className={`
                    size-12 rounded-full flex items-center justify-center border-4 transition-all
                    ${isActive
                      ? `${phase.bgColor} ${phase.borderColor} shadow-lg scale-110`
                      : isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }
                  `}
                >
                  <span
                    className={`
                      material-symbols-outlined text-2xl
                      ${isActive
                        ? phase.color
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? 'check_circle' : phase.icon}
                  </span>
                </div>
                <span className="text-xs font-semibold text-Malama-muted dark:text-gray-500 text-center">
                  {phase.weeks}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase Cards */}
      <div className="space-y-4">
        {PLAN_PHASES.map((phase) => {
          const isExpanded = expandedPhase === phase.id;
          const isActive = phase.id === currentPhase;
          const isCompleted = phase.id < currentPhase;

          return (
            <div
              key={phase.id}
              className={`
                rounded-3xl border-2 overflow-hidden transition-all
                ${isActive
                  ? `${phase.borderColor} shadow-lg`
                  : isCompleted
                  ? 'border-green-200 dark:border-green-700'
                  : 'border-Malama-border dark:border-gray-700'
                }
              `}
            >
              {/* Phase Header */}
              <button
                type="button"
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className={`
                  w-full p-5 flex items-start gap-4 transition-colors
                  ${isActive
                    ? phase.bgColor
                    : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/10'
                    : 'bg-white dark:bg-surface-dark'
                  }
                  hover:opacity-90
                `}
              >
                {/* Icon */}
                <div
                  className={`
                    size-14 rounded-2xl flex items-center justify-center flex-shrink-0
                    ${isActive
                      ? 'bg-white dark:bg-surface-dark shadow-md'
                      : isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                    }
                  `}
                >
                  <span
                    className={`
                      material-symbols-outlined text-3xl
                      ${isActive
                        ? phase.color
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? 'check_circle' : phase.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-Malama-main dark:text-white">
                      {phase.title}
                    </h3>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-Malama-petrol dark:bg-primary text-white text-xs font-bold">
                        Atual
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">
                        Completo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-Malama-muted dark:text-gray-400 mb-1">
                    {phase.subtitle}
                  </p>
                  <p className="text-xs text-Malama-muted dark:text-gray-500">
                    {phase.weeks}
                  </p>
                </div>

                {/* Expand Icon */}
                <span
                  className={`
                    material-symbols-outlined text-Malama-muted dark:text-gray-400 transition-transform
                    ${isExpanded ? 'rotate-180' : ''}
                  `}
                >
                  expand_more
                </span>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 bg-white dark:bg-surface-dark animate-fade-in">
                  <p className="text-sm text-Malama-main dark:text-white leading-relaxed">
                    {phase.description}
                  </p>

                  {/* Key Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-Malama-main dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">checklist</span>
                      Ações-Chave desta Fase:
                    </h4>
                    <ul className="space-y-2">
                      {phase.keyActions.map((action, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 text-sm text-Malama-muted dark:text-gray-300"
                        >
                          <span className={`material-symbols-outlined text-[18px] mt-0.5 ${phase.color}`}>
                            check_circle
                          </span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Focus */}
                  <div className={`p-4 rounded-2xl ${phase.bgColor} border ${phase.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[20px] ${phase.color}`}>
                        psychology
                      </span>
                      <p className="text-sm">
                        <span className="font-bold text-Malama-main dark:text-white">Foco: </span>
                        <span className="text-Malama-muted dark:text-gray-300">{phase.focus}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="bg-Malama-pastel-orange/20 dark:bg-primary/10 border border-Malama-petrol/30 dark:border-primary/30 rounded-2xl p-5 text-center">
        <p className="text-sm text-Malama-muted dark:text-gray-300 leading-relaxed">
          <span className="font-bold text-Malama-main dark:text-white">Lembre-se:</span> Este plano é flexível e será ajustado conforme seus check-ins diários e progresso semanal.
        </p>
      </div>
    </div>
  );
};

export default PlanRoadmap;
