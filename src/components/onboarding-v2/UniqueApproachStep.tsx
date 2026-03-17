import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const UniqueApproachStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const features = [
    {
      title: 'Nutricionista IA',
      description: 'Inteligência artificial que entende suas necessidades',
      icon: 'psychology',
      color: 'from-nura-petrol-light/20 to-primary/10 dark:from-nura-petrol/20 dark:to-primary/30',
      borderColor: 'border-nura-petrol/20 dark:border-primary/30'
    },
    {
      title: 'Plano de 3 Meses',
      description: 'Adaptação, progressão e consolidação',
      icon: 'calendar_month',
      color: 'from-nura-pastel-orange/20 to-nura-brown/10 dark:from-nura-brown/20 dark:to-nura-pastel-orange/10',
      borderColor: 'border-nura-brown/20 dark:border-nura-brown/30'
    },
    {
      title: 'Baseado em Ciência',
      description: 'Estratégias validadas por estudos',
      icon: 'science',
      color: 'from-primary/10 to-nura-petrol-light/20 dark:from-primary/20 dark:to-nura-petrol/20',
      borderColor: 'border-primary/20 dark:border-nura-petrol/30'
    },
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Hero section with NURA icon */}
            <div className="text-center mb-8">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block mb-4"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-nura-petrol to-primary dark:from-nura-petrol/80 dark:to-primary rounded-full flex items-center justify-center shadow-xl">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '64px', fontWeight: 300 }}>
                    auto_awesome
                  </span>
                </div>
              </motion.div>
              <div className="flex justify-center gap-2 mb-4">
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  className="material-symbols-outlined text-primary text-3xl"
                >
                  star
                </motion.span>
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  className="material-symbols-outlined text-primary text-3xl"
                >
                  star
                </motion.span>
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                  className="material-symbols-outlined text-primary text-3xl"
                >
                  star
                </motion.span>
              </div>
            </div>

            {/* Feature cards */}
            <div className="space-y-4 mb-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ x: index % 2 === 0 ? -50 : 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + index * 0.2 }}
                  className={`bg-gradient-to-br ${feature.color} rounded-2xl p-5 shadow-sm border-2 ${feature.borderColor}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-nura-card dark:bg-surface-dark flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-3xl">
                        {feature.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-nura-main dark:text-white mb-1 text-lg font-display">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-nura-muted dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="bg-gradient-to-r from-nura-petrol-light/30 to-primary/20 dark:from-nura-petrol/20 dark:to-primary/30 border-2 border-nura-petrol/30 dark:border-primary/30 rounded-2xl p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-2xl">insights</span>
                <span className="text-2xl font-bold text-nura-petrol dark:text-primary font-display">60%</span>
              </div>
              <p className="text-sm text-nura-muted dark:text-gray-400">
                dos usuários do <span className="font-semibold text-nura-main dark:text-white">NURA</span> atingem seus objetivos em menos de 3 meses
              </p>
            </motion.div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-2xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Por que o NURA é diferente
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Junte-se a milhares que já transformaram suas vidas
          </p>

          <button
            onClick={onNext}
            className="w-full bg-nura-petrol dark:bg-primary text-white py-4 px-6 rounded-full font-semibold text-lg hover:bg-nura-petrol/90 dark:hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            Vamos lá
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default UniqueApproachStep;
