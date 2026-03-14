import React, { useState } from 'react';
import { AppView } from '../types';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

interface RefinePlanProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const RefinePlan: React.FC<RefinePlanProps> = ({ onBack, onNavigate }) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const rp = t.refinePlan;

  const goalMap: Record<string, 'maintain' | 'define' | 'gain'> = {
    aesthetic: 'define', health: 'maintain', performance: 'gain',
  };
  const [goal, setGoal] = useState<'maintain' | 'define' | 'gain'>(goalMap[profile?.goal] || 'define');
  const [frequency, setFrequency] = useState(profile?.activity_level === 'intense' ? 6 : profile?.activity_level === 'sedentary' ? 3 : 5);

  const targetCal = profile?.target_calories || 2450;
  const targetProt = profile?.target_protein || 180;
  const targetCarbs = profile?.target_carbs || 220;
  const targetFats = profile?.target_fats || 65;

  const goalOptions: { key: 'maintain' | 'define' | 'gain'; label: string }[] = [
    { key: 'maintain', label: rp.maintain },
    { key: 'define', label: rp.define },
    { key: 'gain', label: rp.gain },
  ];

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-nura-bg dark:bg-background-dark font-display transition-colors duration-200 text-nura-main dark:text-white animate-fade-in">

      {/* Header */}
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between sticky top-0 z-20 transition-colors duration-200 backdrop-blur-sm">
        <div onClick={onBack} className="text-nura-petrol dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer transition-opacity hover:opacity-70">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <h2 className="text-nura-petrol dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">{rp.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">

        {/* Intro */}
        <div className="px-5 pt-6 pb-2 animate-fade-in-up">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{rp.adjustFlow}</h1>
          <p className="text-nura-muted dark:text-gray-400 text-sm font-normal leading-relaxed pt-2">{rp.aiAnalysis}</p>
        </div>

        {/* Goal Selector */}
        <div className="px-5 mt-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500 mb-3 text-[11px]">{rp.currentGoal}</h3>
          <div className="flex p-1 bg-white dark:bg-[#1a2630] rounded-xl border border-nura-border dark:border-gray-800 shadow-sm">
            {goalOptions.map((option) => {
              const isSelected = goal === option.key;
              return (
                <label key={option.key} className="flex-1 cursor-pointer">
                  <input className="peer sr-only" name="goal" type="radio" checked={isSelected} onChange={() => setGoal(option.key)} />
                  <div className={`flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-nura-petrol dark:bg-primary text-white shadow-md' : 'text-nura-muted dark:text-gray-400'}`}>
                    {option.label}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Workout Routine */}
        <div className="px-5 mt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500 mb-4 text-[11px]">{rp.workoutRoutine}</h3>
          <div className="bg-white dark:bg-[#1a2630] p-5 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-nura-petrol dark:text-primary">fitness_center</span>
                <span className="font-medium">{rp.weeklyFrequency}</span>
              </div>
              <span className="text-nura-petrol dark:text-primary font-bold text-lg">{frequency}x</span>
            </div>
            <div className="relative w-full h-6 flex items-center">
              <input className="w-full z-10 accent-nura-petrol dark:accent-primary" max="7" min="1" type="range" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} />
              <div className="absolute top-1/2 left-0 w-full h-1 bg-nura-border dark:bg-gray-700 -translate-y-1/2 rounded-full"></div>
              <div className="absolute top-1/2 left-0 h-1 bg-nura-petrol dark:bg-primary -translate-y-1/2 rounded-full pointer-events-none" style={{ width: `${((frequency - 1) / 6) * 100}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-nura-muted mt-2 font-medium"><span>1x</span><span>7x</span></div>
          </div>

          <div className="mt-3 flex items-center justify-between bg-white dark:bg-[#1a2630] p-4 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e3038] transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-nura-petrol/10 dark:bg-primary/10 flex items-center justify-center text-nura-petrol dark:text-primary">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{rp.preferredTime}</span>
                <span className="text-xs text-nura-muted dark:text-gray-500">{rp.preferredTimeDesc}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              07:00 AM
              <span className="material-symbols-outlined text-nura-muted text-sm">edit</span>
            </div>
          </div>
        </div>

        {/* Biometrics — real data from profile */}
        <div className="px-5 mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500 mb-4 text-[11px]">{rp.updateBiotype}</h3>
          <div className="flex gap-4">
            <div className="flex-1 bg-white dark:bg-[#1a2630] p-4 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 flex flex-col justify-between">
              <span className="text-xs font-medium text-nura-muted dark:text-gray-400 mb-1">{rp.currentWeight}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{profile?.weight || '—'}</span>
                <span className="text-sm text-nura-muted">kg</span>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-[#1a2630] p-4 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-4 -top-4 size-16 bg-nura-petrol/10 dark:bg-primary/10 rounded-full blur-xl"></div>
              <span className="text-xs font-medium text-nura-muted dark:text-gray-400 mb-1">{rp.bodyFat}</span>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-2xl font-bold">{profile?.body_fat || '—'}</span>
                <span className="text-sm text-nura-muted">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Preview — real target macros */}
        <div className="px-5 mt-8 mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="bg-white dark:bg-[#1a2630] rounded-[2rem] p-6 shadow-lg border border-nura-border dark:border-gray-800 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-nura-petrol/5 dark:from-primary/5 to-transparent opacity-50 dark:opacity-20 pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-lg font-bold">{rp.planPreview}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-nura-petrol/10 dark:bg-primary/10 px-2 py-1 text-xs font-bold text-nura-petrol dark:text-primary tracking-wide">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                {rp.aiOptimized}
              </span>
            </div>

            <div className="text-center mb-8 relative z-10">
              <span className="block text-[10px] text-nura-muted uppercase font-bold tracking-widest mb-1">{rp.dailyGoal}</span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[3.5rem] leading-none font-black tracking-tight">{targetCal.toLocaleString()}</span>
                <div className="flex flex-col items-start justify-center h-full pt-3">
                  <span className="text-[10px] font-bold text-nura-muted">KCAL</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 relative z-10">
              {[
                { label: rp.protein, value: `${targetProt}g`, pct: Math.round((targetProt * 4 / targetCal) * 100), color: 'text-nura-petrol dark:text-primary', icon: 'egg_alt' },
                { label: rp.carbs, value: `${targetCarbs}g`, pct: Math.round((targetCarbs * 4 / targetCal) * 100), color: 'text-amber-600 dark:text-amber-400', icon: 'rice_bowl' },
                { label: rp.fats, value: `${targetFats}g`, pct: Math.round((targetFats * 9 / targetCal) * 100), color: 'text-rose-500 dark:text-rose-400', icon: 'water_drop' },
              ].map((macro) => (
                <div key={macro.label} className="flex flex-col items-center">
                  <div className="relative size-14 mb-2">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <path className="text-nura-border dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                      <path className={macro.color} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${macro.pct}, 100`} strokeLinecap="round" strokeWidth="2.5"></path>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`material-symbols-outlined ${macro.color} text-xl`}>{macro.icon}</span>
                    </div>
                  </div>
                  <span className="text-xl font-bold">{macro.value}</span>
                  <span className="text-xs font-medium text-nura-muted">{macro.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Action */}
      <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-nura-bg via-nura-bg to-transparent dark:from-background-dark dark:via-background-dark pt-10 pb-8 z-30">
        <button
          onClick={() => onNavigate(AppView.PLAN)}
          className="w-full bg-nura-petrol dark:bg-primary hover:brightness-110 active:scale-[0.98] transition-all duration-200 text-white font-bold text-lg rounded-xl py-4 shadow-lg flex items-center justify-center gap-3 border border-white/10"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          {rp.generatePlan90}
        </button>
      </div>

    </div>
  );
};