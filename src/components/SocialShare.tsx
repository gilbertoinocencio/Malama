import React, { useRef, useState } from 'react';
import { DailyStats } from '../types';
import { useLanguage } from '../i18n';
import { useShareCard } from '../hooks/useShareCard';
import { getLocalDateString } from '../utils/dateUtils';

interface SocialShareProps {
  stats: DailyStats;
  onClose: () => void;
}

type ShareView = 'LANDING' | 'CUSTOMIZE';
type TemplateStyle = 'Gallery' | 'Glass' | 'Sunset' | 'Gradient' | 'Data';

const TEMPLATE_CHIPS: {
  id: TemplateStyle;
  icon: string;
  swatch: string;
  accent: string;
  iconColor: string;
}[] = [
  { id: 'Gallery',  icon: 'image',      swatch: '#ffffff',                                              accent: '#8c473e', iconColor: '#9ca3af' },
  { id: 'Glass',    icon: 'eco',        swatch: 'radial-gradient(circle at 30% 20%, #d8ecd6, #3f7a53)', accent: '#11d421', iconColor: '#ffffff' },
  { id: 'Sunset',   icon: 'wb_twilight', swatch: 'linear-gradient(160deg, #f6a45c, #7d4a3c)',           accent: '#d47311', iconColor: '#ffffff' },
  { id: 'Gradient', icon: 'gradient',   swatch: 'linear-gradient(135deg, #d47311, #f8f7f6)',            accent: '#d47311', iconColor: '#ffffff' },
  { id: 'Data',     icon: 'bar_chart',  swatch: '#f8f7f6',                                              accent: '#8c473e', iconColor: '#181411' },
];

export const SocialShare: React.FC<SocialShareProps> = ({ stats, onClose }) => {
  const { t, language } = useLanguage();
  const ts = t.social;
  const { share, sharing } = useShareCard();
  const [view, setView] = useState<ShareView>('LANDING');
  const [template, setTemplate] = useState<TemplateStyle>('Gallery');

  const localeMap: Record<string, string> = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' };
  const locale = localeMap[language] || 'en-US';

  // Refs for different capture elements
  const previewCardRef = useRef<HTMLDivElement>(null);
  const customizeCardRef = useRef<HTMLDivElement>(null);

  const handleShare = (ref: React.RefObject<HTMLDivElement | null>) =>
    share(ref.current, {
      filename: `Malama-share-${getLocalDateString()}`,
      title: ts.shareTitle,
      text: `${stats.consumedCalories ?? 0} ${ts.calories} — ${ts.quoteDay}`,
    });

  // --- RENDERERS ---

  // O wrapper não tem padding de propósito: ele é o alvo da captura, e a margem
  // transparente virava barra preta ao postar no Instagram.
  const renderGalleryCard = () => (
    <div className="w-full relative">
      <div className="group relative w-full aspect-square bg-[#FDFBF9] shadow-2xl shadow-gray-200/50 dark:shadow-black/30 rounded-none flex flex-col justify-between p-8 sm:p-10 border-[12px] border-white overflow-hidden transition-transform duration-500 ease-out hover:scale-[1.01]">
        {/* Top: Date */}
        <div className="flex justify-center w-full opacity-60">
          <p className="text-[#1a1a1a] text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase">
             {new Date().toLocaleDateString(locale, { month: 'short', day: 'numeric' })} • {new Date().toLocaleDateString(locale, { weekday: 'long' })}
          </p>
        </div>
        
        {/* Center: Data & Quote */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
          {/* Main Metric */}
          <div className="flex flex-col items-center">
            <h1 className="text-7xl sm:text-8xl font-extrabold text-[#1a1a1a] tracking-tighter leading-[0.8] font-display">
              {(stats.consumedCalories ?? 0).toLocaleString()}
            </h1>
            <div className="h-1 w-12 bg-primary mt-4 mb-2"></div>
            <p className="text-primary text-xs sm:text-sm font-bold tracking-[0.3em] uppercase">{ts.calories}</p>
          </div>
          
          {/* Secondary Metrics */}
          <div className="flex items-center gap-4 text-[#1a1a1a]/70">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{Math.round(stats.macros.protein)}g</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">{ts.protein}</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{Math.round(stats.macros.fats)}g</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">{ts.fat}</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{Math.round(stats.macros.carbs)}g</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">{ts.carbs}</span>
            </div>
          </div>
          
          {/* Hero Quote */}
          <div className="mt-4 max-w-[80%] text-center">
            <p className="font-libre italic text-xl sm:text-2xl text-[#1a1a1a] leading-tight">
                "{ts.quoteDay}"
            </p>
          </div>
        </div>

        {/* Bottom: Branding */}
        <div className="flex flex-col items-center justify-end w-full gap-1 opacity-40 mt-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#1a1a1a]">spa</span> 
            <p className="text-[#1a1a1a] text-[10px] font-bold tracking-[0.2em] uppercase">Malama</p>
          </div>
          <p className="text-[#1a1a1a] text-[8px] font-medium tracking-[0.1em] uppercase">Feed the Flow</p>
        </div>
        
        {/* Texture Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-100/10 to-transparent pointer-events-none mix-blend-multiply"></div>
      </div>
    </div>
  );

  const renderGlassCard = () => {
    // Glass/Story Template Logic
    const progress = Math.min(((stats.consumedCalories ?? 0) / (stats.targetCalories || 1)) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (progress / 100) * circumference;

    const pPct = Math.min(((stats.macros.protein ?? 0) / (stats.targetMacros.protein || 1)) * 100, 100);
    const cPct = Math.min(((stats.macros.carbs ?? 0) / (stats.targetMacros.carbs || 1)) * 100, 100);
    const fPct = Math.min(((stats.macros.fats ?? 0) / (stats.targetMacros.fats || 1)) * 100, 100);

    return (
      <div className="relative w-full aspect-[9/16] bg-[#f6f8f6] overflow-hidden shadow-2xl rounded-xl font-epilogue">
        {/* Background Layer — CSS puro: sem dependência de rede nem de CORS */}
        <div className="absolute inset-0 w-full h-full z-0" style={{ background: 'radial-gradient(circle at 25% 20%, #d8ecd6 0%, #9dc9a4 40%, #3f7a53 100%)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-black/10 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#102212]/30 to-transparent z-0"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full justify-between items-center py-10 px-6">
           <div className="h-4"></div> {/* Spacer */}
           
           <div className="glass-panel bg-white/75 backdrop-blur-xl border border-white/80 w-full rounded-xl p-6 flex flex-col items-center gap-6 shadow-[0_25px_50px_-12px_rgba(16,34,18,0.15)]">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-[#102212] tracking-widest text-xs font-bold uppercase mb-1 opacity-60">Malama Daily</h1>
                <h2 className="text-[#102212] tracking-tight text-3xl font-bold leading-tight">{ts.dailyFlow}</h2>
              </div>
              
              {/* Ring */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="#e0e8e0" strokeWidth="8"></circle>
                  <circle cx="50" cy="50" fill="none" r="45" stroke="#11d421" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="8"></circle>
                </svg>
                <div className="flex flex-col items-center text-center z-10">
                  <span className="material-symbols-outlined text-[#11d421] text-2xl mb-1">local_fire_department</span>
                  <p className="text-[#102212] text-3xl font-bold tracking-tighter">{stats.consumedCalories ?? 0}</p>
                  <p className="text-[#102212]/60 text-[10px] font-medium uppercase tracking-wide mt-1">kcal / {stats.targetCalories ?? 0}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-[#102212]/10"></div>

              {/* Macro Bars */}
              <div className="w-full flex flex-col gap-3">
                 {[
                   { l: ts.protein, v: Math.round(stats.macros.protein), t: stats.targetMacros.protein, c: '#11d421', p: pPct },
                   { l: ts.carbs, v: Math.round(stats.macros.carbs), t: stats.targetMacros.carbs, c: '#fbbf24', p: cPct },
                   { l: ts.fat, v: Math.round(stats.macros.fats), t: stats.targetMacros.fats, c: '#a78bfa', p: fPct }
                 ].map((m) => (
                   <div key={m.l} className="flex flex-col gap-1">
                      <div className="flex justify-between items-end px-1">
                        <span className="text-[#102212] text-xs font-semibold">{m.l}</span>
                        <span className="text-[#102212]/70 text-[10px]">{m.v}g / {m.t}g</span>
                      </div>
                      <div className="w-full h-2 bg-white/50 rounded-full border border-white/40 overflow-hidden relative">
                         <div className="absolute top-0 left-0 h-full opacity-90 rounded-full" style={{ width: `${m.p}%`, backgroundColor: m.c }}></div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Footer */}
           <div className="flex flex-col items-center gap-3 mb-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-5 py-2 flex items-center gap-2 shadow-lg">
                <span className="material-symbols-outlined text-[#11d421] text-lg">eco</span>
                <span className="text-[#102212] font-semibold text-sm tracking-wide">Malama</span>
                <span className="w-1 h-1 bg-[#102212]/30 rounded-full"></span>
                <span className="text-[#102212]/70 font-light text-sm italic">Feed the Flow</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // Templates simples (Sunset, Gradient, Data). Fundos em CSS puro pelo mesmo
  // motivo do Glass: as URLs de protótipo quebravam offline e no CORS.
  const renderStandardTemplate = () => {
     const config = {
        Sunset: { bg: 'linear-gradient(160deg, #f6a45c 0%, #d47311 45%, #7d4a3c 100%)', text: 'text-white', sub: 'text-white/75' },
        Gradient: { bg: 'linear-gradient(135deg, #d47311 0%, #f8f7f6 100%)', text: 'text-[#221910]', sub: 'text-[#221910]/60' },
        Data: { bg: '#f8f7f6', text: 'text-[#181411]', sub: 'text-[#181411]/60' }
     }[template as string] || { bg: '#fff', text: 'text-black', sub: 'text-black/60' };

     if (template === 'Glass') return renderGlassCard();
     if (template === 'Gallery') return renderGalleryCard();

     return (
      <div className="w-full relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group mb-6 transition-all duration-300">
         <div className="absolute inset-0" style={{ background: config.bg }}></div>
         <div className={`absolute inset-0 flex flex-col justify-between p-6 ${config.text}`}>
            <div className="flex justify-between items-start pt-2">
               <span className="font-bold tracking-[0.2em] text-xs uppercase">Malama</span>
               <span className={`text-xs ${config.sub}`}>
                  {new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
               </span>
            </div>
            <div className="mb-4">
              <h3 className="text-6xl font-bold tracking-tighter leading-none">{stats.consumedCalories ?? 0}</h3>
              <p className={`text-xs font-bold tracking-[0.3em] uppercase mt-2 ${config.sub}`}>{ts.calories}</p>
              <div className="flex gap-4 mt-6 text-sm font-semibold">
                 <span>{ts.protein} {Math.round(stats.macros.protein)}g</span>
                 <span>{ts.carbs} {Math.round(stats.macros.carbs)}g</span>
                 <span>{ts.fat} {Math.round(stats.macros.fats)}g</span>
              </div>
              <p className={`mt-6 text-[10px] font-bold tracking-[0.25em] uppercase ${config.sub}`}>Feed the Flow</p>
            </div>
         </div>
      </div>
     );
  };

  // --- MAIN VIEWS ---

  if (view === 'LANDING') {
    return (
      <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col h-full animate-fade-in font-display overflow-y-auto hide-scrollbar text-slate-900 dark:text-white">
        
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 pt-safe-header pb-2 justify-between border-b border-gray-100 dark:border-white/10/50">
          <div onClick={onClose} className="flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{ts.shareTitle}</h2>
          <div className="flex w-12 items-center justify-end">
            <button onClick={onClose} className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0 hover:text-primary/80 transition-colors">{ts.done}</button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center w-full max-w-md mx-auto px-4 pb-8">
          <div className="w-full pt-6 pb-4">
            <h3 className="tracking-tight text-2xl font-bold leading-tight text-center">{ts.preview}</h3>
          </div>

          <div ref={previewCardRef} className="w-full">
            {renderStandardTemplate()}
          </div>

          <div className="h-8"></div>

          {/* Ação principal. Um botão só: a folha nativa já oferece salvar na
              galeria, stories e enviar para qualquer app — os três ícones que
              existiam aqui chamavam todos o mesmo download. */}
          <div className="w-full px-2">
            <button
              onClick={() => handleShare(previewCardRef)}
              disabled={sharing}
              className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-6 bg-primary text-white font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">ios_share</span>
              <span className="text-base leading-normal tracking-[0.015em] truncate">
                {sharing ? ts.sharing : ts.shareStory}
              </span>
            </button>
          </div>

          <div className="h-4"></div>

          {/* Customize Button */}
          <div className="w-full px-2">
            <button
              onClick={() => setView('CUSTOMIZE')}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 active:bg-primary/30 text-primary transition-all duration-200"
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">tune</span>
              <span className="text-sm font-bold leading-normal tracking-[0.015em] truncate">{ts.customize}</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // CUSTOMIZE VIEW
  return (
    <div className="fixed inset-0 z-50 bg-[#f8f7f6] dark:bg-[#221910] flex flex-col h-full animate-fade-in font-display overflow-y-auto hide-scrollbar text-[#181411] dark:text-[#f8f7f6]">
      <header className="flex items-center justify-between px-4 pb-4 pt-safe-header sticky top-0 z-20 bg-[#f8f7f6]/95 dark:bg-[#221910]/95 backdrop-blur-sm transition-colors">
        <button onClick={() => setView('LANDING')} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">{ts.chooseStyle}</h1>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pb-32 overflow-y-auto hide-scrollbar">
         <div className="py-4 text-center">
            <h2 className="tracking-tight text-2xl font-bold leading-tight">{ts.storyStyle}</h2>
         </div>

         <div ref={customizeCardRef} className="w-full">
            {template === 'Glass' ? renderGlassCard() : renderStandardTemplate()}
         </div>

         <div className="flex flex-col gap-3 mt-6">
            <div className="flex justify-between items-end px-1">
               <span className="text-sm font-semibold">{ts.templates}</span>
            </div>
            {/* Todos os templates do tipo aparecem aqui. Gradient e Data existiam
                no código mas não tinham chip — eram inalcançáveis. */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x no-scrollbar">
               {TEMPLATE_CHIPS.map(chip => {
                  const active = template === chip.id;
                  return (
                     <div
                        key={chip.id}
                        onClick={() => setTemplate(chip.id)}
                        className="snap-center shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
                     >
                        <div
                           className={`relative w-20 h-32 rounded-xl border overflow-hidden flex items-center justify-center transition-all active:scale-95 ${active ? 'border-2' : 'border-gray-200 opacity-80 hover:opacity-100'}`}
                           style={{ background: chip.swatch, borderColor: active ? chip.accent : undefined }}
                        >
                           <span className="material-symbols-outlined" style={{ color: chip.iconColor }}>{chip.icon}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: active ? chip.accent : '#6b7280' }}>{chip.id}</span>
                     </div>
                  );
               })}
            </div>
         </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f8f7f6] via-[#f8f7f6]/95 to-transparent dark:from-[#221910] dark:via-[#221910]/95 pt-8 pointer-events-none z-30">
        <button
           onClick={() => handleShare(customizeCardRef)}
           disabled={sharing}
           className={`pointer-events-auto w-full text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60 ${template === 'Glass' ? 'bg-[#11d421]' : 'bg-primary'}`}
        >
          <span>{sharing ? ts.sharing : ts.shareStory}</span>
          <span className="material-symbols-outlined">ios_share</span>
        </button>
      </div>
    </div>
  );
};
