import React, { useState } from 'react';
import { CoachService } from '../services/coachService';
import { useAuth } from '../contexts/AuthContext';

interface DailyCheckinModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({
  onClose,
  onComplete,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'metrics' | 'feedback' | 'coach_response'>('metrics');
  const [submitting, setSubmitting] = useState(false);

  // Metrics
  const [energyLevel, setEnergyLevel] = useState(5);
  const [hungerLevel, setHungerLevel] = useState(5);
  const [mood, setMood] = useState(5);
  const [motivation, setMotivation] = useState(5);
  const [sleepHours, setSleepHours] = useState<number | ''>('');
  const [sleepQuality, setSleepQuality] = useState(5);
  const [notes, setNotes] = useState('');

  // Coach response
  const [coachFeedback, setCoachFeedback] = useState('');

  const handleSubmitMetrics = () => {
    setStep('feedback');
  };

  const handleSubmitCheckin = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const checkin = await CoachService.submitCheckin(user.id, {
        energy_level: energyLevel,
        hunger_level: hungerLevel,
        mood,
        motivation,
        sleep_hours: sleepHours ? Number(sleepHours) : undefined,
        sleep_quality: sleepQuality,
        notes: notes || undefined,
      });

      setCoachFeedback(checkin.coach_feedback || '');
      setStep('coach_response');
    } catch (error) {
      console.error('Error submitting checkin:', error);
      alert('Erro ao enviar check-in. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-surface-dark border-b border-Malama-border dark:border-gray-700 px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-Malama-petrol/10 dark:bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[24px]">
                  psychology
                </span>
              </div>
              <h2 className="text-lg font-bold text-Malama-main dark:text-white">
                Check-in Diário
              </h2>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-Malama-muted text-[20px]">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Metrics */}
          {step === 'metrics' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm text-Malama-muted dark:text-gray-400">
                  Como você está se sentindo hoje?
                </p>
              </div>

              <MetricSlider
                label="Nível de Energia"
                icon="bolt"
                value={energyLevel}
                onChange={setEnergyLevel}
                lowLabel="Baixo"
                highLabel="Alto"
              />

              <MetricSlider
                label="Nível de Fome"
                icon="restaurant"
                value={hungerLevel}
                onChange={setHungerLevel}
                lowLabel="Sem fome"
                highLabel="Muita fome"
              />

              <MetricSlider
                label="Humor"
                icon="sentiment_satisfied"
                value={mood}
                onChange={setMood}
                lowLabel="Triste"
                highLabel="Feliz"
              />

              <MetricSlider
                label="Motivação"
                icon="local_fire_department"
                value={motivation}
                onChange={setMotivation}
                lowLabel="Baixa"
                highLabel="Alta"
              />

              <button
                onClick={handleSubmitMetrics}
                className="w-full py-4 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold
                  shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all
                  flex items-center justify-center gap-2"
              >
                <span>Continuar</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Step 2: Feedback */}
          {step === 'feedback' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm text-Malama-muted dark:text-gray-400">
                  Informações adicionais (opcional)
                </p>
              </div>

              {/* Sleep */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-Malama-main dark:text-white">
                  Quantas horas você dormiu?
                </label>
                <input
                  type="number"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value ? Number(e.target.value) : '')}
                  placeholder="8"
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-Malama-border dark:border-gray-700
                    bg-white dark:bg-background-dark text-Malama-main dark:text-white
                    placeholder-Malama-muted dark:placeholder-gray-500
                    focus:outline-none focus:border-Malama-petrol dark:focus:border-primary
                    transition-colors"
                />
              </div>

              {sleepHours && (
                <MetricSlider
                  label="Qualidade do Sono"
                  icon="bedtime"
                  value={sleepQuality}
                  onChange={setSleepQuality}
                  lowLabel="Ruim"
                  highLabel="Ótima"
                />
              )}

              {/* Notes */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-Malama-main dark:text-white">
                  Algo mais que você queira compartilhar?
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Senti dor de cabeça hoje, tive um dia estressante..."
                  rows={4}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-Malama-border dark:border-gray-700
                    bg-white dark:bg-background-dark text-Malama-main dark:text-white
                    placeholder-Malama-muted dark:placeholder-gray-500
                    focus:outline-none focus:border-Malama-petrol dark:focus:border-primary
                    transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('metrics')}
                  className="flex-1 py-4 rounded-2xl border-2 border-Malama-border dark:border-gray-700
                    text-Malama-main dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800
                    transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  <span>Voltar</span>
                </button>
                <button
                  onClick={handleSubmitCheckin}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold
                    shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span>Finalizar</span>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Coach Response */}
          {step === 'coach_response' && (
            <div className="space-y-6 text-center">
              <div className="size-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[48px]">
                  check_circle
                </span>
              </div>

              <h3 className="text-xl font-bold text-Malama-main dark:text-white">
                Check-in completo!
              </h3>

              <div className="bg-Malama-pastel-orange/20 dark:bg-primary/10 border border-Malama-petrol/30 dark:border-primary/30 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[24px]">
                    psychology
                  </span>
                  <p className="text-sm font-semibold text-Malama-main dark:text-white text-left">
                    Feedback do seu Coach:
                  </p>
                </div>
                <p className="text-sm text-Malama-muted dark:text-gray-300 text-left leading-relaxed">
                  {coachFeedback}
                </p>
              </div>

              <div className="flex items-center gap-2 justify-center bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded-full inline-flex mx-auto">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-[20px]">
                  stars
                </span>
                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                  +15 XP ganhos!
                </span>
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-4 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold
                  shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Voltar para Início
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// MetricSlider Component
interface MetricSliderProps {
  label: string;
  icon: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
}

const MetricSlider: React.FC<MetricSliderProps> = ({
  label,
  icon,
  value,
  onChange,
  lowLabel,
  highLabel,
}) => {
  const percentage = ((value - 1) / 9) * 100;

  return (
    <div className="space-y-3 bg-white dark:bg-background-dark border border-Malama-border dark:border-gray-700 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[20px]">
            {icon}
          </span>
          <span className="text-sm font-semibold text-Malama-main dark:text-white">
            {label}
          </span>
        </div>
        <span className="text-lg font-bold text-Malama-petrol dark:text-primary">
          {value}
        </span>
      </div>

      <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right,
            rgb(var(--color-Malama-petrol) / 1) 0%,
            rgb(var(--color-Malama-petrol) / 1) ${percentage}%,
            rgb(229 231 235 / 1) ${percentage}%,
            rgb(229 231 235 / 1) 100%)`,
        }}
      />

      <div className="flex items-center justify-between text-xs text-Malama-muted dark:text-gray-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
};

export default DailyCheckinModal;
