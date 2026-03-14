import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface HydrationSocialProps {
  onBack: () => void;
}

type TemplateStyle = 'Photo' | 'Gradient' | 'Minimal' | 'Dark';
type ViewOption = 'goal' | 'quote';

export const HydrationSocial: React.FC<HydrationSocialProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [template, setTemplate] = useState<TemplateStyle>('Gradient');
  const [viewOption, setViewOption] = useState<ViewOption>('goal');
  const cardRef = useRef<HTMLDivElement>(null);

  const [currentMl, setCurrentMl] = useState(0);
  const [goalMl, setGoalMl] = useState(3000);

  useEffect(() => {
    if (user) loadHydration();
  }, [user]);

  const loadHydration = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_logs')
        .select('hydration_ml')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      if (data?.hydration_ml) setCurrentMl(data.hydration_ml);
    } catch (e) {
      // no log for today yet
    }
  };

  const currentL = (currentMl / 1000).toFixed(1);
  const goalL = (goalMl / 1000).toFixed(1);
  const filledGlasses = Math.min(Math.floor(currentMl / 500), 6);

  const handleShare = async () => {
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null
      });
      const link = document.createElement('a');
      link.download = `nura-hydration-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const getTemplateStyles = (type: TemplateStyle) => {
    switch (type) {
      case 'Photo':
        return {
          bg: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuChM2tXonuf-O9q5XBChK6E-si0BUZmrZy06Bv40sCpK_ttBtqEm2xrSKVxdrR4na08ye1CY29Sq5K6y9B9lUVYUNvqKSR2_I1-ZTCwov4gJPFH9REtUZoORr4km3DYK38qqQLmebKLdKLmfNa1T1XGUFiFqzHzoJI9gNUuhgZhC00ncrmngemBabk7pt3qw3dBWxchcVy9KV6dI0ggrZT1FaKIVe1byFI6GGZTQDQ41D2dvtpvvZxTKCe9Prnb4z96xR6VeTKM6gA')",
          overlay: "bg-black/40",
          text: "text-white",
          subtext: "text-white/80",
          accent: "text-white",
          iconFill: "white",
          iconStroke: "white"
        };
      case 'Gradient':
        return {
          bg: "linear-gradient(135deg, #103e4a 0%, #487380 50%, #eaddcf 100%)",
          overlay: "bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-10 mix-blend-overlay",
          text: "text-white",
          subtext: "text-white/80",
          accent: "text-white",
          iconFill: "white",
          iconStroke: "white"
        };
      case 'Minimal':
        return {
          bg: "#ffffff",
          overlay: "",
          text: "text-[#181411]",
          subtext: "text-[#897561]",
          accent: "text-nura-petrol",
          iconFill: "#1F4E5F",
          iconStroke: "#1F4E5F"
        };
      case 'Dark':
        return {
          bg: "#103e4a",
          overlay: "",
          text: "text-white",
          subtext: "text-white/60",
          accent: "text-hydro-beige",
          iconFill: "#eaddcf",
          iconStroke: "#eaddcf"
        };
    }
  };

  const currentStyles = getTemplateStyles(template);

  const WaterIcon: React.FC<{ filled?: boolean }> = ({ filled = true }) => (
    <svg className="drop-shadow-sm" fill="none" height="30" viewBox="0 0 20 28" width="22" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 2V18C2.5 22.1421 5.85786 25.5 10 25.5C14.1421 25.5 17.5 22.1421 17.5 18V2H2.5Z"
        fill={filled ? currentStyles.iconFill : 'none'}
        stroke={!filled ? currentStyles.iconStroke : 'none'}
        strokeWidth={!filled ? "1.5" : "0"}
        strokeOpacity={!filled ? "0.7" : "1"}
      />
    </svg>
  );

  const hy = t.hydration;

  return (
    <div className="fixed inset-0 z-50 bg-nura-bg dark:bg-background-dark text-nura-main dark:text-white flex flex-col font-display animate-fade-in">

      {/* Header */}
      <header className="flex items-center justify-between p-4 sticky top-0 z-20 bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors border-b border-nura-border dark:border-white/5">
        <button
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-nura-main dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">{hy.title}</h1>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pb-28 overflow-y-auto no-scrollbar">

        {/* Title */}
        <div className="py-4 text-center">
          <h2 className="text-nura-main dark:text-white tracking-tight text-2xl font-bold leading-tight">{hy.trackFlow}</h2>
          <p className="text-sm text-nura-muted dark:text-gray-400 mt-1">{hy.shareGoal}</p>
        </div>

        {/* Card Preview */}
        <div
          ref={cardRef}
          className="w-full relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group mb-6 transition-all duration-300"
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{ background: currentStyles.bg }}
          ></div>
          <div className={`absolute inset-0 ${currentStyles.overlay}`}></div>

          <div className="absolute inset-0 flex flex-col justify-between p-8 z-10">
            <div className="flex-1"></div>

            <div className="flex flex-col items-center w-full gap-8">
              {viewOption === 'goal' && (
                <div className="text-center">
                  <p className={`text-xs font-bold tracking-[0.2em] uppercase opacity-70 mb-3 ${currentStyles.subtext}`}>{hy.todayGoal}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <h3 className={`text-[56px] font-light leading-none tracking-tight drop-shadow-sm ${currentStyles.text}`}>{currentL}L</h3>
                    <span className={`text-3xl font-light opacity-50 leading-none ${currentStyles.subtext}`}>/ {goalL}L</span>
                  </div>
                </div>
              )}

              {/* Water Visuals */}
              <div className="flex items-center gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <WaterIcon key={i} filled={i < filledGlasses} />
                ))}
              </div>

              {(viewOption === 'quote' || viewOption === 'goal') && (
                <div className="mt-4 text-center">
                  <p className={`font-display text-xl italic font-light tracking-wide opacity-90 drop-shadow-sm ${currentStyles.text}`}>
                    "Stay fluid. Keep the flow."
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1"></div>

            <div className="w-full flex justify-center items-end pb-2">
              <span className={`text-[10px] font-bold tracking-[0.25em] uppercase ${currentStyles.subtext} opacity-60`}>NURA — Feed the Flow</span>
            </div>
          </div>
        </div>

        {/* View Options */}
        <div className="flex justify-between items-center mb-6 px-1">
          <span className="text-sm font-semibold text-nura-main dark:text-white">{hy.viewOptions}</span>
          <div className="flex bg-white dark:bg-[#1a2630] rounded-full p-1 shadow-sm border border-nura-border dark:border-white/5">
            <button
              onClick={() => setViewOption('goal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${viewOption === 'goal' ? 'bg-nura-petrol dark:bg-primary text-white shadow-sm' : 'text-nura-muted hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined text-[18px]">water_drop</span>
              <span className="text-xs font-bold">{hy.goal}</span>
            </button>
            <button
              onClick={() => setViewOption('quote')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${viewOption === 'quote' ? 'bg-nura-petrol dark:bg-primary text-white shadow-sm' : 'text-nura-muted hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined text-[18px]">format_quote</span>
              <span className="text-xs font-medium">{hy.quote}</span>
            </button>
          </div>
        </div>

        {/* Template Style Selector */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-sm font-semibold text-nura-main dark:text-white">{hy.templateStyle}</span>
            <span className="text-xs text-nura-petrol dark:text-primary font-medium cursor-pointer">{hy.viewAll}</span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x no-scrollbar">
            {(['Photo', 'Gradient', 'Minimal', 'Dark'] as TemplateStyle[]).map((style) => (
              <div key={style} onClick={() => setTemplate(style)} className="snap-center shrink-0 flex flex-col items-center gap-2 group cursor-pointer">
                <div className={`relative w-20 h-32 rounded-xl border overflow-hidden transition-all active:scale-95 ${style === 'Minimal' ? 'bg-white' : style === 'Dark' ? 'bg-[#103e4a]' : ''
                  } ${template === style ? 'border-2 border-nura-petrol dark:border-primary shadow-lg shadow-nura-petrol/20' : 'border-nura-border dark:border-white/10 opacity-80 hover:opacity-100'}`}>
                  {style === 'Photo' && (
                    <div className="absolute inset-0 bg-cover bg-center grayscale opacity-50" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuChM2tXonuf-O9q5XBChK6E-si0BUZmrZy06Bv40sCpK_ttBtqEm2xrSKVxdrR4na08ye1CY29Sq5K6y9B9lUVYUNvqKSR2_I1-ZTCwov4gJPFH9REtUZoORr4km3DYK38qqQLmebKLdKLmfNa1T1XGUFiFqzHzoJI9gNUuhgZhC00ncrmngemBabk7pt3qw3dBWxchcVy9KV6dI0ggrZT1FaKIVe1byFI6GGZTQDQ41D2dvtpvvZxTKCe9Prnb4z96xR6VeTKM6gA')" }}></div>
                  )}
                  {style === 'Gradient' && <div className="absolute inset-0 bg-gradient-to-br from-[#103e4a] to-[#eaddcf]"></div>}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`material-symbols-outlined text-2xl ${style === 'Minimal' ? 'text-black/50' : 'text-white/80'}`}>
                      {style === 'Photo' ? 'image' : style === 'Gradient' ? 'water_full' : style === 'Dark' ? 'dark_mode' : 'crop_portrait'}
                    </span>
                  </div>
                  {template === style && <div className="absolute top-1 right-1 bg-nura-petrol dark:bg-primary rounded-full p-0.5"><span className="material-symbols-outlined text-white text-[12px] block">check</span></div>}
                </div>
                <span className={`text-xs font-medium ${template === style ? 'text-nura-petrol dark:text-primary font-bold' : 'text-nura-muted'}`}>{style}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-nura-bg via-nura-bg/95 to-transparent dark:from-background-dark dark:via-background-dark/95 pt-8 pointer-events-none z-30">
        <button
          onClick={handleShare}
          className="pointer-events-auto w-full bg-nura-petrol hover:brightness-110 dark:bg-primary dark:hover:brightness-110 text-white text-lg font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          <span>{hy.shareGoalCta}</span>
          <span className="material-symbols-outlined">ios_share</span>
        </button>
      </div>

    </div>
  );
};