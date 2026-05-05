import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const ProjecaoSucessoStep: React.FC<StepProps> = ({ data, onNext, onBack, currentStep, totalSteps }) => {
  const target = data.pesoObjetivo || data.targetWeight || 70;
  const current = data.peso || 78.5;
  const diff = Math.abs(current - target).toFixed(1);

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
          Baseado no seu perfil metabólico, desenhamos o caminho para sua transformação em 3 meses.
        </p>
      </div>

      {/* Chart card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Perda estimada</p>
            <p className="text-3xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>−{diff} kg</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Prazo</p>
            <p className="text-lg text-stone-700" style={{ fontFamily: "'Playfair Display', serif" }}>12 semanas</p>
          </div>
        </div>

        <div className="relative h-40 w-full">
          <svg className="w-full h-full" viewBox="0 0 400 130" preserveAspectRatio="none">
            {/* Grid lines */}
            {[20, 60, 100].map(y => (
              <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#f5f5f4" strokeWidth="1" />
            ))}

            <defs>
              <linearGradient id="pgradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor={PETROL} stopOpacity="0.15" />
                <stop offset="100%" stopColor={PETROL} stopOpacity="0" />
              </linearGradient>
            </defs>

            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              d="M0,15 L50,22 L100,40 L150,52 L200,72 L250,85 L300,102 L350,112 L400,125"
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
              d="M0,15 L50,22 L100,40 L150,52 L200,72 L250,85 L300,102 L350,112 L400,125 L400,130 L0,130 Z"
              fill="url(#pgradient)"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.8, type: 'spring', stiffness: 200 }}
              cx="400" cy="125" r="5"
              fill={PETROL}
            />
          </svg>
        </div>

        <div className="flex justify-between text-[10px] text-stone-400 font-light uppercase tracking-widest mt-3 border-t border-stone-100 pt-3">
          <span>Hoje</span>
          <span>Semana 4</span>
          <span>Semana 8</span>
          <span>Semana 12</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <span className="material-symbols-outlined text-stone-400 text-lg mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Metabolismo</p>
          <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>+14% eficiência</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <span className="material-symbols-outlined text-stone-400 text-lg mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Saúde celular</p>
          <p className="text-stone-700 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>Nível ótimo</p>
        </div>
      </div>

      {/* Milestone card */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">auto_awesome</span>
        </div>
        <div>
          <p className="text-stone-700 text-sm mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>Seu "Novo Eu" em 90 dias</p>
          <p className="text-stone-400 text-sm font-light leading-snug">
            72% dos usuários Malama alcançam a meta mantendo a consistência sugerida.
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProjecaoSucessoStep;
