import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const EducaJejumStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      progress={(currentStep / totalSteps) * 100}
      onBack={onBack}
      nextLabel="Entendi, continuar jornada"
    >
      <section className="mt-8 mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-tertiary leading-tight tracking-tight mb-6">
          O que é o Jejum Intermitente?
        </h2>
        <p className="text-lg md:text-xl text-on-surface-variant font-body leading-relaxed max-w-prose">
          Uma pausa consciente na alimentação para recalibrar o seu metabolismo.
        </p>
      </section>

      {/* Visual Explanation: Circadian Cycle Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Circadian Rhythm Card */}
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-48 h-48 md:w-56 md:h-56 relative flex items-center justify-center">
              {/* Abstract Circadian Ring */}
              <motion.div 
                className="absolute inset-0 border-4 border-dashed border-outline-variant/30 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <div className="w-full h-full rounded-full border-[10px] border-surface-container-highest flex items-center justify-center overflow-hidden">
                <div className="w-full h-1/2 bg-tertiary-fixed absolute top-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-4xl">light_mode</span>
                </div>
                <div className="w-full h-1/2 bg-tertiary absolute bottom-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary-fixed text-4xl">dark_mode</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold font-lexend text-tertiary mb-3">Ciclo Circadiano</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                Seu corpo possui um relógio interno natural. O jejum alinha sua nutrição a este ritmo, otimizando a queima de gordura e a reparação celular durante o descanso.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-secondary-container/30 text-secondary text-xs font-semibold rounded-full">Metabolismo</span>
                <span className="px-3 py-1 bg-tertiary-fixed/30 text-tertiary text-xs font-semibold rounded-full">Equilíbrio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nutrition Card */}
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between group hover:bg-surface-container transition-colors duration-500">
          <div>
            <span className="material-symbols-outlined text-secondary text-4xl mb-4">restaurant</span>
            <h3 className="text-lg font-bold font-lexend text-tertiary mb-2">Nutrição Consciente</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">Qualidade sobre quantidade. A janela de alimentação é o momento de nutrir cada célula com intenção.</p>
          </div>
        </div>

        {/* Metabolism Card */}
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between group hover:bg-surface-container transition-colors duration-500">
          <div>
            <span className="material-symbols-outlined text-tertiary text-4xl mb-4">energy_savings_leaf</span>
            <h3 className="text-lg font-bold font-lexend text-tertiary mb-2">Pausa Metabólica</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">Dê ao seu sistema digestivo o descanso necessário para focar na renovação e longevidade.</p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default EducaJejumStep;
