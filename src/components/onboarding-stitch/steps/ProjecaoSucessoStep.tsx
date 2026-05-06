import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const RATE_BY_SPEED = [0.25, 0.5, 0.75, 1.0, 1.25]; // kg por semana

// SVG paths: perda (desce), ganho (sobe), manutenção (plano)
const PATH_LOSS    = 'M0,15 L50,28 L100,45 L150,62 L200,78 L250,92 L300,105 L350,115 L400,125';
const PATH_GAIN    = 'M0,125 L50,115 L100,105 L150,92 L200,78 L250,62 L300,45 L350,28 L400,15';
const PATH_STABLE  = 'M0,65 L100,68 L200,65 L300,67 L400,65';
const FILL_LOSS    = `${PATH_LOSS} L400,130 L0,130 Z`;
const FILL_GAIN    = `${PATH_GAIN} L400,0 L0,0 Z`;
const FILL_STABLE  = `${PATH_STABLE} L400,130 L0,130 Z`;

const ProjecaoSucessoStep: React.FC<StepProps> = ({ data, onNext, onBack, currentStep, totalSteps }) => {
  const target  = data.pesoObjetivo || data.targetWeight || 70;
  const current = data.peso || 75;
  const goal    = data.primary_goal || 'perder_peso';
  const rate    = RATE_BY_SPEED[(data.goalSpeed ?? 3) - 1] ?? 0.75;

  const isGain    = goal === 'ganhar_peso' || target > current;
  const isStable  = goal === 'manter_peso' || goal === 'saude_geral';
  const diff      = Math.abs(current - target).toFixed(1);
  const semanas   = isStable ? 0 : Math.max(4, Math.ceil(Math.abs(current - target) / rate));

  const diffLabel   = isStable  ? 'Manutenção'
                    : isGain    ? `+${diff} kg`
                    :             `−${diff} kg`;
  const diffCaption = isStable  ? 'Estabilidade metabólica'
                    : isGain    ? 'Ganho estimado'
                    :             'Perda estimada';
  const prazoLabel  = isStable  ? 'Contínuo' : `${semanas} semanas`;

  const linePath  = isGain ? PATH_GAIN   : isStable ? PATH_STABLE  : PATH_LOSS;
  const fillPath  = isGain ? FILL_GAIN   : isStable ? FILL_STABLE  : FILL_LOSS;
  const dotCy     = isGain ? 15          : isStable ? 65           : 125;

  const subheading = isStable
    ? 'Baseado no seu perfil, traçamos sua rota de equilíbrio sustentável.'
    : `Baseado no seu perfil metabólico, desenhamos o caminho para ${isGain ? 'seu ganho' : 'sua perda'} em ${semanas} semanas.`;

  const milestoneText = isStable
    ? '81% dos usuários Malama mantêm o equilíbrio com consistência.'
    : '72% dos usuários Malama alcançam a meta mantendo a consistência sugerida.';

  const statsLeft  = isGain
    ? { icon: 'fitness_center', label: 'Massa muscular', value: 'Em foco' }
    : { icon: 'bolt',           label: 'Metabolismo',    value: '+14% eficiência' };
  const statsRight = isStable
    ? { icon: 'balance',   label: 'Equilíbrio',  value: 'Preservado' }
    : { icon: 'favorite',  label: 'Saúde celular', value: 'Nível ótimo' };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Projeção de Sucesso
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          {subheading}
        </p>
      </div>

      {/* Chart card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">{diffCaption}</p>
            <p className="text-3xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{diffLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Prazo</p>
            <p className="text-lg text-stone-700" style={{ fontFamily: "'Playfair Display', serif" }}>{prazoLabel}</p>
          </div>
        </div>

        <div className="relative h-40 w-full">
          <svg className="w-full h-full" viewBox="0 0 400 130" preserveAspectRatio="none">
            {[20, 65, 110].map(y => (
              <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#f5f5f4" strokeWidth="1" />
            ))}

            <defs>
              <linearGradient id="pgradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor={PETROL} stopOpacity="0.15" />
                <stop offset="100%" stopColor={PETROL} stopOpacity="0" />
              </linearGradient>
            </defs>

            <motion.path
              key={linePath}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              d={linePath}
              fill="none"
              stroke={PETROL}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 1 }}
              d={fillPath}
              fill="url(#pgradient)"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.8, type: 'spring', stiffness: 200 }}
              cx="400"
              cy={dotCy}
              r="5"
              fill={PETROL}
            />
          </svg>
        </div>

        <div className="flex justify-between text-[10px] text-stone-400 font-light uppercase tracking-widest mt-3 border-t border-stone-100 pt-3">
          <span>Hoje</span>
          {isStable ? (
            <>
              <span>1 mês</span>
              <span>3 meses</span>
              <span>Contínuo</span>
            </>
          ) : (
            <>
              <span>Sem. {Math.round(semanas * 0.33)}</span>
              <span>Sem. {Math.round(semanas * 0.66)}</span>
              <span>Sem. {semanas}</span>
            </>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <span className="material-symbols-outlined text-stone-400 text-lg mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>
            {statsLeft.icon}
          </span>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">{statsLeft.label}</p>
          <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{statsLeft.value}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <span className="material-symbols-outlined text-stone-400 text-lg mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>
            {statsRight.icon}
          </span>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">{statsRight.label}</p>
          <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{statsRight.value}</p>
        </div>
      </div>

      {/* Milestone card */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">auto_awesome</span>
        </div>
        <div>
          <p className="text-stone-700 text-sm mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isStable ? 'Seu equilíbrio, sustentado.' : `Seu "Novo Eu" em ${semanas} semanas`}
          </p>
          <p className="text-stone-400 text-sm font-light leading-snug">{milestoneText}</p>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProjecaoSucessoStep;
