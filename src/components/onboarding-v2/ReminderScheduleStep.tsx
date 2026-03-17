import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const ReminderScheduleStep: React.FC<StepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {

  const schedules = [
    { value: 'manha', label: 'Manhã', icon: '🌅', time: '08:00' },
    { value: 'almoco', label: 'Almoço', icon: '☀️', time: '12:00' },
    { value: 'tarde', label: 'Tarde', icon: '🌤️', time: '16:00' },
    { value: 'jantar', label: 'Jantar', icon: '🌙', time: '19:00' },
  ];

  const toggleSchedule = (schedule: string) => {
    const current = data.reminderSchedule?.split(',') || [];
    const updated = current.includes(schedule)
      ? current.filter((s: string) => s !== schedule)
      : [...current, schedule];
    updateData({ reminderSchedule: updated.join(',') });
  };

  const selectedSchedules = data.reminderSchedule?.split(',').filter((s: string) => s) || [];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦝</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Quando gostaria de receber lembretes?
            </h2>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {schedules.map((schedule) => {
            const isSelected = selectedSchedules.includes(schedule.value);
            return (
              <button
                key={schedule.value}
                onClick={() => toggleSchedule(schedule.value)}
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{schedule.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{schedule.label}</div>
                  <div className="text-sm text-gray-500">{schedule.time}</div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <button onClick={onNext} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
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

export default ReminderScheduleStep;
