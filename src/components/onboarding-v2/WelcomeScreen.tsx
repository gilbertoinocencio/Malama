import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nura-petrol/5 to-nura-pastel-orange/10 dark:from-primary/10 dark:to-background-dark flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 mx-auto bg-gradient-to-br from-nura-petrol to-nura-petrol-light dark:from-primary dark:to-primary/70 rounded-3xl flex items-center justify-center shadow-2xl"
        >
          <span className="material-symbols-outlined text-white text-5xl">
            restaurant
          </span>
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-nura-main dark:text-white tracking-tight">
            Bem-vindo ao <span className="text-nura-petrol dark:text-primary">NURA</span>
          </h1>
          <p className="text-lg text-nura-muted dark:text-gray-300 leading-relaxed">
            Vamos conhecer você para criar seu plano alimentar personalizado
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          <FeatureItem
            icon="psychology"
            text="Nutricionista IA personalizada"
          />
          <FeatureItem icon="calendar_month" text="Plano de 3 meses" />
          <FeatureItem icon="science" text="Baseado em evidências" />
          <FeatureItem
            icon="favorite"
            text="Adaptado à sua rotina e preferências"
          />
        </div>

        {/* Info Box */}
        <div className="bg-white dark:bg-surface-dark border border-nura-petrol/20 dark:border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary">
              schedule
            </span>
            <p className="text-sm text-nura-muted dark:text-gray-300">
              Levará apenas <strong className="text-nura-main dark:text-white">3-5 minutos</strong>
            </p>
          </div>
        </div>

        {/* Start Button */}
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-gradient-to-r from-nura-petrol to-nura-petrol-light dark:from-primary dark:to-primary/80 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          Começar
        </motion.button>
      </motion.div>
    </div>
  );
};

// Helper Component
const FeatureItem: React.FC<{ icon: string; text: string }> = ({
  icon,
  text
}) => (
  <div className="flex items-center gap-3 p-3 bg-white dark:bg-surface-dark rounded-lg">
    <div className="size-10 bg-nura-petrol/10 dark:bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-xl">
        {icon}
      </span>
    </div>
    <p className="text-sm font-medium text-nura-main dark:text-white">{text}</p>
  </div>
);
