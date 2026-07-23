import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PsychosocialService,
  WHO5_INTRO,
  WHO5_OPTIONS,
  WHO5_QUESTIONS,
  computeWho5Score,
} from '../services/psychosocialService';

interface Who5ModalProps {
  onClose: () => void;   // pular — reinsiste em 7 dias
  onComplete: () => void;
}

type Step = 'intro' | number | 'result'; // number = índice da pergunta (0–4)

export const Who5Modal: React.FC<Who5ModalProps> = ({ onClose, onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSkip = () => {
    if (user) PsychosocialService.snoozeWho5(user.id);
    onClose();
  };

  const handleAnswer = async (value: number) => {
    if (typeof step !== 'number' || submitting) return;
    const next = [...answers];
    next[step] = value;
    setAnswers(next);

    if (step < WHO5_QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    // Última pergunta — grava (score determinístico no serviço)
    if (!user) return;
    setSubmitting(true);
    try {
      const saved = await PsychosocialService.submitWho5(user.id, next);
      setScore(saved.score);
      setStep('result');
    } catch (error) {
      console.error('Erro ao enviar WHO-5:', error);
      alert('Não foi possível enviar agora. Tente novamente mais tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const resultMessage = (s: number): string => {
    if (s >= 68) return 'Seu bem-estar está em um ótimo momento. Continue cuidando de você!';
    if (s >= 50) return 'Seu bem-estar está razoável. Pequenos cuidados diários fazem diferença.';
    return 'Seu bem-estar merece atenção neste momento. Que tal conversar sobre isso na sua próxima consulta?';
  };

  const questionIndex = typeof step === 'number' ? step : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-surface-dark border-b border-Malama-border dark:border-white/10 px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-Malama-petrol/10 dark:bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[24px]">
                  self_improvement
                </span>
              </div>
              <h2 className="text-lg font-bold text-Malama-main dark:text-white">
                Como você está?
              </h2>
            </div>
            {step !== 'result' && (
              <button
                onClick={handleSkip}
                className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-Malama-muted text-[20px]">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'intro' && (
            <div className="space-y-5">
              <p className="text-sm text-Malama-main dark:text-gray-200">
                Uma vez por mês, fazemos 5 perguntas rápidas sobre como você tem
                se sentido. Leva menos de 1 minuto e ajuda a cuidar do seu
                bem-estar como um todo — corpo e mente.
              </p>
              <div className="flex items-start gap-2 rounded-2xl bg-Malama-petrol/5 dark:bg-primary/10 p-4">
                <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[20px]">
                  lock
                </span>
                <p className="text-xs text-Malama-muted dark:text-gray-400">
                  Suas respostas são confidenciais. Sua empresa nunca vê
                  respostas individuais — apenas estatísticas gerais e anônimas
                  de grupos.
                </p>
              </div>
              <button
                onClick={() => setStep(0)}
                className="w-full py-4 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold
                  shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all
                  flex items-center justify-center gap-2"
              >
                <span>Começar</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-2 text-sm text-Malama-muted dark:text-gray-400 hover:text-Malama-main dark:hover:text-gray-200 transition-colors"
              >
                Agora não
              </button>
            </div>
          )}

          {typeof step === 'number' && (
            <div className="space-y-5">
              {/* Progresso */}
              <div className="flex items-center gap-1.5">
                {WHO5_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= questionIndex
                        ? 'bg-Malama-petrol dark:bg-primary'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              <div>
                <p className="text-xs text-Malama-muted dark:text-gray-400 mb-1">
                  {WHO5_INTRO}
                </p>
                <p className="text-base font-semibold text-Malama-main dark:text-white">
                  {WHO5_QUESTIONS[questionIndex]}
                </p>
              </div>

              <div className="space-y-2">
                {WHO5_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    disabled={submitting}
                    className={`w-full py-3 px-4 rounded-2xl border-2 text-left text-sm font-medium
                      transition-all active:scale-[0.98] disabled:opacity-50
                      ${answers[questionIndex] === opt.value
                        ? 'border-Malama-petrol dark:border-primary bg-Malama-petrol/5 dark:bg-primary/10 text-Malama-main dark:text-white'
                        : 'border-Malama-border dark:border-white/10 text-Malama-main dark:text-gray-200 hover:border-Malama-petrol/50 dark:hover:border-primary/50'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {questionIndex > 0 && (
                <button
                  onClick={() => setStep(questionIndex - 1)}
                  disabled={submitting}
                  className="flex items-center gap-1 text-sm text-Malama-muted dark:text-gray-400 hover:text-Malama-main dark:hover:text-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Voltar
                </button>
              )}
            </div>
          )}

          {step === 'result' && score !== null && (
            <div className="space-y-5 text-center">
              <div className="size-20 mx-auto rounded-full bg-Malama-petrol/10 dark:bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-Malama-petrol dark:text-primary">
                  {score}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-Malama-main dark:text-white mb-1">
                  Seu índice de bem-estar (0–100)
                </p>
                <p className="text-sm text-Malama-muted dark:text-gray-400">
                  {resultMessage(score)}
                </p>
              </div>
              <button
                onClick={onComplete}
                className="w-full py-4 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold
                  shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Who5Modal;
