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
      title: 'Rastreamento Inteligente',
      description: 'IA que entende suas refeições',
      icon: '🧠',
      color: 'from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Planos Personalizados',
      description: 'Adaptado ao seu estilo de vida',
      icon: '✨',
      color: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Suporte Contínuo',
      description: 'Sempre ao seu lado',
      icon: '🤝',
      color: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
      borderColor: 'border-green-200 dark:border-green-800'
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
            {/* Hero section with mascot */}
            <div className="text-center mb-8">
              <motion.div
                animate={{
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block text-9xl mb-4"
              >
                🦝
              </motion.div>
              <div className="flex justify-center gap-2 mb-4">
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  className="text-3xl"
                >
                  ⭐
                </motion.span>
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  className="text-3xl"
                >
                  ⭐
                </motion.span>
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                  className="text-3xl"
                >
                  ⭐
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
                  className={`bg-gradient-to-br ${feature.color} rounded-2xl p-5 shadow-md border-2 ${feature.borderColor}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{feature.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-lg">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
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
              className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">📊</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">60%</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                dos usuários do BitePal atingem seus objetivos em menos de 3 meses
              </p>
            </motion.div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Por que a abordagem única do BitePal funciona
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Junte-se a milhares que já transformaram suas vidas
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            Vamos lá
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default UniqueApproachStep;
