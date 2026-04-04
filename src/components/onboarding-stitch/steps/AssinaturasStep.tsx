import React, { useState } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PLANS = [
  {
    id: 'mensal',
    icon: 'calendar_month',
    title: 'Mensal',
    subtitle: 'Pagamento flexível',
    price: 'R$ 39,90',
    period: '/mês',
    highlight: false,
  },
  {
    id: 'anual',
    icon: 'verified',
    title: 'Anual',
    subtitle: 'Apenas R$ 24,99 por mês',
    price: 'R$ 299,90',
    period: '',
    originalPrice: 'R$ 478,80 total',
    badge: 'Melhor Valor',
    highlight: true,
  },
  {
    id: 'trimestral',
    icon: 'calendar_view_week',
    title: 'Trimestral',
    subtitle: 'R$ 89,90 a cada 3 meses',
    price: 'R$ 29,96',
    period: '/mês',
    highlight: false,
  },
];

const TRUST = [
  { icon: 'lock', label: 'Pagamento Seguro' },
  { icon: 'event_repeat', label: 'Cancele quando quiser' },
  { icon: 'history', label: '7 dias de garantia' },
  { icon: 'support_agent', label: 'Suporte 24/7' },
];

const AssinaturasStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  const [selected, setSelected] = useState('anual');

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Iniciar minha jornada"
      secondaryLabel="Continuar sem premium"
    >
      {/* Decorative blurs */}

      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-10">
          <p className="font-headline text-secondary font-semibold tracking-widest text-xs mb-4 uppercase">
            Passo {currentStep} de {totalSteps}
          </p>
          <h2 className="font-headline text-4xl font-bold text-primary leading-tight mb-4">
            Escolha o seu fluxo <br />
            <span className="text-secondary">de bem-estar.</span>
          </h2>
          <p className="font-body text-on-surface-variant text-lg max-w-md">
            Sua jornada personalizada para uma vida mais equilibrada começa aqui.
          </p>
        </header>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative flex flex-col p-8 rounded-lg text-left transition-all duration-300 ${
                plan.highlight
                  ? 'bg-primary-container shadow-2xl md:scale-105 z-10 overflow-hidden'
                  : selected === plan.id
                  ? 'bg-surface-container border-2 border-primary/30'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-secondary text-white px-3 py-1 rounded-bl-lg font-headline text-[10px] font-bold tracking-widest uppercase">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <span
                  className={`material-symbols-outlined text-3xl ${plan.highlight ? 'text-secondary-fixed' : 'text-primary'}`}
                  style={plan.id === 'anual' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {plan.icon}
                </span>
              </div>

              <h3 className={`font-headline font-bold mb-2 ${plan.highlight ? 'text-white text-3xl' : 'text-primary text-2xl'}`}>
                {plan.title}
              </h3>

              {plan.highlight && (
                <p className="text-on-primary-container/80 text-sm mb-4 leading-relaxed">
                  Acesso total a todas as funcionalidades premium.
                </p>
              )}

              <div className="mt-auto">
                {plan.originalPrice && (
                  <p className="text-white/60 text-sm mb-1 line-through">{plan.originalPrice}</p>
                )}
                {!plan.highlight && (
                  <p className="text-on-surface-variant text-sm mb-1">{plan.subtitle}</p>
                )}
                <div className="flex items-baseline gap-1">
                  <span className={`font-bold ${plan.highlight ? 'text-secondary-fixed text-4xl' : 'text-primary text-3xl'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-on-surface-variant text-sm">{plan.period}</span>
                  )}
                </div>
                {plan.highlight && (
                  <p className="text-on-primary-container font-medium text-xs mt-2">{plan.subtitle}</p>
                )}
              </div>

              {plan.highlight && (
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary opacity-20 rounded-full blur-2xl pointer-events-none"></div>
              )}
            </button>
          ))}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {TRUST.map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 p-4 bg-surface-container-lowest rounded-lg">
              <span className="material-symbols-outlined text-secondary text-xl">{icon}</span>
              <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60">
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </StepContainer>
  );
};

export default AssinaturasStep;
