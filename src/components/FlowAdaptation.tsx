import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { IntegrationService } from '../services/integrationService';
import type { Activity } from '../types';

interface FlowAdaptationProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

/** Formata segundos em MM:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Estimativa de macro breakdown a partir de calorias (atividade aeróbica geral) */
function estimateMacros(calories: number) {
  return {
    carbs:   Math.round(calories * 0.55 / 4),  // 55% das kcal → g de carbo
    protein: Math.round(calories * 0.20 / 4),  // 20% das kcal → g de proteína
    fat:     Math.round(calories * 0.25 / 9),  // 25% das kcal → g de gordura
  };
}

/** Badge visual por serviço */
function ServiceBadge({ service }: { service: Activity['service'] }) {
  if (service === 'strava') {
    return (
      <div className="bg-[#fc4c02] text-white p-1.5 rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-[10px] font-bold tracking-tighter">STRAVA</span>
      </div>
    );
  }
  if (service === 'google_fit') {
    return (
      <div className="bg-white text-blue-600 p-1.5 rounded-lg flex items-center justify-center shadow-lg border border-blue-100">
        <span className="text-[10px] font-bold tracking-tighter">GOOGLE FIT</span>
      </div>
    );
  }
  return (
    <div className="bg-Malama-petrol text-white p-1.5 rounded-lg flex items-center justify-center shadow-lg">
      <span className="material-symbols-outlined text-[14px]">fitness_center</span>
    </div>
  );
}

export const FlowAdaptation: React.FC<FlowAdaptationProps> = ({ onBack, onNavigate }) => {
  const { t } = useLanguage();
  const fa = t.flowAdaptation;
  const { user } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    IntegrationService.getLatestActivity(user.id)
      .then(setActivity)
      .finally(() => setActivityLoading(false));
  }, [user?.id]);

  const macros = activity ? estimateMacros(activity.calories_burned) : null;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col mx-auto max-w-md bg-Malama-bg dark:bg-background-dark shadow-xl text-Malama-main dark:text-white font-display animate-fade-in">

      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center bg-Malama-bg/90 dark:bg-background-dark/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-Malama-border dark:border-white/10">
        <div onClick={onBack} className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{fa.title}</h2>
        <div
          onClick={() => onNavigate(AppView.INTEGRATIONS)}
          className="flex size-12 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4">

        {activityLoading ? (
          /* Skeleton de carregamento */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-Malama-petrol dark:border-primary" />
          </div>

        ) : !activity ? (
          /* Estado vazio — sem atividade nas últimas 24h */
          <section className="flex flex-col items-center justify-center py-20 px-6 gap-4 text-center animate-fade-in-up">
            <span className="material-symbols-outlined text-5xl text-Malama-muted dark:text-slate-500">directions_run</span>
            <h2 className="text-xl font-bold">Nenhuma atividade detectada</h2>
            <p className="text-Malama-muted dark:text-slate-400 text-sm leading-relaxed">
              Conecte o Strava ou Google Fit para sincronizar seus treinos automaticamente.
            </p>
            <button
              onClick={() => onNavigate(AppView.INTEGRATIONS)}
              className="mt-2 px-6 py-3 rounded-xl bg-Malama-petrol dark:bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Conectar integração
            </button>
          </section>

        ) : (
          <>
            {/* Sync Status */}
            <section className="flex flex-col gap-1 px-2 pt-2 animate-fade-in-up">
              <div className="flex items-center gap-2 text-Malama-petrol dark:text-primary mb-1">
                <span className="material-symbols-outlined filled" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>sync</span>
                <span className="text-xs font-bold uppercase tracking-wider">{fa.syncComplete}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight leading-tight">{fa.activityDetected}</h1>
            </section>

            {/* Activity Card */}
            <section className="@container animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="group flex flex-col items-stretch justify-start rounded-2xl shadow-sm border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark overflow-hidden transition-transform hover:scale-[1.01] duration-300">
                {/* Map / header placeholder */}
                <div className="relative h-48 w-full bg-gray-100 dark:bg-[#363330] overflow-hidden flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-Malama-muted/30 dark:text-white/10">map</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <ServiceBadge service={activity.service} />
                    <span className="text-white font-medium text-sm drop-shadow-md">
                      {activity.name}
                    </span>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="flex w-full flex-col gap-4 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-Malama-muted dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">{fa.workoutType}</p>
                      <p className="text-xl font-bold leading-tight">{activity.activity_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-Malama-muted dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">{fa.duration}</p>
                      <p className="text-xl font-bold leading-tight">{formatDuration(activity.duration_seconds)}</p>
                    </div>
                  </div>
                  <div className="h-px w-full bg-Malama-border dark:bg-[#363330]" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-Malama-petrol dark:text-primary" style={{ fontSize: '20px' }}>local_fire_department</span>
                      <span className="font-bold text-base">{activity.calories_burned} kcal</span>
                      <span className="text-Malama-muted text-sm">{fa.burned}</span>
                    </div>
                    {activity.distance_meters && activity.distance_meters > 0 && (
                      <span className="text-sm text-Malama-muted dark:text-slate-400 font-medium">
                        {(activity.distance_meters / 1000).toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Flow Ring */}
            <section className="flex flex-col items-center justify-center py-6 relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-Malama-petrol/10 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="w-full h-full rounded-full ring-gradient p-[12px] shadow-xl relative z-10">
                  <div className="w-full h-full bg-Malama-bg dark:bg-background-dark rounded-full flex flex-col items-center justify-center relative">
                    <div className="flex flex-col items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-Malama-petrol dark:text-primary mb-1" style={{ fontSize: '32px' }}>add_circle</span>
                      <h2 className="text-4xl font-bold tracking-tighter">+{activity.calories_burned}</h2>
                      <p className="text-Malama-muted dark:text-gray-400 font-medium text-sm uppercase tracking-widest">{fa.kcalAdded}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
                  <div className="w-4 h-4 bg-Malama-petrol dark:bg-primary rounded-full shadow-[0_0_12px_rgba(17,164,212,0.8)] border-2 border-white dark:border-background-dark" />
                </div>
              </div>
              <div className="mt-8 text-center px-4 max-w-xs">
                <p className="text-Malama-main/80 dark:text-gray-300 text-lg leading-relaxed">
                  {fa.addedMessage.split(/<bold>(.*?)<\/bold>/).map((part, i) =>
                    i % 2 === 1
                      ? <span key={i} className="font-bold text-Malama-petrol dark:text-primary">{part.replace('{kcal}', String(activity.calories_burned))}</span>
                      : <span key={i}>{part}</span>
                  )}
                </p>
              </div>
            </section>

            {/* Macro Breakdown */}
            {macros && (
              <section className="grid grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                {[
                  { label: fa.carbs,   value: `+${macros.carbs}g`,   pct: Math.min(100, macros.carbs * 2),   color: 'text-amber-600 dark:text-amber-400' },
                  { label: fa.protein, value: `+${macros.protein}g`, pct: Math.min(100, macros.protein * 3), color: 'text-Malama-petrol dark:text-primary' },
                  { label: fa.fat,     value: `+${macros.fat}g`,     pct: Math.min(100, macros.fat * 4),     color: 'text-Malama-main dark:text-white' },
                ].map((macro) => (
                  <div key={macro.label} className="flex flex-col gap-2 p-3 bg-white dark:bg-surface-dark rounded-xl border border-Malama-border dark:border-white/10 shadow-sm text-center">
                    <span className="text-xs text-Malama-muted dark:text-slate-400 font-bold uppercase">{macro.label}</span>
                    <span className={`text-xl font-bold ${macro.color}`}>{macro.value}</span>
                    <div className="w-full h-1.5 bg-Malama-border dark:bg-[#363330] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-current ${macro.color}`} style={{ width: `${macro.pct}%` }} />
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

      </main>
    </div>
  );
};
