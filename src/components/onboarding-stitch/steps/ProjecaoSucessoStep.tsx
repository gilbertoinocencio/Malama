import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const ProjecaoSucessoStep: React.FC<StepProps> = ({ data, onNext, onBack }) => {
  const target = data.targetWeight || 70;
  const current = data.weight || 78.5;
  const diff = (current - target).toFixed(1);

  return (
    <StepContainer
      currentStep={17}
      totalSteps={24}
      onNext={onNext}
      onBack={onBack}
    >
      <section className="mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-primary leading-tight tracking-tight mb-4 text-center md:text-left">
          Sua Projeção de Sucesso
        </h2>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-md text-center md:text-left">
          Baseado no seu perfil metabólico, desenhamos o caminho para sua transformação nos próximos 3 meses.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 w-full">
        {/* Elegant Projection Card */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10 relative overflow-hidden">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-sm font-label uppercase tracking-widest text-on-surface-variant mb-1">Perda Estimada</p>
              <p className="text-4xl font-headline font-bold text-secondary">-{diff}kg</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-label text-on-surface-variant">Data Alvo</p>
              <p className="text-xl font-headline font-medium text-primary">12 Semanas</p>
            </div>
          </div>

          {/* Custom Visual Chart (SVG with framer-motion path animation) */}
          <div className="relative h-64 w-full mt-8">
            <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 400 150">
              <line className="text-surface-container-highest" stroke="currentColor" strokeDasharray="4" x1="0" x2="400" y1="20" y2="20"></line>
              <line className="text-surface-container-highest" stroke="currentColor" strokeDasharray="4" x1="0" x2="400" y1="60" y2="60"></line>
              <line className="text-surface-container-highest" stroke="currentColor" strokeDasharray="4" x1="0" x2="400" y1="100" y2="100"></line>
              
              <defs>
                <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#006d36" stopOpacity="0.2"></stop>
                  <stop offset="100%" stopColor="#006d36" stopOpacity="0"></stop>
                </linearGradient>
              </defs>

              <motion.path 
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                d="M0,20 L50,25 L100,45 L150,55 L200,80 L250,90 L300,115 L350,125 L400,140" 
                fill="none" 
                stroke="#006d36" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="4"
              ></motion.path>
              
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                d="M0,20 L50,25 L100,45 L150,55 L200,80 L250,90 L300,115 L350,125 L400,140 L400,150 L0,150 Z" 
                fill="url(#chartGradient)"
              ></motion.path>

              <motion.circle 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2, type: "spring" }}
                className="fill-secondary shadow-lg" 
                cx="400" cy="140" r="6"
              ></motion.circle>
            </svg>
            <div className="flex justify-between mt-4 text-[10px] font-label text-stone-400 uppercase tracking-tighter">
              <span>Hoje</span>
              <span>Semana 4</span>
              <span>Semana 8</span>
              <span>Semana 12</span>
            </div>
          </div>
        </div>

        {/* Insight Stats Bento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-6 rounded-lg flex flex-col gap-2 transition-all hover:bg-white hover:shadow-md">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <p className="text-xs font-label text-on-surface-variant">Metabolismo</p>
            <p className="text-xl font-headline font-semibold text-primary">+14% Eficiência</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-lg flex flex-col gap-2 transition-all hover:bg-white hover:shadow-md">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <p className="text-xs font-label text-on-surface-variant">Saúde Celular</p>
            <p className="text-xl font-headline font-semibold text-primary">Nível Ótimo</p>
          </div>
        </div>

        {/* Goal Milestone Card */}
        <div className="flex items-center gap-6 p-6 bg-primary-container/10 rounded-lg border border-primary-container/20">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg">
            <span className="material-symbols-outlined text-primary-fixed text-3xl">auto_awesome</span>
          </div>
          <div>
            <h4 className="font-headline font-bold text-primary">Seu "Novo Eu" em 90 dias</h4>
            <p className="text-sm text-on-surface-variant">72% dos usuários NURA alcançam a meta projetada mantendo a consistência sugerida.</p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProjecaoSucessoStep;
