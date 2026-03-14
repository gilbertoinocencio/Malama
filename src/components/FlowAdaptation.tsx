import React from 'react';
import { AppView } from '../types';
import { useLanguage } from '../i18n';

interface FlowAdaptationProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const FlowAdaptation: React.FC<FlowAdaptationProps> = ({ onBack, onNavigate }) => {
  const { t } = useLanguage();
  const fa = t.flowAdaptation;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col mx-auto max-w-md bg-nura-bg dark:bg-background-dark shadow-xl text-nura-main dark:text-white font-display animate-fade-in">

      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center bg-nura-bg/90 dark:bg-background-dark/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-nura-border dark:border-gray-800">
        <div onClick={onBack} className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{fa.title}</h2>
        <div className="flex size-12 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4">

        {/* Sync Status */}
        <section className="flex flex-col gap-1 px-2 pt-2 animate-fade-in-up">
          <div className="flex items-center gap-2 text-nura-petrol dark:text-primary mb-1">
            <span className="material-symbols-outlined filled" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>sync</span>
            <span className="text-xs font-bold uppercase tracking-wider">{fa.syncComplete}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">{fa.activityDetected}</h1>
        </section>

        {/* Activity Card */}
        <section className="@container animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="group flex flex-col items-stretch justify-start rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 bg-white dark:bg-[#1a2630] overflow-hidden transition-transform hover:scale-[1.01] duration-300">
            <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center opacity-90 transition-opacity group-hover:opacity-100"
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBuUeg5VMPFMGsggXXx3-l9ItWg35ojCZlQpuUF3UPW-W3iidkgHPveoIrgDCbQ_QywSw_dNSlbOHxK116YFiNT8TlDTbArtMPT4rbDZxAz-2XoLJca4gIxSKy_Sm_2Mv6XX2Aos1hjbml-6RoJCPszTgw0ebWqbjPkNc-7EmGBSBVR32FCc_ZEcYI894D0Dbz8Y64Oj8z19_igabBNAxvGe5_bRkrNvo9kYPdKVn8OuVSRPcFF-cf7X3aO1iSuooaRwg8JsXOUhUU")' }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="bg-[#fc4c02] text-white p-1.5 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-[10px] font-bold tracking-tighter">STRAVA</span>
                </div>
                <span className="text-white font-medium text-sm drop-shadow-md">Morning Run • Rio de Janeiro</span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-nura-muted dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">{fa.workoutType}</p>
                  <p className="text-xl font-bold leading-tight">5km Tempo Run</p>
                </div>
                <div className="text-right">
                  <p className="text-nura-muted dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">{fa.duration}</p>
                  <p className="text-xl font-bold leading-tight">32:14</p>
                </div>
              </div>
              <div className="h-px w-full bg-nura-border dark:bg-gray-700"></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-nura-petrol dark:text-primary" style={{ fontSize: '20px' }}>local_fire_department</span>
                  <span className="font-bold text-base">400 kcal</span>
                  <span className="text-nura-muted text-sm">{fa.burned}</span>
                </div>
                <button className="flex items-center gap-1 text-nura-petrol dark:text-primary text-sm font-bold hover:opacity-80 transition-colors">
                  <span>{fa.details}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Flow Ring */}
        <section className="flex flex-col items-center justify-center py-6 relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-nura-petrol/10 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="w-full h-full rounded-full ring-gradient p-[12px] shadow-xl relative z-10">
              <div className="w-full h-full bg-nura-bg dark:bg-background-dark rounded-full flex flex-col items-center justify-center relative">
                <div className="flex flex-col items-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-1" style={{ fontSize: '32px' }}>add_circle</span>
                  <h2 className="text-4xl font-bold tracking-tighter">+400</h2>
                  <p className="text-nura-muted dark:text-gray-400 font-medium text-sm uppercase tracking-widest">{fa.kcalAdded}</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
              <div className="w-4 h-4 bg-nura-petrol dark:bg-primary rounded-full shadow-[0_0_12px_rgba(17,164,212,0.8)] border-2 border-white dark:border-background-dark"></div>
            </div>
          </div>

          <div className="mt-8 text-center px-4 max-w-xs">
            <p className="text-nura-main/80 dark:text-gray-300 text-lg leading-relaxed">
              {fa.addedMessage.split(/<bold>(.*?)<\/bold>/).map((part, i) =>
                i % 2 === 1
                  ? <span key={i} className="font-bold text-nura-petrol dark:text-primary">{part.replace('{kcal}', '400')}</span>
                  : <span key={i}>{part}</span>
              )}
            </p>
          </div>
        </section>

        {/* Macro Breakdown */}
        <section className="grid grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {[
            { label: fa.carbs, value: '+50g', pct: 70, color: 'text-amber-600 dark:text-amber-400' },
            { label: fa.protein, value: '+20g', pct: 45, color: 'text-nura-petrol dark:text-primary' },
            { label: fa.fat, value: '+10g', pct: 30, color: 'text-nura-main dark:text-white' },
          ].map((macro) => (
            <div key={macro.label} className="flex flex-col gap-2 p-3 bg-white dark:bg-[#1a2630] rounded-xl border border-nura-border dark:border-gray-800 shadow-sm text-center">
              <span className="text-xs text-nura-muted dark:text-slate-400 font-bold uppercase">{macro.label}</span>
              <span className={`text-xl font-bold ${macro.color}`}>{macro.value}</span>
              <div className="w-full h-1.5 bg-nura-border dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-current ${macro.color}`} style={{ width: `${macro.pct}%` }}></div>
              </div>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
};