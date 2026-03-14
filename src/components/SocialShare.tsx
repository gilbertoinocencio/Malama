import React, { useRef, useState } from 'react';
import { DailyStats } from '../types';
import html2canvas from 'html2canvas';

interface SocialShareProps {
  stats: DailyStats;
  onClose: () => void;
}

type ShareView = 'LANDING' | 'CUSTOMIZE';
type TemplateStyle = 'Gallery' | 'Glass' | 'Photo' | 'Gradient' | 'Data';
type ViewOption = 'Data' | 'Hide';

export const SocialShare: React.FC<SocialShareProps> = ({ stats, onClose }) => {
  const [view, setView] = useState<ShareView>('LANDING');
  const [template, setTemplate] = useState<TemplateStyle>('Gallery');
  const [viewOption, setViewOption] = useState<ViewOption>('Data');
  
  // Refs for different capture elements
  const previewCardRef = useRef<HTMLDivElement>(null);
  const customizeCardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      // Wait for font/image stability
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(ref.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null
      });
      const link = document.createElement('a');
      link.download = `nura-share-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleCopyLink = () => {
    // Placeholder for copy link functionality
    alert("Link copied to clipboard!");
  };

  // --- RENDERERS ---

  const renderGalleryCard = () => (
    <div className="w-full relative px-2 sm:px-4">
      <div className="group relative w-full aspect-square bg-[#FDFBF9] shadow-2xl shadow-gray-200/50 dark:shadow-black/30 rounded-none flex flex-col justify-between p-8 sm:p-10 border-[12px] border-white overflow-hidden transition-transform duration-500 ease-out hover:scale-[1.01]">
        {/* Top: Date */}
        <div className="flex justify-center w-full opacity-60">
          <p className="text-[#1a1a1a] text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase">
             {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
        </div>
        
        {/* Center: Data & Quote */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
          {/* Main Metric */}
          <div className="flex flex-col items-center">
            <h1 className="text-7xl sm:text-8xl font-extrabold text-[#1a1a1a] tracking-tighter leading-[0.8] font-display">
              {stats.consumedCalories.toLocaleString()}
            </h1>
            <div className="h-1 w-12 bg-primary mt-4 mb-2"></div>
            <p className="text-primary text-xs sm:text-sm font-bold tracking-[0.3em] uppercase">Calories</p>
          </div>
          
          {/* Secondary Metrics */}
          <div className="flex items-center gap-4 text-[#1a1a1a]/70">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{Math.round(stats.macros.protein)}g</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">Protein</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{Math.round(stats.macros.fats)}g</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">Fat</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{Math.round(stats.macros.carbs)}g</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">Carbs</span>
            </div>
          </div>
          
          {/* Hero Quote */}
          <div className="mt-4 max-w-[80%] text-center">
            <p className="font-libre italic text-xl sm:text-2xl text-[#1a1a1a] leading-tight">
                "Consistent, not perfect."
            </p>
          </div>
        </div>

        {/* Bottom: Branding */}
        <div className="flex flex-col items-center justify-end w-full gap-1 opacity-40 mt-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#1a1a1a]">spa</span> 
            <p className="text-[#1a1a1a] text-[10px] font-bold tracking-[0.2em] uppercase">NURA</p>
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
    const progress = Math.min((stats.consumedCalories / stats.targetCalories) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (progress / 100) * circumference;

    const pPct = Math.min((stats.macros.protein / stats.targetMacros.protein) * 100, 100);
    const cPct = Math.min((stats.macros.carbs / stats.targetMacros.carbs) * 100, 100);
    const fPct = Math.min((stats.macros.fats / stats.targetMacros.fats) * 100, 100);

    return (
      <div className="relative w-full aspect-[9/16] bg-[#f6f8f6] overflow-hidden shadow-2xl rounded-xl font-epilogue">
        {/* Background Layer */}
        <div className="absolute inset-0 w-full h-full bg-cover bg-center z-0 scale-110 blur-md" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA__4wYFphMV1nQBvjJI0_nV_9VNcU3xEuyKiWIGyjrihJuADCSIj52cjHUAjrF-C0o077Y__bIwzPTr3RI9Lj9adwN-vEu_6aEXLEyLiE9v6ZiGrIrunLPKBGTHPeJBhInRzYEXmYBt4DB1s6-alOQwdXuRhxfQlBOY1yTHjYKMraQ0yE4mrxlT98B__X6aDoBZaZQwLCn7PisLaHjRb1Cc5m0R_TdBT5eO_dTqbGaCPWUXx8CrtfqpGKCPn6uFTNOs86YwYN1XEU")'}}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-black/10 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#102212]/30 to-transparent z-0"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full justify-between items-center py-10 px-6">
           <div className="h-4"></div> {/* Spacer */}
           
           <div className="glass-panel bg-white/75 backdrop-blur-xl border border-white/80 w-full rounded-xl p-6 flex flex-col items-center gap-6 shadow-[0_25px_50px_-12px_rgba(16,34,18,0.15)]">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-[#102212] tracking-widest text-xs font-bold uppercase mb-1 opacity-60">Nura Daily</h1>
                <h2 className="text-[#102212] tracking-tight text-3xl font-bold leading-tight">Flow do Dia</h2>
              </div>
              
              {/* Ring */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="#e0e8e0" strokeWidth="8"></circle>
                  <circle cx="50" cy="50" fill="none" r="45" stroke="#11d421" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="8"></circle>
                </svg>
                <div className="flex flex-col items-center text-center z-10">
                  <span className="material-symbols-outlined text-[#11d421] text-2xl mb-1">local_fire_department</span>
                  <p className="text-[#102212] text-3xl font-bold tracking-tighter">{stats.consumedCalories}</p>
                  <p className="text-[#102212]/60 text-[10px] font-medium uppercase tracking-wide mt-1">kcal / {stats.targetCalories}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-[#102212]/10"></div>

              {/* Macro Bars */}
              <div className="w-full flex flex-col gap-3">
                 {[
                   { l: 'Proteína', v: Math.round(stats.macros.protein), t: stats.targetMacros.protein, c: '#11d421', p: pPct },
                   { l: 'Carbs', v: Math.round(stats.macros.carbs), t: stats.targetMacros.carbs, c: '#fbbf24', p: cPct },
                   { l: 'Gorduras', v: Math.round(stats.macros.fats), t: stats.targetMacros.fats, c: '#a78bfa', p: fPct }
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
                <span className="text-[#102212] font-semibold text-sm tracking-wide">NURA</span>
                <span className="w-1 h-1 bg-[#102212]/30 rounded-full"></span>
                <span className="text-[#102212]/70 font-light text-sm italic">Feed the Flow</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // Helper for other templates (Photo, Gradient, etc - reused from previous step)
  const renderStandardTemplate = () => {
     // Reusing logic from previous implementation for 'Photo', 'Gradient', 'Data'
     // This is a simplified version for the customize view when not in Glass mode
     const config = {
        Photo: { bg: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjuQJ8PCRBggfRaN5-fnejVbiNzeH5BESKFJxOt0_KPmYCOD-P1f2FGk533c5myAYN_uf_DQIWzTodtHTy6xgAdnpBfx-oncituMAGGeKx8IiJEgLDFKGBgPm0effxsPNPEhO8_E3JNNfDFeZ-9Y4O0rcqS9AYzDbVQP8zDwy3Do0YyRamqJ1_CFXSWbDpTxXix2LwhM89V1l8sMtbBmDx5fFeNfNGUZ3Zta5dCmQJwhMsf2bLZCDOxAOYmJFY9fo0GpAHD40zRK8')", text: 'text-white' },
        Gradient: { bg: "linear-gradient(135deg, #d47311 0%, #f8f7f6 100%)", text: 'text-[#221910]' },
        Data: { bg: "#f8f7f6", text: 'text-[#181411]' }
     }[template as string] || { bg: '#fff', text: 'text-black' };
     
     if (template === 'Glass') return renderGlassCard();
     if (template === 'Gallery') return renderGalleryCard();

     return (
      <div className="w-full relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group mb-6 transition-all duration-300">
         <div className="absolute inset-0 bg-cover bg-center" style={{ background: config.bg }}></div>
         <div className={`absolute inset-0 flex flex-col justify-between p-6 ${config.text}`}>
            <div className="flex justify-between items-start pt-2">
               <span className="font-bold">NURA</span>
               <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="mb-4">
              <h3 className="text-5xl font-bold">{stats.consumedCalories} kcal</h3>
              <div className="flex gap-2 mt-4">
                 <span>P: {stats.macros.protein}g</span>
                 <span>C: {stats.macros.carbs}g</span>
                 <span>F: {stats.macros.fats}g</span>
              </div>
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
        <header className="sticky top-0 z-10 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800/50">
          <div onClick={onClose} className="flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Share Your Progress</h2>
          <div className="flex w-12 items-center justify-end">
            <button onClick={onClose} className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0 hover:text-primary/80 transition-colors">Done</button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center w-full max-w-md mx-auto px-4 pb-8">
          <div className="w-full pt-6 pb-4">
            <h3 className="tracking-tight text-2xl font-bold leading-tight text-center">Preview</h3>
          </div>

          <div ref={previewCardRef} className="w-full">
            {renderGalleryCard()}
          </div>

          <div className="h-8"></div>

          {/* ActionsBar */}
          <div className="w-full">
            <div className="grid grid-cols-3 gap-4 px-2">
              <button onClick={() => handleDownload(previewCardRef)} className="flex flex-col items-center gap-3 group/btn focus:outline-none">
                <div className="flex items-center justify-center size-14 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200 group-hover/btn:scale-110 group-active/btn:scale-95 group-hover/btn:shadow-md group-hover/btn:border-primary/20">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-200 group-hover/btn:text-primary transition-colors">download</span>
                </div>
                <span className="text-xs font-medium leading-normal">Save Image</span>
              </button>
              <button onClick={() => handleDownload(previewCardRef)} className="flex flex-col items-center gap-3 group/btn focus:outline-none">
                <div className="flex items-center justify-center size-14 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200 group-hover/btn:scale-110 group-active/btn:scale-95 group-hover/btn:shadow-md group-hover/btn:border-primary/20">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-200 group-hover/btn:text-primary transition-colors">auto_awesome_motion</span>
                </div>
                <span className="text-xs font-medium leading-normal">Stories</span>
              </button>
              <button onClick={handleCopyLink} className="flex flex-col items-center gap-3 group/btn focus:outline-none">
                <div className="flex items-center justify-center size-14 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200 group-hover/btn:scale-110 group-active/btn:scale-95 group-hover/btn:shadow-md group-hover/btn:border-primary/20">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-200 group-hover/btn:text-primary transition-colors">content_copy</span>
                </div>
                <span className="text-xs font-medium leading-normal">Copy Link</span>
              </button>
            </div>
          </div>

          <div className="h-8"></div>

          {/* Customize Button */}
          <div className="w-full px-2">
            <button 
              onClick={() => {
                setTemplate('Gallery'); // Default to gallery when entering customize from here
                setView('CUSTOMIZE');
              }}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 active:bg-primary/30 text-primary transition-all duration-200"
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">tune</span>
              <span className="text-sm font-bold leading-normal tracking-[0.015em] truncate">Customize Template</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // CUSTOMIZE VIEW
  return (
    <div className="fixed inset-0 z-50 bg-[#f8f7f6] dark:bg-[#221910] flex flex-col h-full animate-fade-in font-display overflow-y-auto hide-scrollbar text-[#181411] dark:text-[#f8f7f6]">
      <header className="flex items-center justify-between p-4 sticky top-0 z-20 bg-[#f8f7f6]/95 dark:bg-[#221910]/95 backdrop-blur-sm transition-colors">
        <button onClick={() => setView('LANDING')} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">Escolha seu Estilo</h1>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pb-32 overflow-y-auto hide-scrollbar">
         <div className="py-4 text-center">
            <h2 className="tracking-tight text-2xl font-bold leading-tight">Estilo do Story</h2>
         </div>

         <div ref={customizeCardRef} className="w-full">
            {template === 'Glass' ? renderGlassCard() : renderStandardTemplate()}
         </div>

         <div className="flex flex-col gap-3 mt-6">
            <div className="flex justify-between items-end px-1">
               <span className="text-sm font-semibold">Templates</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x no-scrollbar">
               {/* Gallery Option */}
               <div onClick={() => setTemplate('Gallery')} className="snap-center shrink-0 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className={`w-20 h-32 rounded-xl border bg-white flex items-center justify-center transition-all ${template === 'Gallery' ? 'border-2 border-primary' : 'border-gray-200'}`}>
                     <span className="material-symbols-outlined text-gray-400">image</span>
                  </div>
                  <span className={`text-xs font-bold ${template === 'Gallery' ? 'text-primary' : 'text-gray-500'}`}>Gallery</span>
               </div>

               {/* Glass Option */}
               <div onClick={() => setTemplate('Glass')} className="snap-center shrink-0 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className={`w-20 h-32 rounded-xl border bg-[#f6f8f6] flex items-center justify-center transition-all ${template === 'Glass' ? 'border-2 border-[#11d421]' : 'border-gray-200'}`}>
                     <span className="material-symbols-outlined text-[#11d421]">eco</span>
                  </div>
                  <span className={`text-xs font-bold ${template === 'Glass' ? 'text-[#11d421]' : 'text-gray-500'}`}>Glass</span>
               </div>
               
               {/* Existing options like Photo, Gradient... */}
               <div onClick={() => setTemplate('Photo')} className="snap-center shrink-0 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className={`w-20 h-32 rounded-xl border bg-gray-800 flex items-center justify-center transition-all ${template === 'Photo' ? 'border-2 border-[#d47311]' : 'border-gray-200'}`}>
                     <span className="material-symbols-outlined text-white">camera_alt</span>
                  </div>
                  <span className={`text-xs font-bold ${template === 'Photo' ? 'text-[#d47311]' : 'text-gray-500'}`}>Photo</span>
               </div>
            </div>
         </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f8f7f6] via-[#f8f7f6]/95 to-transparent dark:from-[#221910] dark:via-[#221910]/95 pt-8 pointer-events-none z-30">
        <button 
           onClick={() => handleDownload(customizeCardRef)}
           className={`pointer-events-auto w-full text-white text-lg font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${template === 'Glass' ? 'bg-[#11d421] shadow-[#11d421]/30' : 'bg-primary shadow-primary/30'}`}
        >
          <span>Compartilhar no Story</span>
          <span className="material-symbols-outlined">ios_share</span>
        </button>
      </div>
    </div>
  );
};