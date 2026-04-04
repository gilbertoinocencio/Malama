import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  muito_ativo: 1.725,
};

const RecomendacaoMacrosStep: React.FC<StepProps> = ({ data, onNext, onBack, currentStep, totalSteps }) => {
  const altura  = data.altura  || 175;
  const peso    = data.peso    || 75;
  const idade   = data.idade   || 30;
  const genero  = data.genero  || 'masculino';
  const nivel   = data.nivelAtividade || 'moderado';
  const goal    = data.primary_goal || 'perder_peso';

  // Harris-Benedict (Revisada) — mesma fórmula usada no profileService
  const bmr = genero === 'feminino'
    ? 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * idade)
    : 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * idade);

  const multiplier = ACTIVITY_MULTIPLIER[nivel] ?? 1.55;
  let tdee = Math.round(bmr * multiplier);

  // Ajuste por objetivo — alinhado com profileService
  if (goal === 'perder_peso')  tdee -= 300;  // Déficit calórico
  if (goal === 'ganhar_peso')  tdee += 200;  // Superávit calórico

  // Macros: 30% protein, 40% carbs, 30% fat
  const protein = Math.round((tdee * 0.30) / 4);
  const carbs   = Math.round((tdee * 0.40) / 4);
  const fat     = Math.round((tdee * 0.30) / 9);

  const calories = tdee.toLocaleString('pt-BR');

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Confirmar Recomendações"
    >
      {/* Header */}
      <div className="mb-10 w-full">
        <span className="text-secondary font-headline font-semibold text-sm tracking-widest uppercase mb-2 block">
          Passo {currentStep} de {totalSteps}
        </span>
        <h2 className="text-primary font-headline font-bold text-4xl leading-tight tracking-tight mb-4">
          Suas Recomendações Nutricionais
        </h2>
        <p className="text-on-surface-variant font-body text-lg leading-relaxed">
          Com base no seu metabolismo basal e nível de atividade, desenhamos o equilíbrio perfeito para o seu fluxo.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4 w-full mb-8">

        {/* Daily Calories — full width */}
        <div className="col-span-2 bg-surface-container-lowest rounded-lg p-8 shadow-[0_16px_32px_0_rgba(26,28,26,0.04)]">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs mb-1">Meta Diária</p>
              <h3 className="font-headline font-bold text-5xl text-primary">
                {calories} <span className="text-2xl font-normal opacity-60">kcal</span>
              </h3>
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
              <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
              {goal === 'perder_peso' ? 'Déficit' : goal === 'ganhar_peso' ? 'Superávit' : 'Equilibrado'}
            </span>
          </div>
          {/* Macro split bar */}
          <div className="mt-6 flex h-3 w-full rounded-full overflow-hidden bg-surface-container-high">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: '30%' }}></div>
            <div className="h-full bg-secondary transition-all duration-1000" style={{ width: '40%' }}></div>
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: '30%' }}></div>
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-headline font-bold tracking-widest text-on-surface-variant uppercase">
            <span>Proteína (30%)</span>
            <span>Carbo (40%)</span>
            <span>Gordura (30%)</span>
          </div>
        </div>

        {/* Protein */}
        <div className="col-span-1 bg-surface-container-low rounded-lg p-6 hover:bg-primary-fixed-dim transition-colors duration-500 group flex flex-col">
          <div className="bg-primary/5 p-3 rounded-full w-fit mb-4 group-hover:bg-white/20 transition-colors">
            <span className="material-symbols-outlined text-primary">fitness_center</span>
          </div>
          <h4 className="font-headline font-bold text-xl text-primary mb-1">Proteína</h4>
          <p className="font-headline font-black text-4xl text-primary mt-auto">
            {protein}<span className="text-base font-medium opacity-60">g</span>
          </p>
          <p className="text-on-surface-variant text-xs mt-2">Regeneração muscular e saciedade.</p>
        </div>

        {/* Carbs */}
        <div className="col-span-1 bg-surface-container-low rounded-lg p-6 hover:bg-secondary-container transition-colors duration-500 group flex flex-col">
          <div className="bg-secondary/5 p-3 rounded-full w-fit mb-4 group-hover:bg-white/20 transition-colors">
            <span className="material-symbols-outlined text-secondary">bolt</span>
          </div>
          <h4 className="font-headline font-bold text-xl text-secondary mb-1">Carbo</h4>
          <p className="font-headline font-black text-4xl text-secondary mt-auto">
            {carbs}<span className="text-base font-medium opacity-60">g</span>
          </p>
          <p className="text-on-surface-variant text-xs mt-2">Principal fonte de energia.</p>
        </div>

        {/* Fat — full width */}
        <div className="col-span-2 bg-surface-container-low rounded-lg p-6 hover:bg-primary-fixed transition-colors duration-500 group flex items-center justify-between">
          <div>
            <div className="bg-primary/5 p-3 rounded-full w-fit mb-4 group-hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-primary">water_drop</span>
            </div>
            <h4 className="font-headline font-bold text-xl text-primary mb-1">Gordura</h4>
            <p className="text-on-surface-variant text-sm">Suporte hormonal e vitaminas lipossolúveis.</p>
          </div>
          <div className="text-right">
            <p className="font-headline font-black text-5xl text-primary">
              {fat}<span className="text-xl font-medium opacity-60">g</span>
            </p>
            <p className="text-primary/60 font-headline font-bold uppercase tracking-tighter mt-1 text-xs">30% do Plano</p>
          </div>
        </div>
      </div>

      {/* Micronutrients */}
      <div className="w-full space-y-4">
        <h5 className="text-primary font-headline font-bold text-lg">Destaques Micronutrientes</h5>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: 'opacity',  label: 'Fibras',  value: '32g'    },
            { icon: 'waves',    label: 'Sódio',   value: '<2.3g'  },
            { icon: 'wb_sunny', label: 'Vit D',   value: '20mcg'  },
            { icon: 'eco',      label: 'Zinco',   value: '11mg'   },
          ].map(({ icon, label, value }) => (
            <div key={label} className="p-4 rounded-lg bg-surface-container border border-outline-variant/10 text-center flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{label}</p>
              <p className="font-headline font-bold text-base text-primary">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};

export default RecomendacaoMacrosStep;
