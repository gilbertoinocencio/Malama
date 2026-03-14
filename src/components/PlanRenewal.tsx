import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { GamificationService, GamificationStats } from '../services/gamificationService';
import { generatePlanContent } from '../services/geminiService';
import { supabase } from '../services/supabase';

interface PlanRenewalProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const PlanRenewal: React.FC<PlanRenewalProps> = ({ onBack, onNavigate }) => {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const pr = t.planRenewal;
  const [selectedGoal, setSelectedGoal] = useState<string>(profile?.goal || 'aesthetic');
  const [gameStats, setGameStats] = useState<GamificationStats | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      GamificationService.updateStats(user.id).then((result) => {
        if (result) {
          setGameStats(result.stats);
        }
      });
    }
  }, [user]);

  const consistency = gameStats ? Math.min(Math.round((gameStats.totalFlowDays / Math.max(gameStats.totalFlowDays + 5, 1)) * 100), 99) : 0;
  const weeksCompleted = gameStats ? Math.floor(gameStats.totalFlowDays / 7) : 0;

  const goals = [
    { id: 'aesthetic', label: pr.aesthetic, desc: pr.aestheticDesc, icon: 'spa' },
    { id: 'health', label: pr.health, desc: pr.healthDesc, icon: 'favorite' },
    { id: 'performance', label: pr.performance, desc: pr.performanceDesc, icon: 'bolt' },
  ];

  const handleGeneratePlan = async () => {
    if (!profile) return;
    setIsGenerating(true);
    try {
      // 1. Generate Plan with Gemini
      const plan = await generatePlanContent({
        ...profile,
        goal: selectedGoal
      }, language);

      // 2. Save Plan (For now, we just update the profile targets, in future we save the whole JSON plan)
      if (plan && user) {
        await supabase.from('profiles').update({
          goal: selectedGoal,
          target_calories: plan.calories,
          target_protein: plan.macros.protein,
          target_carbs: plan.macros.carbs,
          target_fats: plan.macros.fats
        }).eq('id', user.id);

        // Save full plan to local storage for the 'Plan' view to consume for now
        localStorage.setItem('current_quarterly_plan', JSON.stringify(plan));
      }

      // 3. Navigate
      onNavigate(AppView.HOME); // Or PLAN view
    } catch (error) {
      console.error("Plan Generation Failed", error);
      alert(t.general.error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden shadow-2xl bg-nura-bg dark:bg-background-dark font-display antialiased transition-colors duration-300 text-nura-main dark:text-white animate-fade-in">

      {/* Header */}
      <header className="flex items-center justify-between p-6 pt-8 pb-2 sticky top-0 z-30 bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-sm">
        <button onClick={onBack} disabled={isGenerating} className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors group">
          <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-nura-muted dark:text-gray-400">{pr.header}</span>
        </div>
        <button className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">

        {/* Hero */}
        <section className="px-6 pt-6 pb-4 text-center animate-fade-in-up">
          <h1 className="text-[34px] font-light leading-[1.15] tracking-tight mb-3">
            {pr.heroTitle} <br /> <span className="font-bold text-nura-petrol dark:text-primary">{pr.heroAccent}</span>
          </h1>
          <p className="text-nura-muted dark:text-gray-400 text-base font-normal leading-relaxed max-w-[280px] mx-auto">{pr.heroSubtitle}</p>
        </section>

        {/* Consistency Card — real data */}
        <section className="px-6 py-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="bg-white dark:bg-[#1a2630] rounded-2xl p-6 shadow-sm border border-nura-border dark:border-gray-800 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-nura-petrol/5 dark:bg-primary/20 rounded-full blur-2xl"></div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-nura-muted dark:text-gray-400 text-sm font-medium tracking-wide uppercase">{pr.consistency}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-nura-petrol dark:text-primary text-4xl font-light tracking-tighter">{consistency}%</span>
                  {gameStats && gameStats.currentStreak > 0 && (
                    <span className="inline-flex items-center text-nura-main dark:text-gray-300 text-sm font-bold bg-nura-petrol/10 dark:bg-primary/10 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[14px] mr-0.5">local_fire_department</span>{gameStats.currentStreak}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 relative flex items-center justify-center">
                <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="text-nura-border dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  <path className="text-nura-petrol dark:text-primary" strokeDasharray={`${consistency}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
                </svg>
              </div>
            </div>
            <div className="h-px w-full bg-nura-border dark:bg-gray-800"></div>
            <div className="flex justify-between items-center text-sm relative z-10">
              <span className="font-medium">{weeksCompleted} {pr.weeksCompleted}</span>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-nura-petrol dark:bg-primary flex items-center justify-center border-2 border-white dark:border-[#1a2630] text-white shadow-sm z-20">
                  <span className="material-symbols-outlined text-[12px]">star</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-nura-border dark:bg-gray-600 border-2 border-white dark:border-[#1a2630] z-10"></div>
                <div className="w-6 h-6 rounded-full bg-nura-border dark:bg-gray-600 border-2 border-white dark:border-[#1a2630] z-0"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Goal */}
        <section className="px-6 pt-6 pb-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-bold leading-tight tracking-tight">{pr.nextChapter}</h3>
        </section>

        <section className="px-6 space-y-3 pb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {goals.map((g) => (
            <label key={g.id} className="group cursor-pointer block">
              <input className="peer sr-only" name="goal" type="radio" value={g.id} checked={selectedGoal === g.id} onChange={() => setSelectedGoal(g.id)} />
              <div className="relative flex items-center p-4 rounded-xl border border-nura-border dark:border-gray-700 bg-white dark:bg-[#1a2630] transition-all duration-300 hover:border-nura-petrol/30 peer-checked:border-nura-petrol dark:peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-nura-petrol dark:peer-checked:ring-primary peer-checked:bg-nura-petrol/5 dark:peer-checked:bg-primary/10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-nura-petrol/10 dark:bg-primary/10 text-nura-petrol dark:text-primary transition-colors">
                  <span className="material-symbols-outlined">{g.icon}</span>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-base font-bold leading-snug">{g.label}</p>
                  <p className="text-nura-muted dark:text-gray-400 text-sm font-normal">{g.desc}</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedGoal === g.id ? 'border-nura-petrol dark:border-primary bg-nura-petrol dark:bg-primary' : 'border-nura-border dark:border-gray-600'}`}>
                  {selectedGoal === g.id && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                </div>
              </div>
            </label>
          ))}
        </section>
      </main>

      {/* Bottom Action */}
      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-nura-bg via-nura-bg/95 to-transparent dark:from-background-dark dark:via-background-dark/95 pt-12">
        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="w-full bg-nura-petrol dark:bg-primary hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium text-lg py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {t.quarterlyPlan.generating}
            </>
          ) : (
            <>
              {pr.generatePlan}
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};