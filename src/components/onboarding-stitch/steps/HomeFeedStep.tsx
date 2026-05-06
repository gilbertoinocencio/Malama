import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const FEATURES = [
  { icon: 'feed',          title: 'Feed Inteligente',       desc: 'Recomendações baseadas no seu ritmo único.' },
  { icon: 'insights',      title: 'Acompanhamento Flow',    desc: 'Insights automáticos sobre sua bio-sincronização.' },
  { icon: 'restaurant',    title: 'Plano Nutricional',      desc: 'Macros e refeições ajustados ao seu objetivo.' },
];

const HomeFeedStep: React.FC<StepProps> = ({ onNext, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={() => {}}
      nextLabel="Concluir"
    >
      {/* Check icon */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
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
            check_circle
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
          Tudo pronto.
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto leading-relaxed">
          Seu perfil foi configurado. Prepare-se para vivenciar o seu melhor estado de saúde.
        </p>
      </div>

      {/* Feature list */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100 mb-6">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 + 0.3, duration: 0.4 }}
            className="flex items-center gap-4 p-5"
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `${PETROL}10` }}
            >
              <span className="material-symbols-outlined text-lg" style={{ color: PETROL }}>
                {f.icon}
              </span>
            </div>
            <div>
              <p
                className="text-stone-700 text-sm mb-0.5"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {f.title}
              </p>
              <p className="text-stone-400 text-xs font-light">{f.desc}</p>
            </div>
            <span
              className="material-symbols-outlined text-base ml-auto"
              style={{ color: PETROL, fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </motion.div>
        ))}
      </div>

      {/* Closing note */}
      <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm text-center">
        <p className="text-stone-500 text-sm font-light italic leading-relaxed">
          "Cada hábito cultivado hoje é a base da pessoa que você será amanhã."
        </p>
        <div className="w-8 h-px mx-auto mt-4" style={{ background: PETROL }} />
      </div>
    </StepContainer>
  );
};

export default HomeFeedStep;
