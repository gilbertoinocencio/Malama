import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const ImpactoAguaStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      progress={(currentStep / totalSteps) * 100}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      {/* Background Decorative Leaf */}
      <div className="fixed -right-20 top-40 opacity-10 pointer-events-none rotate-12">
        <span
          className="material-symbols-outlined text-[300px] text-secondary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          eco
        </span>
      </div>

      <main className="min-h-screen pt-28 pb-32 px-6 max-w-md mx-auto flex flex-col items-center">
        {/* Editorial Header Section */}
        <section className="w-full mb-12 animate-fade-in">
          <p className="font-headline text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-3 font-semibold">
            NURA Flow Identity
          </p>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary leading-tight">
            O impacto visual <br />
            da água
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg font-medium leading-relaxed">
            Manter-se hidratado não é apenas sobre sede. É o combustível silencioso do seu metabolismo.
          </p>
        </section>

        {/* Bento Grid Visualization Cards */}
        <div className="w-full space-y-6">
          {/* Card 1: Mental Clarity */}
          <div className="bg-primary p-8 rounded-xl text-on-primary relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute top-0 right-0 opacity-10">
              <span
                className="material-symbols-outlined text-[120px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
            </div>
            <div className="relative z-10">
              <div className="mb-4">
                <span
                  className="material-symbols-outlined text-4xl text-primary-fixed-dim"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  neurology
                </span>
              </div>
              <h3 className="font-headline font-bold text-2xl mb-3">Clareza Mental</h3>
              <p className="text-primary-fixed-dim text-sm leading-relaxed">
                Apenas 2% de desidratação pode reduzir sua capacidade cognitiva em até 30%.
              </p>
            </div>
          </div>

          {/* Card 2: Energy Boost */}
          <div className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 right-0 opacity-5">
              <span
                className="material-symbols-outlined text-[120px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </div>
            <div className="relative z-10">
              <div className="mb-4">
                <span
                  className="material-symbols-outlined text-4xl text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  energy_savings_leaf
                </span>
              </div>
              <h3 className="font-headline font-bold text-2xl mb-3 text-primary">Energia Sustentada</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Hidratação adequada melhora a oxigenação celular e aumenta seus níveis de energia em até 25%.
              </p>
            </div>
          </div>

          {/* Card 3: Metabolism */}
          <div className="bg-tertiary-fixed p-8 rounded-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute top-0 right-0 opacity-10">
              <span
                className="material-symbols-outlined text-[120px] text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
            </div>
            <div className="relative z-10">
              <div className="mb-4">
                <span
                  className="material-symbols-outlined text-4xl text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  whatshot
                </span>
              </div>
              <h3 className="font-headline font-bold text-2xl mb-3 text-on-tertiary-fixed">
                Aceleração Metabólica
              </h3>
              <p className="text-on-tertiary-fixed/80 text-sm leading-relaxed">
                Beber água aumenta temporariamente seu metabolismo em até 30% nas próximas 1-2 horas.
              </p>
            </div>
          </div>

          {/* Card 4: Recovery */}
          <div className="bg-secondary-container/30 p-8 rounded-xl relative overflow-hidden group border border-secondary/20 hover:border-secondary/40 transition-colors duration-300">
            <div className="absolute top-0 right-0 opacity-5">
              <span
                className="material-symbols-outlined text-[120px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                spa
              </span>
            </div>
            <div className="relative z-10">
              <div className="mb-4">
                <span
                  className="material-symbols-outlined text-4xl text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  self_improvement
                </span>
              </div>
              <h3 className="font-headline font-bold text-2xl mb-3 text-on-secondary-container">
                Recuperação Muscular
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                A água transporta nutrientes essenciais para reparar e construir tecido muscular após exercícios.
              </p>
            </div>
          </div>
        </div>

        {/* Scientific Footer Note */}
        <div className="mt-12 w-full p-6 bg-surface-container-low rounded-lg border border-outline-variant/10">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">science</span>
            <div>
              <h4 className="font-headline font-semibold text-sm text-primary mb-2">Baseado em ciência</h4>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Estudos mostram que a hidratação ideal varia entre 2-3 litros por dia, dependendo do peso corporal,
                atividade física e clima.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface via-surface/90 to-transparent">
        <div className="max-w-md mx-auto">
          <button
            onClick={onNext}
            className="w-full h-16 bg-primary text-on-primary font-headline font-bold text-lg rounded-lg shadow-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>Entendi</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default ImpactoAguaStep;
