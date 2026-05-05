import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const EducaHidratacaoStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Entendi"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Água como Combustível
        </h1>
        <p className="text-stone-400 text-base font-light max-w-sm mx-auto leading-relaxed">
          Seu metabolismo não é apenas genética; é química. A hidratação correta transforma nutrientes em energia vital.
        </p>
      </div>

      {/* Main chart card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-stone-700 text-base mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Eficiência Metabólica
            </p>
            <p className="text-stone-400 text-xs font-light">Taxa de queima calórica basal</p>
          </div>
          <div className="text-right">
            <p className="text-2xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>+24%</p>
            <p className="text-xs text-stone-400 font-light uppercase tracking-widest">otimizado</p>
          </div>
        </div>

        <div className="flex items-end gap-2 h-28">
          {[30, 42, 55, 72, 95].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
              className="flex-1 rounded-t-lg"
              style={{ background: i === 4 ? PETROL : i >= 2 ? `${PETROL}50` : '#e7e5e4' }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone-400 font-light mt-3 border-t border-stone-100 pt-3">
          <span>Desidratado</span>
          <span>Hidratado</span>
        </div>
      </div>

      {/* Two stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-stone-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              water_drop
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Volume ideal</p>
          <p className="text-2xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>500ml</p>
          <p className="text-xs text-stone-400 font-light mt-1 leading-snug">Ingestão matinal recomendada</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-stone-400 text-lg">bolt</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-light mb-1">Resultado</p>
          <p className="text-2xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>+30%</p>
          <p className="text-xs text-stone-400 font-light mt-1 leading-snug">nos primeiros 60 min</p>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
          <span className="material-symbols-outlined text-stone-400 text-lg">science</span>
        </div>
        <p className="text-sm font-light text-stone-500 leading-relaxed">
          A água é essencial para a <span className="text-stone-700 font-medium">lipólise</span> — o processo de queima de gordura. Sem ela, seu corpo desacelera para conservar energia.
        </p>
      </div>
    </StepContainer>
  );
};

export default EducaHidratacaoStep;
