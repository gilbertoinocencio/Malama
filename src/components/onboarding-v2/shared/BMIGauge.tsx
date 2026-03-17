import React from 'react';

interface BMIGaugeProps {
  bmi: number;
  className?: string;
}

const BMIGauge: React.FC<BMIGaugeProps> = ({ bmi, className = '' }) => {
  // BMI ranges
  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Baixo peso', color: '#3B82F6' };
    if (bmi < 25) return { label: 'Normal', color: '#10B981' };
    if (bmi < 30) return { label: 'Excesso de peso', color: '#F59E0B' };
    return { label: 'Obesidade', color: '#EF4444' };
  };

  const category = getBMICategory(bmi);

  // Calculate gauge position (15 to 40 BMI range)
  const minBMI = 15;
  const maxBMI = 40;
  const percentage = Math.min(Math.max(((bmi - minBMI) / (maxBMI - minBMI)) * 100, 0), 100);

  return (
    <div className={`${className}`}>
      <div className="text-center mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Índice de Massa Corporal (IMC)
        </div>
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          Tu: {bmi.toFixed(2)}
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500">
        {/* Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-900 dark:bg-white rounded-full transition-all duration-500"
          style={{ left: `${percentage}%`, marginLeft: '-2px' }}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
              {bmi.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span>15</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>

      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1 font-medium">
        <span>Baixo peso</span>
        <span>Normal</span>
        <span>Excesso de peso</span>
        <span>Obesidade</span>
      </div>

      {/* Category info */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white mb-1">
              Riscos de um IMC pouco saudável
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Este intervalo pode estar ligado a maiores riscos de doença cardíaca, diabetes tipo
              2 e desconforto nas articulações (CDC), mas pequenos passos levam a grandes mudanças!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMIGauge;
