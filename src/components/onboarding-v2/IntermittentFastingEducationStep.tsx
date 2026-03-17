import React from 'react';
import { StepProps } from './types';

const IntermittentFastingEducationStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto">
        <div className="text-6xl mb-8">💧</div>
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Jejum Intermitente
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
            O jejum intermitente é um padrão alimentar que alterna entre períodos de jejum e alimentação. Pode ajudar com:
          </p>
          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Perda de peso e gordura corporal</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Melhoria da saúde metabólica</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Redução da inflamação</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Aumento da energia e foco mental</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onNext}
          className="w-full max-w-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          Seguinte
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default IntermittentFastingEducationStep;
