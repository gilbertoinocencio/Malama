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
  let statusLabel = 'Saudável';
  let insightTitle = 'Ótimo começo!';
  let insightText = 'Seu IMC está dentro da faixa recomendada pela OMS. Isso indica um equilíbrio positivo entre sua altura e peso atual.';

  if (bmi < 18.5) {
    category = 'ABAIXO DO PESO';
    categoryColor = 'tertiary';
    statusLabel = 'Abaixo do peso';
    insightTitle = 'Atenção!';
    insightText = 'Seu IMC está abaixo do ideal. Vamos trabalhar juntos para atingir um peso saudável com nosso plano personalizado.';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'SOBREPESO';
    categoryColor = 'tertiary';
    statusLabel = 'Sobrepeso';
    insightTitle = 'Você está no caminho!';
    insightText = 'Com ajustes na alimentação e rotina, você pode atingir o peso ideal. Nosso plano vai te guiar.';
  } else if (bmi >= 30) {
    category = 'OBESIDADE';
    categoryColor = 'error';
    statusLabel = 'Obesidade';
    insightTitle = 'Vamos trabalhar juntos!';
    insightText = 'Nosso plano personalizado vai te ajudar a alcançar um peso mais saudável de forma gradual e sustentável.';
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
      secondaryLabel="Revisar medidas anteriores"
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

        {/* BMI Display */}
        <section className="relative mb-8">
          <div className="bg-surface-container-lowest rounded-lg p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_16px_32px_0_rgba(26,28,26,0.04)]">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-secondary-container opacity-20 blur-3xl"></div>
            <span className="text-on-surface-variant font-medium text-sm tracking-widest uppercase mb-2">Seu IMC Atual</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-7xl font-extrabold text-primary">{bmiFormatted}</span>
              <span className="font-headline text-xl font-medium text-on-surface-variant">kg/m²</span>
            </div>
            <div className={`mt-6 px-6 py-2 bg-${categoryColor}/10 rounded-full border border-${categoryColor}/10`}>
              <span className={`text-${categoryColor} font-bold font-headline`}>{category}</span>
            </div>
          </div>
        </section>

        {/* Gauge Scale */}
        <section className="mb-8">
          <div className="relative pt-8 px-2">
            <div className="absolute top-0 left-0 w-full flex justify-between text-[10px] font-bold text-on-surface-variant/40 tracking-wider">
              <span>18.5</span><span>24.9</span><span>29.9</span><span>34.9</span>
            </div>
            <div className="h-3 w-full bg-surface-container-highest rounded-full flex overflow-hidden">
              <div className="h-full bg-tertiary-fixed-dim w-[20%]"></div>
              <div className="h-full bg-secondary w-[30%] border-x-4 border-surface-container-lowest"></div>
              <div className="h-full bg-tertiary-container w-[25%] border-r-4 border-surface-container-lowest"></div>
              <div className="h-full bg-error-container w-[25%]"></div>
            </div>
            <div className="absolute -bottom-4 flex flex-col items-center" style={{ left: `${Math.min(Math.max(((bmi - 15) / 25) * 100, 2), 98)}%`, transform: 'translateX(-50%)' }}>
              <div className="w-3 h-3 bg-primary rounded-full ring-4 ring-surface-container-lowest"></div>
            </div>
          </div>
        </section>

        {/* Two Info Cards */}
        <section className="mb-8 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-surface-container-low flex flex-col gap-1">
              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Intervalo Ideal</span>
              <span className="font-headline font-bold text-on-surface">18.5 — 24.9</span>
            </div>
            <div className="p-4 rounded-lg bg-surface-container-low flex flex-col gap-1">
              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Status Global</span>
              <span className={`font-headline font-bold text-${categoryColor}`}>{statusLabel}</span>
            </div>
          </div>
        </section>

        {/* Insight Card */}
        <section className="mb-8 bg-tertiary-fixed text-tertiary rounded-lg p-6 flex gap-4 items-start">
          <div className="bg-tertiary-container/10 p-2 rounded-lg flex-shrink-0">
            <span className="material-symbols-outlined text-tertiary-container">colors_spark</span>
          </div>
          <div>
            <p className="font-headline font-bold text-lg mb-1">{insightTitle}</p>
            <p className="text-sm leading-relaxed text-on-tertiary-fixed-variant">{insightText}</p>
          </div>
        </section>
      </main>

    </StepContainer>
  );
};

export default ResumoIMCStep;
