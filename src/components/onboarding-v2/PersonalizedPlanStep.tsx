import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PersonalizedPlanStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const features = [
    {
      icon: 'restaurant',
      title: 'Refeições personalizadas',
      description: 'Sugestões diárias adaptadas aos seus gostos e objetivos'
    },
    {
      icon: 'insights',
      title: 'Acompanhamento inteligente',
      description: 'Análise de progresso com IA e ajustes automáticos'
    },
    {
      icon: 'notifications_active',
      title: 'Lembretes personalizados',
      description: 'Notificações nos horários que você escolheu'
    },
    {
      icon: 'auto_awesome',
      title: 'Coach nutricional IA',
      description: 'Assistente disponível 24/7 para suas dúvidas'
    }
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              O seu plano personalizado
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Tudo o que precisa num só lugar
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Ferramentas criadas especialmente para você
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-md w-full">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                      {feature.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Seguinte
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default PersonalizedPlanStep;
