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
    { date: 'Jun 3', weight: 76, color: '#1F4E5F' },
    { date: 'Jun 17', weight: 74, color: '#11c4d4' },
    { date: 'Jul 1', weight: 72, color: '#11c4d4' },
    { date: 'Jul 15', weight: 71, color: '#11c4d4' },
    { date: 'Jul 24', weight: 70, color: '#11c4d4' },
    { date: 'Jul 31', weight: 70, color: '#11c4d4' },
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
            <div className="bg-gradient-to-br from-nura-petrol-light/20 to-primary/10 dark:from-nura-petrol/20 dark:to-primary/20 rounded-3xl p-8 shadow-lg border-2 border-nura-petrol/20 dark:border-primary/30">
              {/* Progress icon */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-nura-petrol to-primary dark:from-nura-petrol/80 dark:to-primary rounded-full flex items-center justify-center shadow-xl mb-2">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '48px', fontWeight: 300 }}>
                      trending_down
                    </span>
                  </div>
                  <div className="flex justify-center gap-2 mt-2">
                    <span className="material-symbols-outlined text-primary text-xl">star</span>
                    <span className="material-symbols-outlined text-primary text-xl">star</span>
                  </div>
                </motion.div>
              </div>

              {/* Weight stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-nura-muted dark:text-gray-400 mb-1">Peso</div>
                  <div className="text-3xl font-bold text-nura-main dark:text-white font-display">
                    76<span className="text-lg text-nura-muted dark:text-gray-400">kg</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-nura-muted dark:text-gray-400 mb-1">Progresso</div>
                  <div className="text-3xl font-bold text-primary dark:text-primary font-display">
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
                      className="text-nura-border dark:text-gray-600"
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
                    stroke="url(#nuraGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* NURA gradient definition */}
                  <defs>
                    <linearGradient id="nuraGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1F4E5F" />
                      <stop offset="50%" stopColor="#11c4d4" />
                      <stop offset="100%" stopColor="#11c4d4" />
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
                <div className="flex justify-between text-xs text-nura-muted dark:text-gray-400 mt-2">
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
          <h2 className="text-2xl font-bold text-nura-main dark:text-white text-center mb-2 font-display">
            Veja resultados
          </h2>
          <p className="text-center text-nura-muted dark:text-gray-400 mb-6">
            Acompanhe seu progresso e celebre cada vitória
          </p>

          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Próximo
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProgressTrackingStep;
