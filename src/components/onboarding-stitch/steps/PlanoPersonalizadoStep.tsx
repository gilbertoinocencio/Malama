import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';
import { motion } from 'framer-motion';

const PETROL = '#7d4a3c';

const PHASES = [
  {
    label: 'Fase 1',
    title: 'Adaptação',
    duration: 'Dias 1–30',
    description: 'Identificar gatilhos e estabelecer micro-metas sem pressão.',
    items: ['Mapeamento de rotina', 'Introdução ao Flow'],
    icon: 'energy_savings_leaf',
    featured: false,
  },
  {
    label: 'Fase 2',
    title: 'Flow',
    duration: 'Dias 31–60',
    description: 'Intensificamos as práticas. Você começará a sentir a clareza mental e a consistência.',
    items: ['Práticas avançadas', 'Otimização de sono'],
    icon: 'auto_awesome',
    featured: true,
  },
  {
    label: 'Fase 3',
    title: 'Consolidação',
    duration: 'Dias 61–90',
    description: 'Reta final. Transformação de hábitos em identidade.',
    items: ['Sustentabilidade a longo prazo', 'Certificação Malama'],
    icon: 'verified',
    featured: false,
  },
];

const PlanoPersonalizadoStep: React.FC<StepProps> = ({ onNext, onBack, currentStep, totalSteps }) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Começar Agora"
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Seu plano está pronto.
        </h1>
        <p className="text-stone-400 text-base font-light max-w-xs mx-auto">
          Uma jornada de 90 dias para transformar sua rotina em ritual de bem-estar.
        </p>
      </div>

      {/* Phase cards */}
      <div className="space-y-3 mb-4">
        {PHASES.map((phase, i) => (
          <motion.div
            key={phase.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{
              background: phase.featured ? PETROL : 'white',
              borderColor: phase.featured ? PETROL : '#f5f5f4',
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span
                    className="text-[10px] uppercase tracking-widest font-light block mb-0.5"
                    style={{ color: phase.featured ? 'rgba(255,255,255,0.6)' : '#a8a29e' }}
                  >
                    {phase.label} · {phase.duration}
                  </span>
                  <h3
                    className="text-xl"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: phase.featured ? 'white' : '#292524',
                    }}
                  >
                    {phase.title}
                  </h3>
                </div>
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: phase.featured ? 'rgba(255,255,255,0.7)' : '#a8a29e' }}
                >
                  {phase.icon}
                </span>
              </div>
              <p
                className="text-sm font-light leading-relaxed mb-4"
                style={{ color: phase.featured ? 'rgba(255,255,255,0.75)' : '#78716c' }}
              >
                {phase.description}
              </p>
              <div className="space-y-1.5">
                {phase.items.map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{
                        color: phase.featured ? 'rgba(255,255,255,0.8)' : PETROL,
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      check_circle
                    </span>
                    <span
                      className="text-sm font-light"
                      style={{ color: phase.featured ? 'rgba(255,255,255,0.85)' : '#57534e' }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quote */}
      <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
        <p className="text-stone-500 text-sm font-light italic leading-relaxed mb-3">
          "O sucesso não vem da intensidade, mas da consistência. Este plano foi feito para você nunca mais precisar recomeçar."
        </p>
        <p className="text-stone-400 text-xs uppercase tracking-widest font-light">
          Dra. Helena Souza · Head de Neurociência Malama
        </p>
      </div>
    </StepContainer>
  );
};

export default PlanoPersonalizadoStep;
