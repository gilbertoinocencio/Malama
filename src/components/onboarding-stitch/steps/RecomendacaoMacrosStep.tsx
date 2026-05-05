import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL   = '#7d4a3c';
const PETROL_M = '#a07060';
const PETROL_L = '#c4a090';

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  muito_ativo: 1.725,
};

const getAge = (dob?: string) => {
  if (!dob) return 30;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const RecomendacaoMacrosStep: React.FC<StepProps> = ({ data, onNext, onBack, currentStep, totalSteps }) => {
  const altura = data.altura  || 175;
  const peso   = data.peso    || 75;
  const idade  = getAge(data.dataNascimento);
  const genero = data.genero  || 'masculino';
  const nivel  = data.nivelAtividade || 'moderado';
  const goal   = data.primary_goal   || 'perder_peso';

  const bmr = genero === 'feminino'
    ? 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * idade)
    : 88.362  + (13.397 * peso) + (4.799 * altura) - (5.677 * idade);

  const multiplier = ACTIVITY_MULTIPLIER[nivel] ?? 1.55;
  let tdee = Math.round(bmr * multiplier);
  if (goal === 'perder_peso') tdee -= 300;
  if (goal === 'ganhar_peso') tdee += 200;

  const protein = Math.round((tdee * 0.30) / 4);
  const carbs   = Math.round((tdee * 0.40) / 4);
  const fat     = Math.round((tdee * 0.30) / 9);

  const goalLabel = goal === 'perder_peso' ? 'déficit' : goal === 'ganhar_peso' ? 'superávit' : 'equilibrado';

  const MICROS = [
    { icon: 'opacity',  label: 'Fibras', value: '32g'   },
    { icon: 'waves',    label: 'Sódio',  value: '<2.3g' },
    { icon: 'wb_sunny', label: 'Vit D',  value: '20mcg' },
    { icon: 'eco',      label: 'Zinco',  value: '11mg'  },
  ];

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Confirmar Recomendações"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Recomendações Nutricionais
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Baseado no seu metabolismo basal e nível de atividade.
        </p>
      </div>

      {/* Calories card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="flex justify-between items-end mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Meta diária</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                {tdee.toLocaleString('pt-BR')}
              </span>
              <span className="text-lg text-stone-400 font-light">kcal</span>
            </div>
          </div>
          <span
            className="text-xs font-light px-3 py-1 rounded-full border"
            style={{ borderColor: PETROL, color: PETROL }}
          >
            {goalLabel}
          </span>
        </div>

        {/* Macro split bar */}
        <div className="flex h-2.5 w-full rounded-full overflow-hidden mb-2">
          <div style={{ width: '30%', background: PETROL }} />
          <div style={{ width: '40%', background: PETROL_M }} />
          <div style={{ width: '30%', background: PETROL_L }} />
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 font-light uppercase tracking-widest">
          <span>Proteína 30%</span>
          <span>Carbo 40%</span>
          <span>Gordura 30%</span>
        </div>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col">
          <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-stone-400 text-lg">fitness_center</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Proteína</p>
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className="text-4xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{protein}</span>
            <span className="text-stone-400 font-light">g</span>
          </div>
          <p className="text-stone-400 text-xs font-light">Regeneração muscular e saciedade</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col">
          <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-stone-400 text-lg">bolt</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Carboidratos</p>
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className="text-4xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{carbs}</span>
            <span className="text-stone-400 font-light">g</span>
          </div>
          <p className="text-stone-400 text-xs font-light">Principal fonte de energia</p>
        </div>

        <div className="col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-stone-400 text-lg">water_drop</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-0.5">Gorduras</p>
              <p className="text-stone-400 text-xs font-light">Suporte hormonal e vitaminas</p>
            </div>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{fat}</span>
            <span className="text-stone-400 font-light">g</span>
          </div>
        </div>
      </div>

      {/* Micronutrients */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <p className="text-stone-500 text-sm mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          Destaques Micronutrientes
        </p>
        <div className="grid grid-cols-4 gap-2">
          {MICROS.map(({ icon, label, value }) => (
            <div key={label} className="bg-stone-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
              <span className="material-symbols-outlined text-stone-400 text-base">{icon}</span>
              <p className="text-[9px] uppercase tracking-widest text-stone-400 font-light">{label}</p>
              <p className="text-stone-700 text-xs" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};

export default RecomendacaoMacrosStep;
