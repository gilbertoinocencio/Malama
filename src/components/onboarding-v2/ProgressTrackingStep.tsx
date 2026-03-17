import React from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const ProgressTrackingStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  // Sample data for the weight progress chart
  const progressData = [
    { date: 'Jun 3', weight: 76, color: '#FF6B6B' },
    { date: 'Jun 17', weight: 74, color: '#FFD93D' },
    { date: 'Jul 1', weight: 72, color: '#F9E79F' },
    { date: 'Jul 15', weight: 71, color: '#C1E1C1' },
    { date: 'Jul 24', weight: 70, color: '#90EE90' },
    { date: 'Jul 31', weight: 70, color: '#4ECDC4' },
  ];

  const maxWeight = 80;
  const minWeight = 65;

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Progress card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mb-8"
          >
            <div className="bg-gradient-to-br from-pink-50 to-yellow-50 dark:from-pink-900/20 dark:to-yellow-900/20 rounded-3xl p-8 shadow-lg border-2 border-pink-100 dark:border-pink-800">
              {/* Raccoon with hearts */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  <div className="text-6xl relative">
                    🦝
                    <span className="absolute -top-2 -right-2 text-3xl">😍</span>
                  </div>
                  <div className="flex justify-center gap-2 mt-2">
                    <span className="text-2xl">❤️</span>
                    <span className="text-2xl">❤️</span>
                  </div>
                </motion.div>
              </div>

              {/* Weight stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Peso</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    76<span className="text-lg text-gray-500">kg</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Progresso</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    -6<span className="text-lg">kg</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-40 mb-4">
                <svg viewBox="0 0 300 120" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 30}
                      x2="300"
                      y2={i * 30}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-gray-300 dark:text-gray-600"
                      strokeDasharray="2,2"
                    />
                  ))}

                  {/* Progress line */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                    d={progressData.map((point, index) => {
                      const x = (index / (progressData.length - 1)) * 280 + 10;
                      const y = ((maxWeight - point.weight) / (maxWeight - minWeight)) * 100 + 10;
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FF6B6B" />
                      <stop offset="20%" stopColor="#FFD93D" />
                      <stop offset="40%" stopColor="#F9E79F" />
                      <stop offset="60%" stopColor="#C1E1C1" />
                      <stop offset="80%" stopColor="#90EE90" />
                      <stop offset="100%" stopColor="#4ECDC4" />
                    </linearGradient>
                  </defs>

                  {/* Data points */}
                  {progressData.map((point, index) => {
                    const x = (index / (progressData.length - 1)) * 280 + 10;
                    const y = ((maxWeight - point.weight) / (maxWeight - minWeight)) * 100 + 10;
                    return (
                      <motion.circle
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.2, duration: 0.3 }}
                        cx={x}
                        cy={y}
                        r="5"
                        fill={point.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>

                {/* Date labels */}
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {progressData.map((point, index) => (
                    <span key={index} className={index % 2 === 0 ? '' : 'opacity-0'}>
                      {point.date}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="pb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Veja resultados
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Acompanhe seu progresso e celebre cada vitória
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            Próximo
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProgressTrackingStep;
