import React, { useEffect } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#9c5d4b';

const CriandoPlanoStep: React.FC<StepProps> = ({ onNext, currentStep, totalSteps }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={() => {}} 
      hideNavigation={true}
    >
      <div className="flex flex-col items-center justify-center min-h-[70vh] relative z-10 w-full">
        {/* Minimalist Spinner */}
        <div className="relative w-48 h-48 flex items-center justify-center mb-12">
          <div className="w-32 h-32 rounded-full border border-stone-200 flex items-center justify-center bg-white shadow-sm">
            <motion.span 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="material-symbols-outlined text-4xl" 
              style={{ color: PETROL, fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </motion.span>
          </div>
        </div>

        {/* Content */}
        <div className="text-center max-w-md w-full">
          <h1 
            className="text-3xl text-stone-800 mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Criando seu <span style={{ color: PETROL, fontStyle: 'italic' }}>Flow</span>...
          </h1>

          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-sm" style={{ color: PETROL, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="text-sm font-light text-stone-500">Analisando perfil biológico</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="flex items-center justify-center gap-3"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-3 h-3 border border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
              </div>
              <p className="text-sm font-light text-stone-800">Otimizando nutrição</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
              className="flex items-center justify-center gap-3 opacity-60"
            >
              <span className="material-symbols-outlined text-sm text-stone-300">circle</span>
              <p className="text-sm font-light text-stone-400">Sincronizando com seu ritmo</p>
            </motion.div>
          </div>
        </div>

        <div className="mt-16 w-full max-w-xs h-1 bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4.5, ease: "linear" }}
            className="h-full rounded-full"
            style={{ background: PETROL }}
          ></motion.div>
        </div>
      </div>
    </StepContainer>
  );
};

export default CriandoPlanoStep;
