import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PaywallFeaturesStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const freeFeatures = [
    'Plano alimentar básico',
    'Rastreamento de refeições',
    'Cálculo de calorias'
  ];

  const premiumFeatures = [
    'Plano alimentar personalizado com IA',
    'Sugestões diárias de refeições',
    'Coach nutricional 24/7',
    'Rastreamento avançado de macros',
    'Gráficos de progresso detalhados',
    'Receitas exclusivas (500+)',
    'Lembretes inteligentes',
    'Scanner de código de barras',
    'Planos de jejum intermitente',
    'Suporte prioritário'
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Compare os planos
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start gap-6 overflow-y-auto">
          {/* Free Plan */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Plano Gratuito
              </h3>
              <span className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                €0
              </span>
            </div>
            <div className="space-y-2">
              {freeFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-lg">
                    check
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-6 max-w-md w-full border-2 border-green-300 dark:border-green-700 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                RECOMENDADO
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Plano Premium
              </h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  €9.99
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  por mês
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
                    check_circle
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                🎁 7 dias de teste grátis
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Ver opções de preço
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default PaywallFeaturesStep;
