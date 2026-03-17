import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PersonalizingPlanStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [progress, setProgress] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  const tasks = [
    { id: 0, text: 'A analisar as suas respostas', completed: false },
    { id: 1, text: 'A definir requisitos de nutrientes', completed: false },
    { id: 2, text: 'A estimar progresso de peso', completed: false },
    { id: 3, text: 'A ajustar dicas de nutrição', completed: false },
  ];

  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  useEffect(() => {
    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Complete tasks progressively
    const taskTimers = [
      setTimeout(() => setCompletedTasks([0]), 1000),
      setTimeout(() => setCompletedTasks([0, 1]), 2000),
      setTimeout(() => setCompletedTasks([0, 1, 2]), 3000),
      setTimeout(() => {
        setCompletedTasks([0, 1, 2, 3]);
        // Auto-advance after completion
        setTimeout(() => onNext(), 1500);
      }, 4000),
    ];

    return () => {
      clearInterval(progressInterval);
      taskTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [onNext]);

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={false}>
      <div className="flex flex-col h-full justify-center items-center">
        <div className="text-center max-w-2xl w-full">
          {/* Animated Circle Progress */}
          <div className="relative w-48 h-48 mx-auto mb-12">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <motion.circle
                cx="100"
                cy="100"
                r="90"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                className="text-green-500"
                initial={{ strokeDasharray: '0 565' }}
                animate={{ strokeDasharray: `${(progress / 100) * 565} 565` }}
                transition={{ duration: 0.3 }}
              />
            </svg>
            {/* Progress percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white">
                {Math.round(progress)}%
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            A personalizar o seu plano
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Estamos a criar o seu plano nutricional personalizado
          </p>

          {/* Task List */}
          <div className="space-y-4 max-w-md mx-auto">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: task.id * 0.2 }}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                  completedTasks.includes(task.id)
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {completedTasks.includes(task.id) ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                        check_circle
                      </span>
                    </motion.div>
                  ) : currentTaskIndex === task.id ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
                        refresh
                      </span>
                    </motion.div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>

                {/* Text */}
                <div className={`text-left flex-1 font-medium ${
                  completedTasks.includes(task.id)
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {task.text}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default PersonalizingPlanStep;
