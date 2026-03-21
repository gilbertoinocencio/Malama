import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PlanoPersonalizadoStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
      nextLabel="Começar Agora"
    >
      <header className="mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-primary leading-tight">
          Seu caminho para <br/>o equilíbrio está pronto.
        </h1>
        <p className="text-on-surface-variant text-lg max-w-xl font-light leading-relaxed">
          Desenhamos um plano de 90 dias baseado no seu perfil. Uma jornada gradual para transformar sua rotina em um ritual de bem-estar.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative w-full">
        {/* Contextual Leaf Decoration */}
        <div className="absolute -right-20 top-40 opacity-10 pointer-events-none hidden lg:block">
          <span className="material-symbols-outlined text-[200px] text-secondary-container">eco</span>
        </div>

        {/* Phase 1 Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col h-full border-b-4 border-tertiary-fixed hover:-translate-y-1 transition-transform"
        >
          <div className="flex justify-between items-start mb-8">
            <span className="text-tertiary font-headline font-bold text-xs tracking-widest uppercase">Fase 1</span>
            <span className="material-symbols-outlined text-tertiary text-4xl">energy_savings_leaf</span>
          </div>
          <h3 className="text-2xl font-headline font-bold text-primary mb-4">Adaptação</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
            Os primeiros 30 dias focam em identificar gatilhos e estabelecer micrometras sem pressão.
          </p>
          <div className="mt-auto space-y-3">
            <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Mapeamento de rotina
            </div>
            <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Introdução ao Flow
            </div>
          </div>
        </motion.div>

        {/* Phase 2 Card (Featured) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1.05 }}
          transition={{ delay: 0.4 }}
          className="bg-primary text-on-primary p-8 rounded-xl shadow-2xl flex flex-col h-full z-10 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-container rounded-full blur-3xl opacity-50"></div>
          <div className="flex justify-between items-start mb-8 relative z-20">
            <span className="text-primary-fixed font-headline font-bold text-xs tracking-widest uppercase">Fase 2</span>
            <span className="material-symbols-outlined text-primary-fixed text-4xl">auto_awesome</span>
          </div>
          <h3 className="text-2xl font-headline font-bold text-white mb-4 relative z-20">Flow</h3>
          <p className="text-primary-fixed-dim text-sm leading-relaxed mb-8 relative z-20">
            Do dia 31 ao 60, intensificamos as práticas. Você começará a sentir a clareza mental e a consistência.
          </p>
          <div className="mt-auto space-y-3 relative z-20">
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="material-symbols-outlined text-secondary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Práticas avançadas
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="material-symbols-outlined text-secondary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Otimização de sono
            </div>
          </div>
        </motion.div>

        {/* Phase 3 Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col h-full border-b-4 border-primary-fixed hover:-translate-y-1 transition-transform"
        >
          <div className="flex justify-between items-start mb-8">
            <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">Fase 3</span>
            <span className="material-symbols-outlined text-primary text-4xl">verified</span>
          </div>
          <h3 className="text-2xl font-headline font-bold text-primary mb-4">Consolidação</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
            Reta final. Transformação de hábitos em identidade. O bem-estar torna-se seu estado natural.
          </p>
          <div className="mt-auto space-y-3">
            <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Sustentabilidade a longo prazo
            </div>
            <div className="flex items-center gap-3 text-xs text-on-surface font-medium">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Certificação NURA
            </div>
          </div>
        </motion.div>
      </div>

      {/* Summary Quote Section */}
      <div className="flex flex-col md:flex-row items-center gap-8 bg-surface-container-low p-10 rounded-xl mb-12 w-full">
        <div className="w-24 h-24 rounded-full bg-surface-container-highest shrink-0 flex items-center justify-center overflow-hidden border-2 border-primary/10">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlggZWaEqir0ImDHkfTiumB-KNT5cp--gG7qpuyD0ep2c3ftP8nMd9ZzF1WmR_FE3WnM1VV_aBpu5gCSvTmS63A5x9idCJSwuEhQINItETR-vhsZwvdlUPXoKd2uz2B9RC3Y1BMiVMbn6YFc98WOuK9zV8DB-rR6sZ6avjHdRa2V9RfOaS4I3becLc04NogNlTbahiVoXbVymAr-i-mnHJ5FKuJpQljtspVTcblGVn2Nvsmmlc1UbYUl-aRvx3dz5h6U61vIjjKSA" 
            alt="Expert"
          />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <p className="text-xl font-body italic text-primary leading-snug">
            "O sucesso não vem da intensidade, mas da consistência. Este plano foi feito para você nunca mais precisar recomeçar."
          </p>
          <p className="text-sm font-headline font-bold text-tertiary">Dra. Helena Souza, Head de Neurociência NURA</p>
        </div>
      </div>
    </StepContainer>
  );
};

export default PlanoPersonalizadoStep;
