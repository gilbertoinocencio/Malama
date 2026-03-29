import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const NuraFlowStep: React.FC<StepProps> = ({ onNext, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      progress={(currentStep / totalSteps) * 100}
      onBack={() => {}} // Transition screen
      nextLabel="Entrar no Flow"
    >
      <div className="flex flex-col items-center justify-center text-center space-y-12 py-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-secondary/10 blur-[100px] rounded-full scale-150"></div>
          <span className="material-symbols-outlined text-secondary text-[10rem] relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </motion.div>

        <div className="space-y-6 max-w-2xl relative z-10">
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-tertiary tracking-tighter">
            Seja bem-vindo ao seu <span className="text-secondary italic">Flow</span>.
          </h1>
          <p className="text-xl text-on-surface-variant font-light leading-relaxed">
            Sua jornada para uma vida mais leve e consciente começa agora. 
            O Nura está pronto para guiar cada passo da sua transformação.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl pt-8">
          {[
            { icon: 'energy_savings_leaf', label: 'Natural' },
            { icon: 'psychology', label: 'Consciente' },
            { icon: 'monitor_heart', label: 'Vital' },
            { icon: 'verified', label: 'Ritual' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.5 }}
              className="bg-surface-container-low p-6 rounded-2xl flex flex-col items-center gap-3 border border-surface-container-highest"
            >
              <span className="material-symbols-outlined text-tertiary text-3xl">{item.icon}</span>
              <span className="text-xs font-bold tracking-widest uppercase text-outline">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};

export default NuraFlowStep;
