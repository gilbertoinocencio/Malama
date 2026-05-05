import React from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const PETROL = '#7d4a3c';

// BMI scale spans 15–40 (range = 25)
const BMI_MIN = 15;
const BMI_RANGE = 25;

interface Category {
  key: string;
  label: string;
  insight: string;
  segmentColor: string;
  pct: number; // percentage of the gauge bar
}

const CATEGORIES: Category[] = [
  { key: 'underweight', label: 'Abaixo do peso', segmentColor: '#d6ccc9', pct: 14, insight: 'Vamos trabalhar juntos para atingir um peso saudável com um plano de nutrição personalizado.' },
  { key: 'normal',      label: 'Peso saudável',  segmentColor: PETROL,    pct: 26, insight: 'Seu IMC está dentro da faixa recomendada pela OMS. Um ótimo ponto de partida.' },
  { key: 'overweight',  label: 'Sobrepeso',      segmentColor: '#a8978f', pct: 20, insight: 'Com ajustes na alimentação e na rotina, você pode atingir o peso ideal de forma gradual.' },
  { key: 'obese',       label: 'Obesidade',      segmentColor: '#7a6560', pct: 40, insight: 'Nosso plano personalizado vai te guiar para alcançar um peso mais saudável de forma sustentável.' },
];

const getCategory = (bmi: number) => {
  if (bmi < 18.5) return CATEGORIES[0];
  if (bmi < 25)   return CATEGORIES[1];
  if (bmi < 30)   return CATEGORIES[2];
  return CATEGORIES[3];
};

const ResumoIMCStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const altura = data.altura || 175;
  const peso = data.peso || 75;
  const bmi = peso / Math.pow(altura / 100, 2);
  const bmiFormatted = bmi.toFixed(1);
  const cat = getCategory(bmi);

  // Clamp dot position between 1% and 99%
  const dotPct = Math.min(Math.max(((bmi - BMI_MIN) / BMI_RANGE) * 100, 1), 99);

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
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Seu Perfil Biométrico
        </h1>
        <p className="text-stone-400 text-base font-light">
          Calculado com base nas suas medidas informadas.
        </p>
      </div>

      {/* BMI Display card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col items-center mb-4">
        <span className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-3">Seu IMC atual</span>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-7xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
            {bmiFormatted}
          </span>
          <span className="text-lg text-stone-400 font-light">kg/m²</span>
        </div>
        <div
          className="px-5 py-1.5 rounded-full border text-sm font-light tracking-wide"
          style={{ borderColor: cat.segmentColor, color: cat.segmentColor }}
        >
          {cat.label}
        </div>
      </div>

      {/* Gauge */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="relative">
          {/* Labels */}
          <div className="flex justify-between text-[10px] text-stone-400 font-light mb-2 px-0.5">
            <span>15</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>40</span>
          </div>

          {/* Bar */}
          <div className="relative h-3 w-full rounded-full overflow-hidden flex mb-4">
            {CATEGORIES.map((c) => (
              <div key={c.key} style={{ width: `${c.pct}%`, background: c.segmentColor }} />
            ))}
          </div>

          {/* Dot indicator */}
          <div
            className="absolute"
            style={{ left: `${dotPct}%`, top: '18px', transform: 'translateX(-50%)' }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{ background: PETROL }}
            />
          </div>
        </div>

        {/* Info row */}
        <div className="flex gap-3 mt-2">
          <div className="flex-1 bg-stone-50 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Intervalo ideal</p>
            <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>18.5 — 24.9</p>
          </div>
          <div className="flex-1 bg-stone-50 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Status</p>
            <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{cat.label}</p>
          </div>
        </div>
      </div>

      {/* Insight card */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">info</span>
        </div>
        <p className="text-sm font-light text-stone-500 leading-relaxed">
          {cat.insight}
        </p>
      </div>
    </StepContainer>
  );
};

export default ResumoIMCStep;
