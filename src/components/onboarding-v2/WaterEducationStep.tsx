import React from 'react';
import { StepProps } from './types';

const WaterEducationStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto">
        <div className="text-6xl mb-8">💧</div>
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Hidratação é essencial
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Melhora a função cerebral e concentração</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Regula a temperatura corporal</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Auxilia na digestão e absorção de nutrientes</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Mantém a pele saudável e hidratada</span>
            </li>
          </ul>
        </div>

        <button onClick={onNext} className="w-full max-w-md bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          Seguinte <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default WaterEducationStep;