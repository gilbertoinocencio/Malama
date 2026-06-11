import React, { useState } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const PLANS = [
  {
    id: 'mensal',
    icon: 'calendar_month',
    title: 'Mensal',
    subtitle: 'Pagamento flexível',
    price: 'R$ 39,90',
    period: '/mês',
    badge: null,
  },
  {
    id: 'anual',
    icon: 'verified',
    title: 'Anual',
    subtitle: 'Apenas R$ 24,99 por mês',
    price: 'R$ 299,90',
    period: '/ano',
    originalPrice: 'R$ 478,80',
    badge: 'Melhor valor',
  },
  {
    id: 'trimestral',
    icon: 'calendar_view_week',
    title: 'Trimestral',
    subtitle: 'R$ 89,90 a cada 3 meses',
    price: 'R$ 29,96',
    period: '/mês',
    badge: null,
  },
];

const TRUST = [
  { icon: 'lock',          label: 'Pagamento Seguro' },
  { icon: 'event_repeat',  label: 'Cancele quando quiser' },
  { icon: 'history',       label: '7 dias de garantia' },
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
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Escolha seu plano
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Sua jornada personalizada para uma vida mais equilibrada começa aqui.
        </p>
      </div>

      {/* Plans */}
      <div className="space-y-3 mb-6">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className="relative w-full text-left rounded-2xl border shadow-sm p-5 transition-all duration-200 flex items-center justify-between"
              style={{
                background: 'white',
                borderColor: isSelected ? PETROL : '#f5f5f4',
                borderWidth: isSelected ? '1.5px' : '1px',
              }}
            >
              {plan.badge && (
                <div
                  className="absolute -top-2.5 left-5 px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-light text-white"
                  style={{ background: PETROL }}
                >
                  {plan.badge}
                </div>
              )}

              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isSelected ? `${PETROL}15` : '#f5f5f4' }}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ color: isSelected ? PETROL : '#a8a29e' }}
                  >
                    {plan.icon}
                  </span>
                </div>
                <div>
                  <p
                    className="text-base"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: isSelected ? '#292524' : '#57534e',
                    }}
                  >
                    {plan.title}
                  </p>
                  <p className="text-stone-400 text-xs font-light">{plan.subtitle}</p>
                </div>
              </div>

              <div className="text-right">
                {plan.originalPrice && (
                  <p className="text-stone-300 text-xs line-through mb-0.5">{plan.originalPrice}</p>
                )}
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span
                    className="text-xl"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: isSelected ? PETROL : '#78716c',
                    }}
                  >
                    {plan.price}
                  </span>
                </div>
                <p className="text-stone-400 text-xs font-light">{plan.period}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TRUST.map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 p-3 bg-white border border-stone-100 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-stone-400 text-base">{icon}</span>
            <span className="text-xs text-stone-500 font-light">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
        <p className="text-[11px] text-amber-800 leading-relaxed text-center">
          ⚕️ O Malama tem caráter informativo e educativo e não substitui a consulta, o diagnóstico ou o tratamento de um profissional de saúde. Consulte sempre um médico ou nutricionista para orientações médicas.
        </p>
      </div>

      <p className="text-center text-[10px] text-stone-400 font-light uppercase tracking-widest mt-4">
        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
      </p>
    </StepContainer>
  );
};

export default AssinaturasStep;
