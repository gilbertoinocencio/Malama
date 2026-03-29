import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const BeneficiosJejumStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  const BENEFITS = [
    {
      title: 'Autofagia',
      desc: 'A reciclagem celular inteligente. Seu corpo identifica e remove componentes danificados, promovendo a renovação biológica.',
      icon: 'repeat'
    },
    {
      title: 'Queima de Gordura',
      desc: 'A transição metabólica para a cetose. Sua reserva de gordura torna-se a principal fonte de energia limpa e constante.',
      icon: 'local_fire_department'
    },
    {
      title: 'Clareza Mental',
      desc: 'Redução da névoa cerebral. O aumento do BDNF protege seus neurônios e potencializa seu foco e desempenho cognitivo.',
      icon: 'psychology'
    }
  ];

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
      nextLabel="Continuar Jornada"
    >
      <div className="w-full mb-12 text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold text-tertiary mb-6 leading-tight tracking-tighter">
          O Poder do Jejum
        </h1>
        <p className="text-lg text-on-surface-variant font-light leading-relaxed max-w-md">
          Sua biologia está prestes a entrar em um estado de restauração profunda. Veja o que acontece com você.
        </p>
      </div>

      <div className="w-full space-y-6">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="group bg-surface-container-lowest p-8 rounded-xl transition-all duration-500 hover:bg-surface-container-low flex items-start gap-8 shadow-[0_16px_32px_rgba(0,0,0,0.02)]">
            <div className="bg-secondary-container/30 p-4 rounded-xl text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-4xl">{benefit.icon}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-tertiary mb-2">{benefit.title}</h3>
              <p className="text-on-surface-variant text-sm font-normal leading-relaxed">
                {benefit.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </StepContainer>
  );
};

export default BeneficiosJejumStep;
