import React from 'react';
import { AIResponse } from '../types';

interface PhotoScanResultProps {
  data: AIResponse;
  imageUri: string;
  onConfirm: () => void;
  onEdit: () => void;
  onBack: () => void;
}

export const PhotoScanResult: React.FC<PhotoScanResultProps> = ({ 
  data, 
  imageUri, 
  onConfirm, 
  onEdit, 
  onBack 
}) => {
  
  // Calculate width percentages for macro bars
  const totalMacros = data.macros.p + data.macros.c + data.macros.f;
  const getPercent = (val: number) => totalMacros > 0 ? (val / totalMacros) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display animate-fade-in transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center px-6 py-5 justify-between shrink-0 z-30">
        <div 
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-sm"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </div>
        <h2 className="text-slate-900 dark:text-white text-base font-semibold tracking-wide uppercase opacity-80">NURA AI Scan</h2>
        <div className="flex size-10 items-center justify-center rounded-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-sm">
          <span className="material-symbols-outlined text-xl">more_vert</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start relative px-6 pb-24 w-full max-w-md mx-auto overflow-y-auto hide-scrollbar">
        
        {/* Image Card */}
        <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/20 group shrink-0 bg-gray-100 dark:bg-surface-dark">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
            style={{ backgroundImage: `url("${imageUri}")` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
          </div>
          
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/20">
              <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
              <span className="text-xs font-bold text-primary tracking-wide">AI Detected</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-white/90 dark:bg-[#1a2c33]/90 backdrop-blur-xl p-5 rounded-2xl border border-white/40 dark:border-white/10 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Refeição</span>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">{data.foodName}</h1>
                </div>
                <div className="bg-primary p-2 rounded-full shrink-0 shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-white">check_circle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nutritional Data */}
        <div className="w-full mt-8 px-2 shrink-0">
          <div className="flex items-end justify-between border-b border-gray-200 dark:border-white/10 pb-6 mb-6">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Energy</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-light text-slate-900 dark:text-white">{data.calories}</span>
                <span className="text-base font-medium text-slate-400">kcal</span>
              </div>
            </div>
            {/* Simple SVG Circle Progress */}
            <div className="relative size-12 mb-1">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-200 dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                <path 
                  className="text-primary" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeDasharray="75, 100" 
                  strokeWidth="3"
                  strokeLinecap="round"
                ></path>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Protein</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{data.macros.p}g</span>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${getPercent(data.macros.p)}%` }}
                ></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Carbs</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{data.macros.c}g</span>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-400 rounded-full" 
                  style={{ width: `${getPercent(data.macros.c)}%` }}
                ></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fat</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{data.macros.f}g</span>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 rounded-full" 
                  style={{ width: `${getPercent(data.macros.f)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Fixed Action Area */}
      <div className="fixed bottom-0 left-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pb-8 pt-4 px-6 z-20 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button 
            onClick={onEdit}
            className="flex-1 h-14 rounded-2xl border border-gray-300 dark:border-gray-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            Editar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[2] h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-white font-bold text-sm hover:brightness-110 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">check</span>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};