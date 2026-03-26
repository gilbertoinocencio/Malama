import React, { useState } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'muito_ativo';

const NivelAtividadeStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [nivel, setNivel] = useState<NivelAtividade>(data.nivelAtividade || 'moderado');

  const handleSelect = (value: NivelAtividade) => {
    setNivel(value);
    updateData({ nivelAtividade: value });
  };

  const handleContinue = () => {
    onNext();
  };

  const activities = [
    {
      id: 'sedentario' as NivelAtividade,
      icon: 'airline_seat_recline_normal',
      title: 'Sedentário',
      description: 'Passo a maior parte do dia sentado, pouco esforço físico.',
    },
    {
      id: 'leve' as NivelAtividade,
      icon: 'directions_walk',
      title: 'Levemente ativo',
      description: 'Caminhadas leves ou atividades domésticas rotineiras.',
    },
    {
      id: 'moderado' as NivelAtividade,
      icon: 'fitness_center',
      title: 'Moderadamente ativo',
      description: 'Exercícios moderados 3-5 vezes por semana.',
    },
    {
      id: 'muito_ativo' as NivelAtividade,
      icon: 'bolt',
      title: 'Muito ativo',
      description: 'Atividade física intensa diária ou trabalho braçal.',
    },
  ];

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
      showFooter={false}
    >
      {/* Main Content Canvas */}
      <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-12 space-y-4">
          <p className="text-sm font-label font-medium text-primary uppercase tracking-[0.2em] opacity-60">
            Passo {currentStep} de {totalSteps}
          </p>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary leading-tight">
            Nível de atividade física
          </h1>
          <p className="text-on-surface-variant text-lg font-body">Como é o seu dia a dia?</p>
        </div>

        {/* Activity Options Bento Grid-ish Layout */}
        <div className="grid grid-cols-1 gap-4">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => handleSelect(activity.id)}
              className={`group relative flex items-center p-6 rounded-lg transition-all duration-300 active:scale-[0.98] text-left ${
                nivel === activity.id
                  ? 'bg-primary-fixed-dim shadow-md'
                  : 'bg-surface-container-low hover:bg-surface-container-highest border-2 border-transparent hover:border-outline-variant/10'
              }`}
            >
              <div
                className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center mr-6 shadow-sm ${
                  nivel === activity.id
                    ? 'bg-on-primary'
                    : 'bg-surface-container-lowest group-hover:bg-white'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${
                    nivel === activity.id ? 'text-secondary' : 'text-[#005F6B]'
                  }`}
                  style={nivel === activity.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                  data-icon={activity.icon}
                >
                  {activity.icon}
                </span>
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-headline font-semibold text-xl mb-1 ${
                      nivel === activity.id ? 'text-primary' : 'text-primary'
                    }`}
                  >
                    {activity.title}
                  </h3>
                  {nivel === activity.id && (
                    <span
                      className="material-symbols-outlined text-secondary"
                      data-icon="check_circle"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm leading-relaxed ${
                    nivel === activity.id ? 'text-primary/70 font-medium' : 'text-on-surface-variant'
                  }`}
                >
                  {activity.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </main>


      {/* Decorative Leaf Element (Background Context) */}
      <div className="fixed top-1/4 -right-24 w-64 h-64 bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-1/4 -left-24 w-48 h-48 bg-primary-container/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>

      {/* Contextual Footer Actions */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface via-surface/90 to-transparent flex items-center justify-end gap-4">
        <div className="flex items-center gap-4 w-full max-w-2xl justify-end">
          <button
            onClick={onBack}
            className="h-14 px-8 rounded-lg font-label font-semibold text-primary hover:bg-surface-container transition-all duration-300"
          >
            Voltar
          </button>
          <button
            onClick={handleContinue}
            className="h-16 px-12 rounded-lg font-headline font-bold text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-300"
          >
            Continuar
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default NivelAtividadeStep;
