import React, { useMemo } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const PersonalSummaryStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const summaryData = useMemo(() => {
    const height = data.height || 170;
    const weight = data.currentWeight || 70;
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    const getBMICategory = (bmi: number) => {
      if (bmi < 18.5) return { label: 'Baixo peso', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
      if (bmi < 25) return { label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
      if (bmi < 30) return { label: 'Excesso de peso', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
      return { label: 'Obesidade', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    };

    const category = getBMICategory(bmi);

    // BMI gauge calculation (percentage on gauge)
    const minBMI = 15;
    const maxBMI = 40;
    const bmiPercentage = Math.min(Math.max(((bmi - minBMI) / (maxBMI - minBMI)) * 100, 0), 100);

    return {
      height,
      weight,
      bmi: bmi.toFixed(1),
      category,
      bmiPercentage,
      age: data.age || 25,
      gender: data.gender || 'Masculino',
      activityLevel: data.activityLevel || 'Moderadamente ativo'
    };
  }, [data.height, data.currentWeight, data.age, data.gender, data.activityLevel]);

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              O seu resumo pessoal
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* BMI Gauge Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-lg border-2 border-gray-100 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">O seu IMC</div>
              <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                {summaryData.bmi}
              </div>
              <div className={`inline-block px-4 py-2 rounded-full ${summaryData.category.bgColor}`}>
                <span className={`text-sm font-semibold ${summaryData.category.color}`}>
                  {summaryData.category.label}
                </span>
              </div>
            </div>

            {/* BMI Gauge */}
            <div className="relative h-32 mb-6">
              {/* Semi-circle gauge */}
              <svg viewBox="0 0 200 100" className="w-full">
                {/* Background arc */}
                <path
                  d="M 20 90 A 80 80 0 0 1 180 90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200 dark:text-gray-700"
                />

                {/* Colored sections */}
                {/* Blue (underweight) */}
                <path
                  d="M 20 90 A 80 80 0 0 1 65 25"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="12"
                  opacity="0.6"
                />
                {/* Green (normal) */}
                <path
                  d="M 65 25 A 80 80 0 0 1 135 25"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="12"
                  opacity="0.8"
                />
                {/* Yellow (overweight) */}
                <path
                  d="M 135 25 A 80 80 0 0 1 165 50"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="12"
                  opacity="0.6"
                />
                {/* Red (obese) */}
                <path
                  d="M 165 50 A 80 80 0 0 1 180 90"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="12"
                  opacity="0.6"
                />

                {/* Needle */}
                <g transform={`rotate(${summaryData.bmiPercentage * 1.8 - 90} 100 90)`}>
                  <line
                    x1="100"
                    y1="90"
                    x2="100"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-gray-900 dark:text-white"
                  />
                  <circle cx="100" cy="90" r="6" fill="currentColor" className="text-gray-900 dark:text-white" />
                </g>
              </svg>

              {/* Labels */}
              <div className="absolute bottom-0 left-0 text-xs text-gray-500">15</div>
              <div className="absolute bottom-0 right-0 text-xs text-gray-500">40</div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-500">25</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Idade</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryData.age} anos
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Género</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryData.gender === 'male' ? 'Masculino' : summaryData.gender === 'female' ? 'Feminino' : summaryData.gender}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Altura</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryData.height} cm
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Peso</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryData.weight.toFixed(1)} kg
              </div>
            </div>
          </div>

          {/* Activity Level */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-md w-full">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nível de atividade</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {summaryData.activityLevel}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Seguinte
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default PersonalSummaryStep;
