import React from 'react';

interface StepLayoutProps {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  progress?: number;
}

export const StepLayout: React.FC<StepLayoutProps> = ({
  title,
  subtitle,
  icon,
  children,
  onNext,
  onBack,
  nextLabel = 'Continuar',
  nextDisabled = false,
  showSkip = false,
  onSkip,
  progress,
}) => {
  return (
    <div className="flex flex-col h-full min-h-screen bg-nura-bg dark:bg-background-dark">
      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-lg border-b border-nura-border dark:border-gray-800">
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-nura-petrol dark:bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-lg border-b border-nura-border dark:border-gray-800 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center size-9 rounded-full hover:bg-nura-pastel-orange dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          ) : (
            <div className="size-9" />
          )}

          {progress !== undefined && (
            <span className="text-xs font-semibold text-nura-muted dark:text-gray-500">
              {Math.round(progress)}%
            </span>
          )}

          {showSkip && onSkip ? (
            <button
              onClick={onSkip}
              className="text-sm font-medium text-nura-muted dark:text-gray-500 hover:text-nura-petrol dark:hover:text-primary transition-colors"
            >
              Pular
            </button>
          ) : (
            <div className="size-9" />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Icon & Title */}
          <div className="text-center space-y-3">
            {icon && (
              <div className="flex justify-center">
                <div className="size-16 rounded-3xl bg-nura-petrol/10 dark:bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-nura-petrol dark:text-primary">
                    {icon}
                  </span>
                </div>
              </div>
            )}
            <h1 className="text-2xl font-bold text-nura-main dark:text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-nura-muted dark:text-gray-400 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Step Content */}
          <div className="space-y-4">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-lg border-t border-nura-border dark:border-gray-800 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="w-full py-4 rounded-2xl bg-nura-petrol dark:bg-primary text-white font-bold text-base
              shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-lg
              flex items-center justify-center gap-2"
          >
            <span>{nextLabel}</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default StepLayout;
