import React, { useMemo } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const NutritionalRecommendationsStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const nutritionData = useMemo(() => {
    const weight = data.currentWeight || 70;
    const height = data.height || 170;
    const age = data.age || 25;
    const gender = data.gender || 'male';
    const activityLevel = data.activityLevel || 'Moderadamente ativo';

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (gender === 'male' || gender === 'Masculino') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multiplier
    const activityMultipliers: { [key: string]: number } = {
      'Sedentário': 1.2,
      'Levemente ativo': 1.375,
      'Moderadamente ativo': 1.55,
      'Muito ativo': 1.725,
      'Extremamente ativo': 1.9
    };

    const multiplier = activityMultipliers[activityLevel] || 1.55;
    const tdee = Math.round(bmr * multiplier);

    // Adjust for goal (weight loss)
    const goalCalories = Math.round(tdee - 500); // 500 calorie deficit for weight loss

    // Calculate macros (40% carbs, 30% protein, 30% fat for weight loss)
    const protein = Math.round((goalCalories * 0.30) / 4); // 4 cal/g
    const carbs = Math.round((goalCalories * 0.40) / 4); // 4 cal/g
    const fats = Math.round((goalCalories * 0.30) / 9); // 9 cal/g

    return {
      calories: goalCalories,
      protein,
      carbs,
      fats,
      tdee
    };
  }, [data.currentWeight, data.height, data.age, data.gender, data.activityLevel]);

  const macros = [
    { name: 'Proteínas', value: nutritionData.protein, unit: 'g', color: 'bg-red-500', percentage: 30 },
    { name: 'Carboidratos', value: nutritionData.carbs, unit: 'g', color: 'bg-blue-500', percentage: 40 },
    { name: 'Gorduras', value: nutritionData.fats, unit: 'g', color: 'bg-yellow-500', percentage: 30 }
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              As suas recomendações nutricionais
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Daily Calories Card */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800 rounded-3xl p-8 max-w-md w-full text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Calorias diárias recomendadas
            </div>
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
              {nutritionData.calories}
            </div>
            <div className="text-lg text-gray-600 dark:text-gray-400">
              kcal por dia
            </div>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Gasto energético: {nutritionData.tdee} kcal
            </div>
          </div>

          {/* Macros Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full border-2 border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">
              Distribuição de Macronutrientes
            </h3>

            {/* Pie Chart (Simple stacked bar) */}
            <div className="flex h-4 rounded-full overflow-hidden mb-6">
              <div className="bg-red-500" style={{ width: '30%' }} />
              <div className="bg-blue-500" style={{ width: '40%' }} />
              <div className="bg-yellow-500" style={{ width: '30%' }} />
            </div>

            {/* Macro Details */}
            <div className="space-y-4">
              {macros.map((macro) => (
                <div key={macro.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${macro.color}`} />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {macro.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {macro.percentage}% das calorias
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {macro.value}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {macro.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-md w-full">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
                info
              </span>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold mb-1">Plano personalizado</p>
                <p>
                  Estas recomendações foram calculadas com base no seu perfil, objetivo e nível de atividade.
                  Ajuste conforme necessário com acompanhamento profissional.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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

export default NutritionalRecommendationsStep;
