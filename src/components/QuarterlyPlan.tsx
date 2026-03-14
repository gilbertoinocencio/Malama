import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { PlanService, QuarterlyPlanData } from '../services/planService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';

interface QuarterlyPlanProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const QuarterlyPlan: React.FC<QuarterlyPlanProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [plan, setPlan] = useState<QuarterlyPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (user) loadPlan();
  }, [user]);

  const loadPlan = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const activePlan = await PlanService.getActivePlan(user.id);
      setPlan(activePlan);
      if (activePlan) setActivated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const newPlan = await PlanService.generatePlan(user.id);
      setPlan(newPlan);
      setActivated(true);
    } catch (e) {
      console.error(e);
      alert(t.general.error);
    } finally {
      setGenerating(false);
    }
  };

  const handleActivate = () => {
    setActivated(true);
    onNavigate(AppView.PLAN_SHARE);
  };

  const qp = t.quarterlyPlan;

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-nura-bg dark:bg-background-dark">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nura-petrol dark:border-primary"></div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-nura-bg dark:bg-background-dark text-nura-main dark:text-white font-display animate-fade-in transition-colors duration-300">

      {/* Header */}
      <header className="flex items-center justify-between p-6 pt-8 z-20">
        <button
          onClick={onBack}
          className="flex items-center justify-center size-10 rounded-full hover:bg-nura-pastel-orange dark:hover:bg-white/5 transition-colors text-nura-petrol dark:text-slate-300"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-[0.2em] text-nura-petrol dark:text-primary uppercase mb-0.5">{qp.feedTheFlow}</span>
          <h1 className="text-nura-main dark:text-white text-lg font-bold leading-tight">{qp.title}</h1>
        </div>
        <button
          onClick={() => onNavigate(AppView.PLAN_SHARE)}
          className="flex items-center justify-center size-10 rounded-full hover:bg-nura-pastel-orange dark:hover:bg-white/5 transition-colors text-nura-petrol dark:text-slate-300"
        >
          <span className="material-symbols-outlined text-[24px]">ios_share</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pb-32">

        {!plan ? (
          /* ═══ Empty State — Generate ═══ */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-nura-petrol/10 dark:bg-primary/10 p-6 rounded-full mb-6">
              <span className="material-symbols-outlined text-4xl text-nura-petrol dark:text-primary">auto_awesome</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{qp.yourPlan}</h2>
            <p className="text-nura-muted dark:text-slate-500 mb-8 max-w-xs">
              {qp.planDescription}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-nura-petrol dark:bg-primary text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-nura-petrol/30 dark:shadow-primary/30 active:scale-95 transition-all flex items-center gap-2"
            >
              {generating ? (
                <>
                  <span className="animate-spin material-symbols-outlined">sync</span>
                  {qp.generating}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">bolt</span>
                  {qp.generateNow}
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Active Badge */}
            {activated && (
              <div className="mb-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 animate-fade-in">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[16px]">check_circle</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">{qp.planActive}</span>
              </div>
            )}

            {/* Hero Stats */}
            <div className="w-full flex flex-col items-center justify-center py-6 animate-fade-in-up">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nura-petrol/10 dark:bg-primary/10 border border-nura-petrol/20 dark:border-primary/20 text-nura-petrol dark:text-primary mb-4">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                <span className="text-xs font-bold uppercase tracking-wide">{plan.optimization_tag}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <h2 className="text-7xl font-extrabold tracking-tighter text-nura-main dark:text-white leading-none">
                  {plan.calories}
                </h2>
                <span className="text-sm font-semibold text-nura-muted dark:text-slate-500 uppercase tracking-widest mt-2">{qp.dailyKcal}</span>
              </div>
            </div>

            {/* Macro Cards */}
            <div className="grid grid-cols-3 gap-4 w-full mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm border border-nura-border dark:border-transparent">
                <span className="text-[10px] font-bold text-nura-muted dark:text-slate-500 uppercase tracking-wider">{qp.protein}</span>
                <span className="text-2xl font-bold text-nura-main dark:text-white">{plan.macros.protein}g</span>
                <div className="h-1 w-8 bg-nura-petrol dark:bg-primary rounded-full mt-1"></div>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm border border-nura-border dark:border-transparent">
                <span className="text-[10px] font-bold text-nura-muted dark:text-slate-500 uppercase tracking-wider">{qp.carbs}</span>
                <span className="text-2xl font-bold text-nura-main dark:text-white">{plan.macros.carbs}g</span>
                <div className="h-1 w-8 bg-orange-400 rounded-full mt-1"></div>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm border border-nura-border dark:border-transparent">
                <span className="text-[10px] font-bold text-nura-muted dark:text-slate-500 uppercase tracking-wider">{qp.fats}</span>
                <span className="text-2xl font-bold text-nura-main dark:text-white">{plan.macros.fats}g</span>
                <div className="h-1 w-8 bg-teal-400 rounded-full mt-1"></div>
              </div>
            </div>

            {/* Timeline */}
            <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-lg font-bold text-nura-main dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-nura-petrol dark:text-primary">calendar_month</span>
                {qp.journey3Months}
              </h3>
              <div className="flex flex-col space-y-0">

                {plan.phases.map((phase, idx) => {
                  const isMainPhase = idx === 1;
                  return (
                    <div key={idx} className="timeline-item flex gap-4 pb-8">
                      <div className="flex-shrink-0 z-10">
                        {isMainPhase ? (
                          <div className="size-12 rounded-full bg-nura-petrol dark:bg-primary text-white flex items-center justify-center shadow-lg shadow-nura-petrol/30 dark:shadow-primary/30">
                            <span className="material-symbols-outlined text-[20px]">bolt</span>
                          </div>
                        ) : (
                          <div className="size-12 rounded-full bg-white dark:bg-surface-dark border-2 border-nura-border dark:border-slate-700 flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-nura-main dark:text-white">0{idx + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className={`flex-1 bg-white dark:bg-surface-dark p-5 rounded-2xl shadow-sm border ${isMainPhase ? 'border-nura-petrol/20 dark:border-primary/20 ring-1 ring-nura-petrol/20 dark:ring-primary/20 relative overflow-hidden' : 'border-nura-border dark:border-transparent'}`}>
                        {isMainPhase && <div className="absolute -right-4 -top-4 size-20 bg-nura-petrol/5 dark:bg-primary/5 rounded-full blur-xl"></div>}
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <h4 className={`font-bold ${isMainPhase ? 'text-nura-petrol dark:text-primary' : 'text-nura-main dark:text-white'}`}>{phase.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${isMainPhase ? 'bg-nura-petrol/10 dark:bg-primary/10 text-nura-petrol dark:text-primary' : 'bg-nura-pastel-orange dark:bg-slate-700/50 text-nura-muted dark:text-slate-500'}`}>{phase.tag}</span>
                        </div>
                        <p className="text-xs text-nura-muted dark:text-slate-400 leading-relaxed relative z-10">
                          {phase.description}
                        </p>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </>
        )}
      </main>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-background-dark/90 backdrop-blur-xl border-t border-nura-border dark:border-white/5 p-6 z-20">
        <div className="max-w-md mx-auto">
          {plan && activated ? (
            <button
              onClick={() => onNavigate(AppView.PLAN_SHARE)}
              className="w-full bg-nura-petrol dark:bg-primary hover:brightness-110 text-white font-bold h-14 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-nura-petrol/25 dark:shadow-primary/25 transition-all transform active:scale-[0.98] group"
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span className="text-base">{qp.viewProgress}</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={plan ? handleActivate : handleGenerate}
              disabled={generating}
              className="w-full bg-nura-petrol dark:bg-primary hover:brightness-110 text-white font-bold h-14 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-nura-petrol/25 dark:shadow-primary/25 transition-all transform active:scale-[0.98] group"
            >
              <span className="text-base">{plan ? qp.activatePlan : qp.startNow}</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};