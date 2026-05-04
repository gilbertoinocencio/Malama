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
    carbs:   Math.round(calories * 0.55 / 4),
    protein: Math.round(calories * 0.20 / 4),
    fat:     Math.round(calories * 0.25 / 9),
  };
}

/**
 * MET (Metabolic Equivalent of Task) por tipo de atividade Strava.
 * Fórmula: kcal = MET × peso_kg × duração_horas
 * Peso padrão: 70 kg (usado quando não há dado de peso disponível)
 */
const MET_BY_TYPE: Record<string, number> = {
  Walk:           3.5,
  Hike:           5.5,
  Run:            9.0,
  VirtualRun:     8.0,
  Ride:           6.0,
  VirtualRide:    5.5,
  MountainBikeRide: 8.5,
  Swim:           6.0,
  WeightTraining: 4.5,
  Workout:        4.5,
  Yoga:           2.5,
  Crossfit:       7.0,
  Rowing:         7.0,
  Soccer:         7.0,
  Tennis:         6.0,
  Skateboard:     5.0,
};

function estimateCaloriesFromActivity(activity: Activity, weightKg = 70): number {
  const met = MET_BY_TYPE[activity.activity_type] ?? 4.0;
  const hours = activity.duration_seconds / 3600;
  return Math.round(met * weightKg * hours);
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

function getLocalDateString(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const FlowAdaptation: React.FC<FlowAdaptationProps> = ({ onBack, onNavigate }) => {
  const { t, language } = useLanguage();
  const fa = t.flowAdaptation;
  const { user } = useAuth();

  const [dayActivities, setDayActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'done'>('syncing');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthActivities, setMonthActivities] = useState<Activity[]>([]);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  const fetchMonthActivities = async (date: Date) => {
    if (!user) return;
    const acts = await IntegrationService.getActivitiesByMonth(user.id, date.getFullYear(), date.getMonth());
    setMonthActivities(acts);
    const selectedDateStr = getLocalDateString(selectedDate);
    setDayActivities(acts.filter((a: Activity) => a.activity_date.startsWith(selectedDateStr)));
  };

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setSyncStatus('syncing');
      try { await IntegrationService.syncActivities(); } catch { /* silencioso */ }
      setSyncStatus('done');

      await fetchMonthActivities(currentMonth);
      setActivityLoading(false);
    };

    load();
  }, [user?.id, currentMonth.getFullYear(), currentMonth.getMonth()]);

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    const dateStr = getLocalDateString(newDate);
    setDayActivities(monthActivities.filter((a: Activity) => a.activity_date.startsWith(dateStr)));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthName = currentMonth.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' });

  const totalCells = [...blanksArray.map(() => null), ...daysArray];
  const weeks = [];
  for (let i = 0; i < totalCells.length; i += 7) {
    weeks.push(totalCells.slice(i, i + 7));
  }
  
  const targetDay = (selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear()) 
    ? selectedDate.getDate() 
    : 1;

  const currentWeekIndex = weeks.findIndex(week => week.includes(targetDay));
  const safeWeekIndex = currentWeekIndex !== -1 ? currentWeekIndex : 0;
  const visibleWeeks = isCalendarExpanded ? weeks : [weeks[safeWeekIndex]];

  // Soma as calorias de todas as atividades do dia; estima por MET quando Strava não fornece
  const effectiveCalories = dayActivities.reduce((sum: number, a: Activity) => {
    return sum + (a.calories_burned > 0 ? a.calories_burned : estimateCaloriesFromActivity(a));
  }, 0);
  const macros = dayActivities.length > 0 ? estimateMacros(effectiveCalories) : null;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col mx-auto max-w-md bg-Malama-bg dark:bg-background-dark shadow-xl text-Malama-main dark:text-white font-display animate-fade-in">

      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center bg-Malama-bg/90 dark:bg-background-dark/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-Malama-border dark:border-white/10">
        <div onClick={onBack} className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{fa.title}</h2>
        <div className="w-12 h-12" />
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4">

        {/* Calendar Section */}
        <section className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-Malama-border dark:border-white/10 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-Malama-bg dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h3 className="font-bold text-lg capitalize">{monthName}</h3>
            <button onClick={handleNextMonth} className="p-2 hover:bg-Malama-bg dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} className="text-xs font-bold text-Malama-muted dark:text-slate-400">{d}</span>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center transition-all duration-300">
            {visibleWeeks.map((week, weekIdx) => (
              <React.Fragment key={weekIdx}>
                {week.map((day, dayIdx) => {
                  if (day === null) return <div key={`blank-${weekIdx}-${dayIdx}`} className="h-8" />;
                  
                  const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const dateStr = getLocalDateString(dateObj);
                  const hasActivity = monthActivities.some(a => a.activity_date.startsWith(dateStr));
                  const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                  
                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-sm font-medium transition-colors relative
                        ${isSelected ? 'bg-Malama-petrol dark:bg-primary text-white shadow-md' : 'hover:bg-Malama-bg dark:hover:bg-white/10'}
                      `}
                    >
                      <span className="leading-none">{day}</span>
                      {hasActivity && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-Malama-petrol dark:bg-primary" />
                      )}
                      {hasActivity && isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex justify-center mt-2">
            <button
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="flex items-center justify-center p-1 rounded-full text-Malama-muted dark:text-slate-400 hover:bg-Malama-bg dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {isCalendarExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </section>

        {activityLoading ? (
          /* Skeleton de carregamento */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-Malama-petrol dark:border-primary" />
            <p className="text-sm text-Malama-muted dark:text-slate-400 animate-pulse">
              {syncStatus === 'syncing' ? 'Buscando atividades...' : 'Carregando...'}
            </p>
          </div>

        ) : dayActivities.length === 0 ? (
          /* Estado vazio */
          <section className="flex flex-col items-center justify-center py-12 px-6 gap-2 text-center animate-fade-in-up bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-Malama-border dark:border-white/10">
            <span className="material-symbols-outlined text-4xl text-Malama-muted dark:text-slate-500 mb-2">directions_run</span>
            <h2 className="text-lg font-bold text-Malama-main dark:text-white">Nenhuma atividade detectada</h2>
            <p className="text-Malama-muted dark:text-slate-400 text-sm leading-relaxed">
              Você não possui atividades registradas para este dia.
            </p>
          </section>
        ) : (
          <>
            {/* Sync Status */}
            <section className="flex flex-col gap-1 px-2 pt-2 animate-fade-in-up">
              <div className="flex items-center gap-2 text-Malama-petrol dark:text-primary mb-1">
                <span className="material-symbols-outlined filled" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>sync</span>
                <span className="text-xs font-bold uppercase tracking-wider">{fa.syncComplete}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight leading-tight">
                {dayActivities.length > 1
                  ? `${dayActivities.length} atividades detectadas`
                  : fa.activityDetected}
              </h1>
            </section>

            {/* Activity Cards — uma por atividade do dia */}
            {dayActivities.map((act: Activity, idx: number) => {
              const actKcal = act.calories_burned > 0 ? act.calories_burned : estimateCaloriesFromActivity(act);
              const actEstimated = act.calories_burned === 0;
              return (
                <section key={act.id ?? idx} className="@container animate-fade-in-up" style={{ animationDelay: `${0.1 + idx * 0.05}s` }}>
                  <div className="group flex flex-col items-stretch justify-start rounded-2xl shadow-sm border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark overflow-hidden transition-transform hover:scale-[1.01] duration-300">
                    {/* Header */}
                    <div className="relative h-36 w-full bg-gray-100 dark:bg-[#363330] overflow-hidden flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-Malama-muted/30 dark:text-white/10">map</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <ServiceBadge service={act.service} />
                        <span className="text-white font-medium text-sm drop-shadow-md">{act.name}</span>
                      </div>
                      {dayActivities.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {idx + 1}/{dayActivities.length}
                        </div>
                      )}
                    </div>

                    {/* Detalhes */}
                    <div className="flex w-full flex-col gap-4 p-5">
                      <div className="flex items-center gap-1.5 text-Malama-muted dark:text-slate-400">
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>calendar_today</span>
                        <span className="text-xs font-medium">
                          {new Date(act.activity_date).toLocaleDateString('pt-BR', {
                            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                          })}
                          {' · '}
                          {new Date(act.activity_date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-Malama-muted dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">{fa.workoutType}</p>
                          <p className="text-xl font-bold leading-tight">{act.activity_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-Malama-muted dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">{fa.duration}</p>
                          <p className="text-xl font-bold leading-tight">{formatDuration(act.duration_seconds)}</p>
                        </div>
                      </div>
                      <div className="h-px w-full bg-Malama-border dark:bg-[#363330]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-Malama-petrol dark:text-primary" style={{ fontSize: '20px' }}>local_fire_department</span>
                          <span className="font-bold text-base">{actKcal} kcal</span>
                          <span className="text-Malama-muted text-sm">{fa.burned}</span>
                          {actEstimated && (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                              estimado
                            </span>
                          )}
                        </div>
                        {act.distance_meters && act.distance_meters > 0 && (
                          <span className="text-sm text-Malama-muted dark:text-slate-400 font-medium">
                            {(act.distance_meters / 1000).toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Flow Ring */}
            <section className="flex flex-col items-center justify-center py-6 relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-Malama-petrol/10 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="w-full h-full rounded-full ring-gradient p-[12px] shadow-xl relative z-10">
                  <div className="w-full h-full bg-Malama-bg dark:bg-background-dark rounded-full flex flex-col items-center justify-center relative">
                    <div className="flex flex-col items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-Malama-petrol dark:text-primary mb-1" style={{ fontSize: '32px' }}>add_circle</span>
                      <h2 className="text-4xl font-bold tracking-tighter">+{effectiveCalories}</h2>
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
                      ? <span key={i} className="font-bold text-Malama-petrol dark:text-primary">{part.replace('{kcal}', String(effectiveCalories))}</span>
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
