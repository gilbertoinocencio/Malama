import React from 'react';
import { StepProps } from '../types';
import { StepContainer } from '../StepContainer';

const PETROL = '#7d4a3c';

const HABITOS = [
  { id: 'comer_noite', label: 'Comer à noite', icon: 'dark_mode' },
  { id: 'beliscar', label: 'Beliscar o dia todo', icon: 'restaurant' },
  { id: 'doces', label: 'Doces em excesso', icon: 'icecream' },
  { id: 'sedentarismo', label: 'Sedentarismo', icon: 'directions_walk' },
  { id: 'nenhum', label: 'Nenhum destes', icon: 'check_circle' },
];

const NENHUM = 'nenhum';

const MudancaHabitosStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const selected = data.habitChanges || [];

  const toggleHabit = (id: string) => {
    if (id === NENHUM) {
      updateData({ habitChanges: [NENHUM] });
      return;
    }
    const withoutNenhum = selected.filter((h: string) => h !== NENHUM);
    const next = withoutNenhum.includes(id)
      ? withoutNenhum.filter((h: string) => h !== id)
      : [...withoutNenhum, id];
    updateData({ habitChanges: next });
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={selected.length === 0}
    >
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Quais hábitos quer mudar?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-sm mx-auto leading-relaxed">
          Selecione os comportamentos que você deseja transformar nesta jornada.
        </p>
      </div>

      <div className="w-full space-y-3">
        {HABITOS.map((habit) => {
          const isSelected = selected.includes(habit.id);
          return (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 border shadow-sm ${
                isSelected
                  ? 'bg-stone-50/50 border-stone-300'
                  : 'bg-white border-stone-100 hover:bg-stone-50/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  isSelected ? 'bg-stone-100' : 'bg-stone-50'
                }`}>
                  <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-stone-700' : 'text-stone-400'}`}>
                    {habit.icon}
                  </span>
                </div>
                <span
                  className={`text-base transition-colors ${isSelected ? 'text-stone-800' : 'text-stone-600 font-light'}`}
                  style={isSelected ? { fontFamily: "'Playfair Display', serif" } : {}}
                >
                  {habit.label}
                </span>
              </div>
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 flex-shrink-0"
                style={{
                  background: isSelected ? PETROL : 'white',
                  border: `1.5px solid ${isSelected ? PETROL : '#e7e5e4'}`,
                }}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </StepContainer>
  );
};

export default MudancaHabitosStep;
