import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const PILLARS = [
  { icon: 'energy_savings_leaf', label: 'Natural' },
  { icon: 'psychology',          label: 'Consciente' },
  { icon: 'monitor_heart',       label: 'Vital' },
  { icon: 'verified',            label: 'Ritual' },
];

const MalamaFlowStep: React.FC<StepProps> = ({ onNext, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={() => {}}
      nextLabel="Entrar no Flow"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex justify-center mb-8"
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: `${PETROL}12` }}
        >
          <span
            className="material-symbols-outlined text-5xl"
            style={{ color: PETROL, fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
        </div>
      </motion.div>

      {/* Heading */}
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Seja bem-vindo ao seu{' '}
          <span style={{ color: PETROL, fontStyle: 'italic' }}>Flow.</span>
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto leading-relaxed">
          Sua jornada para uma vida mais leve e consciente começa agora.
        </p>
      </div>

      {/* Pillar cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PILLARS.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `${PETROL}10` }}
            >
              <span className="material-symbols-outlined text-lg" style={{ color: PETROL }}>
                {item.icon}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-light">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Quote */}
      <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
        <p className="text-stone-500 text-sm font-light italic leading-relaxed mb-3">
          "Não se trata de perfeição — se trata de presença. O Flow é o caminho."
        </p>
        <p className="text-stone-400 text-xs uppercase tracking-widest font-light">
          Equipe Malama
        </p>
      </div>
    </StepContainer>
  );
};

export default MalamaFlowStep;
