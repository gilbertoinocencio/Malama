import React, { useEffect } from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const CriandoPlanoStep: React.FC<StepProps> = ({ onNext }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 4500); // 4.5 seconds for cinematic effect
    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <StepContainer
      currentStep={20}
      totalSteps={24}
      onNext={onNext}
      onBack={() => {}} // Disabled for loading
      hideNavigation={true}
    >
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-20 w-[30rem] h-[30rem] bg-primary-fixed-dim opacity-10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10 w-full">
        {/* AI Core Visual */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-16">
          <motion.div 
            animate={{ scale: [1.1, 1.25, 1.1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 border-[0.5px] border-secondary/20 rounded-full"
          ></motion.div>
          <motion.div 
            animate={{ scale: [1.25, 1.4, 1.25], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 border-[1px] border-secondary/10 rounded-full"
          ></motion.div>

          <div className="relative z-10 w-48 h-48 rounded-full bg-surface-container-lowest shadow-2xl flex items-center justify-center group overflow-hidden border border-surface-container-highest">
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-primary/5"></div>
            <div className="relative z-20 flex flex-col items-center">
              <motion.span 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="material-symbols-outlined text-secondary text-5xl mb-2" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </motion.span>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-secondary"
                  ></motion.div>
                ))}
              </div>
            </div>
          </div>

          <motion.div 
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-0 right-4 p-3 bg-surface-container-lowest rounded-2xl shadow-md border border-secondary/5 flex items-center gap-3 backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-secondary text-lg">monitor_heart</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">BIOMETRIC_DATA</span>
          </motion.div>
          
          <motion.div 
            animate={{ y: [5, -5, 5] }}
            transition={{ duration: 3.5, repeat: Infinity }}
            className="absolute bottom-8 -left-8 p-3 bg-surface-container-lowest rounded-2xl shadow-md border border-secondary/5 flex items-center gap-3 backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-secondary text-lg">restaurant</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">MACRO_SYNC</span>
          </motion.div>
        </div>

        {/* Editorial Content */}
        <div className="text-center max-w-md">
          <h1 className="font-headline text-4xl md:text-5xl font-medium tracking-tight text-primary mb-10">
            Criando seu <span className="text-secondary italic">Flow</span> único...
          </h1>

          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3 text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="font-body text-lg font-light">Analisando biometria</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="flex items-center justify-center gap-3 text-primary"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
              </div>
              <p className="font-body text-lg font-medium">Otimizando macros</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.5 }}
              className="flex items-center justify-center gap-3 text-stone-400 opacity-60"
            >
              <span className="material-symbols-outlined text-xl">circle</span>
              <p className="font-body text-lg font-light">Sincronizando com seu ritmo</p>
            </motion.div>
          </div>
        </div>

        <div className="mt-20 w-full max-w-xs h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4.5, ease: "linear" }}
            className="h-full bg-secondary rounded-full shadow-sm"
          ></motion.div>
        </div>
        <p className="mt-4 text-outline text-[10px] tracking-widest font-bold uppercase font-headline">Processando Algoritmo v2.4</p>
      </div>
    </StepContainer>
  );
};

export default CriandoPlanoStep;
