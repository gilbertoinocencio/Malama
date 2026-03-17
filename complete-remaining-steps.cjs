const fs = require('fs');
const path = require('path');

const stepsDir = path.join(__dirname, 'src', 'components', 'onboarding-v2');

// GoalSuccessStep
const goalSuccessContent = `import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const GoalSuccessStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={false}>
      <div className="flex flex-col h-full justify-center items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-2xl"
        >
          <motion.div
            animate={{ rotate: showConfetti ? [0, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5, repeat: showConfetti ? Infinity : 0 }}
            className="text-8xl mb-6"
          >
            🎉
          </motion.div>

          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Objetivo definido com sucesso!
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Estamos prontos para começar a sua jornada de transformação
          </p>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                  emoji_events
                </span>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Plano personalizado criado
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Baseado em {currentStep - 1} respostas suas
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onNext}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-8 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Ver meu plano
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      </div>
    </StepContainer>
  );
};

export default GoalSuccessStep;
`;

// PersonalizedPlanStep
const personalizedPlanContent = `import React from 'react';
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
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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
`;

// SocialProofStep
const socialProofContent = `import React, { useState } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const SocialProofStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: 'Maria Silva',
      age: 32,
      result: 'Perdeu 12kg em 3 meses',
      text: 'O Nura mudou completamente a minha relação com a comida. Aprendi a comer melhor sem passar fome!',
      rating: 5
    },
    {
      name: 'João Santos',
      age: 45,
      result: 'Perdeu 18kg em 5 meses',
      text: 'Finalmente consegui atingir o meu peso ideal. O acompanhamento personalizado fez toda a diferença.',
      rating: 5
    },
    {
      name: 'Ana Costa',
      age: 28,
      result: 'Perdeu 8kg em 2 meses',
      text: 'Adorei as sugestões de refeições! São práticas e deliciosas. Recomendo a todos!',
      rating: 5
    }
  ];

  const stats = [
    { value: '50k+', label: 'Utilizadores ativos' },
    { value: '4.8⭐', label: 'Avaliação média' },
    { value: '85%', label: 'Taxa de sucesso' }
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Histórias de sucesso
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md w-full mb-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full border-2 border-gray-100 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                {testimonials[currentTestimonial].name.charAt(0)}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {testimonials[currentTestimonial].name}, {testimonials[currentTestimonial].age} anos
              </h3>
              <p className="text-green-600 dark:text-green-400 font-semibold text-sm">
                {testimonials[currentTestimonial].result}
              </p>
            </div>

            <div className="mb-4 flex justify-center gap-1">
              {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                <span key={i} className="text-yellow-500 text-xl">⭐</span>
              ))}
            </div>

            <p className="text-gray-700 dark:text-gray-300 text-center italic mb-6">
              "{testimonials[currentTestimonial].text}"
            </p>

            <div className="flex justify-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={\`w-2 h-2 rounded-full transition-all \${
                    currentTestimonial === index
                      ? 'bg-green-500 w-6'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }\`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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

export default SocialProofStep;
`;

// PaywallFeaturesStep
const paywallFeaturesContent = `import React from 'react';
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
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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
`;

// PricingStep
const pricingContent = `import React, { useState } from 'react';
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
                className={\`relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all text-left w-full \${
                  selectedPlan === plan.id
                    ? 'border-green-500 dark:border-green-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700'
                }\`}
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

                  <div className={\`w-6 h-6 rounded-full border-2 flex items-center justify-center \${
                    selectedPlan === plan.id
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }\`}>
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
`;

const steps = [
  { filename: 'GoalSuccessStep.tsx', content: goalSuccessContent },
  { filename: 'PersonalizedPlanStep.tsx', content: personalizedPlanContent },
  { filename: 'SocialProofStep.tsx', content: socialProofContent },
  { filename: 'PaywallFeaturesStep.tsx', content: paywallFeaturesContent },
  { filename: 'PricingStep.tsx', content: pricingContent }
];

steps.forEach(({ filename, content }) => {
  const filePath = path.join(stepsDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Created ${filename}`);
});

console.log('✨ All remaining steps completed!');
