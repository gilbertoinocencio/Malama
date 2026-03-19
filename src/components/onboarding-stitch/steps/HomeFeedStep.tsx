import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const HomeFeedStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <StepContainer
      currentStep={24}
      totalSteps={24}
      onNext={onNext}
      onBack={() => {}}
      nextLabel="Concluir"
    >
      <div className="text-center space-y-8 py-20 relative w-full">
        <div className="absolute inset-0 -z-10 bg-nura-pattern opacity-10"></div>
        
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4"
        >
          <span className="material-symbols-outlined text-secondary text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Tudo pronto!</h1>
          <p className="text-on-surface-variant text-lg max-w-md mx-auto">
            Configuramos seu feed personalizado. Prepare-se para vivenciar o seu melhor estado de saúde.
          </p>
        </motion.div>

        <div className="max-w-xl mx-auto bg-surface-container-lowest p-8 rounded-3xl shadow-2xl border border-surface-container-highest overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <span className="material-symbols-outlined text-9xl">eco</span>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-full bg-primary-fixed-dim flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">feed</span>
              </div>
              <div>
                <h4 className="font-bold text-primary">Feed Inteligente</h4>
                <p className="text-xs text-on-surface-variant">Recomendações baseadas no seu ritmo único.</p>
              </div>
            </div>

            <div className="h-px bg-surface-container-highest"></div>

            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">insights</span>
              </div>
              <div>
                <h4 className="font-bold text-primary">Acompanhamento Flow</h4>
                <p className="text-xs text-on-surface-variant">Insights automáticos sobre sua bio-sincronização.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default HomeFeedStep;
