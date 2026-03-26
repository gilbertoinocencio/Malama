import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const ResumoIMCStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  // Calculate BMI
  const altura = data.altura || 175;
  const peso = data.peso || 75;
  const alturaMetros = altura / 100;
  const bmi = peso / (alturaMetros * alturaMetros);
  const bmiFormatted = bmi.toFixed(1);

  // Determine BMI category
  let category = 'PESO NORMAL';
  let categoryColor = 'secondary';
  if (bmi < 18.5) {
    category = 'ABAIXO DO PESO';
    categoryColor = 'tertiary';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'SOBREPESO';
    categoryColor = 'tertiary';
  } else if (bmi >= 30) {
    category = 'OBESIDADE';
    categoryColor = 'error';
  }

  const handleContinue = () => {
    updateData({ bmi });
    onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <main className="pt-24 pb-32 px-6 max-w-lg mx-auto min-h-screen flex flex-col">
        {/* Header Section */}
        <section className="mb-10">
          <p className="text-on-surface-variant font-medium mb-2 opacity-60">
            Passo {currentStep} de {totalSteps}
          </p>
          <h2 className="font-headline text-4xl font-bold text-primary tracking-tight leading-tight">
            Seu Perfil Biométrico
          </h2>
        </section>

        {/* BMI Display (The "Elegance" Canvas) */}
        <section className="relative mb-8">
          <div className="bg-surface-container-lowest rounded-lg p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_16px_32px_0_rgba(26,28,26,0.04)]">
            {/* Background Decorative Element (The Contextual Leaf) */}
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-secondary-container opacity-20 blur-3xl"></div>

            <span className="text-on-surface-variant font-medium text-sm tracking-widest uppercase mb-2">
              Seu IMC Atual
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-7xl font-extrabold text-primary">{bmiFormatted}</span>
              <span className="font-headline text-xl font-medium text-on-surface-variant">kg/m²</span>
            </div>
            <div className={`mt-6 px-6 py-2 bg-${categoryColor}/10 rounded-full border border-${categoryColor}/10`}>
              <span className={`text-${categoryColor} font-bold font-headline`}>{category}</span>
            </div>
          </div>
        </section>

        {/* BMI Scale Visualization */}
        <section className="mb-8">
          <div className="bg-surface-container-low rounded-lg p-6 space-y-4">
            <h3 className="font-headline font-bold text-lg text-primary mb-4">Escala de Referência</h3>

            {/* Visual Scale */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-tertiary"></div>
                <span className="text-sm text-on-surface-variant flex-1">Abaixo do peso</span>
                <span className="text-sm font-medium text-on-surface">&lt; 18.5</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary"></div>
                <span className="text-sm text-on-surface-variant flex-1">Peso normal</span>
                <span className="text-sm font-medium text-on-surface">18.5 - 24.9</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-tertiary"></div>
                <span className="text-sm text-on-surface-variant flex-1">Sobrepeso</span>
                <span className="text-sm font-medium text-on-surface">25.0 - 29.9</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-error"></div>
                <span className="text-sm text-on-surface-variant flex-1">Obesidade</span>
                <span className="text-sm font-medium text-on-surface">≥ 30.0</span>
              </div>
            </div>
          </div>
        </section>

        {/* Informational Note */}
        <div className="bg-primary-fixed-dim/20 rounded-lg p-6 flex items-start gap-4">
          <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">info</span>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            O IMC é uma referência inicial. A NURA vai além, considerando composição corporal, metabolismo e estilo de vida para criar seu plano personalizado.
          </p>
        </div>
      </main>

    </StepContainer>
  );
};

export default ResumoIMCStep;
