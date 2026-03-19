import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const EducaHidratacaoStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  return (
    <StepContainer
      currentStep={12}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Entendi"
    >
      <section className="mb-12 space-y-4">
        <span className="text-secondary font-headline font-semibold tracking-widest text-sm uppercase px-1">Fase 04 — Metabolismo</span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary leading-tight tracking-tight">
          Água como Combustível
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-lg">
          Seu metabolismo não é apenas genética; é química. A hidratação correta é o catalisador que transforma nutrientes em energia vital.
        </p>
      </section>

      {/* Asymmetric Bento-style Infographic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Main Efficiency Graph Card */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-primary font-headline font-bold text-xl">Eficiência Metabólica</h3>
              <p className="text-sm text-on-surface-variant">Taxa de queima calórica basal</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-secondary font-headline">+24%</span>
              <div className="flex items-center gap-1 text-secondary">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                <span className="text-xs font-bold uppercase tracking-tighter">Otimizado</span>
              </div>
            </div>
          </div>

          {/* Minimalist Chart */}
          <div className="relative h-48 w-full flex items-end gap-2 px-2">
            <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-10 pointer-events-none border-y border-primary/20">
              <div className="w-full h-px bg-primary/20"></div>
              <div className="w-full h-px bg-primary/20"></div>
            </div>
            
            {[30, 42, 55, 72, 95].map((height, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`flex-1 rounded-t-lg transition-all duration-500 ${
                  i === 4 ? 'bg-primary relative' : 'bg-surface-container-high hover:bg-primary-fixed-dim'
                }`}
              >
                {i === 4 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] px-2 py-1 rounded font-bold">PICO</div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex justify-between text-[10px] font-bold text-outline uppercase tracking-widest border-t border-surface-container-highest pt-4">
            <span>Desidratado</span>
            <span>Hidratado</span>
          </div>
        </div>

        {/* Side Metric Card 01 */}
        <div className="md:col-span-4 bg-surface-container-low rounded-xl p-6 flex flex-col justify-between aspect-square group transition-all duration-300 hover:bg-white hover:shadow-xl">
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase tracking-widest block mb-1">Volume Ideal</span>
            <h4 className="text-2xl font-bold text-primary font-headline">500ml</h4>
            <p className="text-xs text-on-surface-variant mt-2">Ingestão matinal aumenta o metabolismo em 30% nos primeiros 60 min.</p>
          </div>
        </div>

        {/* Wide Insight Card */}
        <div className="md:col-span-12 flex flex-col md:flex-row gap-8 items-center bg-primary text-on-primary p-8 rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
            <span className="material-symbols-outlined text-[20rem]" style={{ fontVariationSettings: "'wght' 100" }}>waves</span>
          </div>
          <div className="flex-shrink-0 w-24 h-24 rounded-full border-2 border-primary-fixed-dim/30 flex items-center justify-center p-2">
            <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-4xl">bolt</span>
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-headline font-bold mb-2">Combustão Celular</h3>
            <p className="text-on-primary-container text-opacity-90 max-w-xl leading-relaxed">
              A água é essencial para a <span className="text-secondary-fixed-dim font-bold">lipólise</span> — o processo metabólico de queima de gordura. Sem ela, seu corpo reduz a velocidade de processamento para conservar energia.
            </p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default EducaHidratacaoStep;
