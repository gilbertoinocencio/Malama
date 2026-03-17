import React, { useState } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PricingStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = [
    {
      id: 'monthly',
      name: 'Mensal',
      price: '€9.99',
      period: 'por mês',
      savings: null,
      popular: false
    },
    {
      id: 'quarterly',
      name: 'Trimestral',
      price: '€7.99',
      period: 'por mês',
      savings: 'Poupe 20%',
      popular: true
    },
    {
      id: 'yearly',
      name: 'Anual',
      price: '€4.99',
      period: 'por mês',
      savings: 'Poupe 50%',
      popular: false
    }
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Escolha o seu plano
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              🎁 Comece com 7 dias grátis
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cancele a qualquer momento, sem compromisso
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-4 max-w-md w-full">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all text-left w-full ${
                  selectedPlan === plan.id
                    ? 'border-green-500 dark:border-green-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      {plan.name}
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {plan.price}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                        {plan.period}
                      </span>
                    </div>
                    {plan.savings && (
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                        {plan.savings}
                      </div>
                    )}
                  </div>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === plan.id
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedPlan === plan.id && (
                      <span className="material-symbols-outlined text-white text-sm">
                        check
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Features List */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-md w-full">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              ✨ Todos os planos incluem:
            </div>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <li>• Plano personalizado com IA</li>
              <li>• Coach nutricional 24/7</li>
              <li>• Receitas ilimitadas</li>
              <li>• Acompanhamento de progresso</li>
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-full font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            Começar teste grátis de 7 dias
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Após o período de teste, será cobrado {plans.find(p => p.id === selectedPlan)?.price}/mês
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default PricingStep;
