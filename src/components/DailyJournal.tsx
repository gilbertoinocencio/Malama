import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { DailyLogService } from '../services/dailyLogService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';

interface DailyJournalProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

type EnergyLevel = 'low' | 'medium' | 'good' | 'flow';

export const DailyJournal: React.FC<DailyJournalProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [saving, setSaving] = useState(false);

  const jt = t.journal;

  useEffect(() => {
    if (user) loadLog();
  }, [user]);

  const loadLog = async () => {
    if (!user) return;
    const log = await DailyLogService.getDailyLog(user.id);
    if (log) {
      setEnergy(log.energy_level as EnergyLevel || null);
      setNotes(log.notes || '');
      setImagePreview(log.photo_url || null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await DailyLogService.saveDailyLog({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        energy_level: energy || undefined,
        notes,
        photo_url: imagePreview || undefined
      }, shareToFeed);

      onNavigate(AppView.SHARE);
    } catch (e) {
      console.error(e);
      alert(jt.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
        const publicUrl = await DailyLogService.uploadJournalPhoto(user.id, file);
        setImagePreview(publicUrl);
      } catch (e) {
        console.error("Upload failed", e);
      }
    }
  };

  const localeMap: Record<string, string> = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' };
  const todayDate = new Date().toLocaleDateString(localeMap[language] || 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  const energyOptions = [
    { key: 'low' as EnergyLevel, label: jt.low, icon: 'battery_low' },
    { key: 'medium' as EnergyLevel, label: jt.medium, icon: 'sentiment_neutral' },
    { key: 'good' as EnergyLevel, label: jt.good, icon: 'sentiment_satisfied' },
    { key: 'flow' as EnergyLevel, label: jt.flow, icon: 'bolt', special: true },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white animate-fade-in transition-colors duration-500">

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors duration-300">
        <button
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-nura-main dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-sm font-semibold tracking-widest uppercase text-center flex-1 text-nura-main dark:text-white opacity-90">{jt.title}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-end text-sm font-medium text-nura-petrol dark:text-primary hover:opacity-80 transition-colors">
          {saving ? jt.saving : jt.save}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pb-32 pt-4">

        {/* Date & Title */}
        <div className="flex flex-col items-center mb-10 animate-fade-in-up">
          <p className="text-nura-muted dark:text-gray-400 text-xs font-semibold tracking-widest uppercase mb-2 capitalize">{todayDate}</p>
          <h2 className="text-4xl font-light text-nura-main dark:text-white tracking-tight text-center leading-tight">
            <span className="font-normal text-nura-petrol dark:text-primary italic font-serif">{jt.myFlow}</span>
          </h2>
        </div>

        {/* Flow Status Card */}
        <div className="bg-white dark:bg-[#1a2630] rounded-2xl p-6 mb-10 shadow-sm border border-nura-border dark:border-gray-800 transition-colors animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-nura-muted dark:text-gray-500 uppercase tracking-widest">{jt.flowStatus}</span>
              <span className="text-xl font-medium text-nura-petrol dark:text-primary">{jt.inProgress}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-nura-muted dark:text-gray-400 text-right font-medium">{jt.keepLogging}</p>
        </div>

        {/* Energy Selector */}
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-nura-main dark:text-white text-lg font-medium mb-5 px-1 flex items-center gap-2">
            {jt.energyOfDay}
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800 ml-2"></span>
          </h3>
          <div className="flex justify-between items-center gap-3">
            {energyOptions.map((item) => {
              const isActive = energy === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setEnergy(item.key)}
                  className="group flex flex-col items-center gap-3 w-1/4 transition-all"
                >
                  <div className={`size-14 rounded-full flex items-center justify-center border transition-all duration-300 shadow-sm
                    ${item.special
                      ? isActive
                        ? 'bg-nura-petrol dark:bg-primary border-nura-petrol dark:border-primary text-white scale-110 shadow-lg'
                        : 'bg-white dark:bg-[#1a2630] border-nura-petrol/50 dark:border-primary/50 text-nura-petrol dark:text-primary hover:bg-nura-petrol hover:text-white dark:hover:bg-primary'
                      : isActive
                        ? 'bg-nura-petrol dark:bg-primary border-nura-petrol dark:border-primary text-white scale-105'
                        : 'bg-white dark:bg-[#1a2630] border-nura-border dark:border-gray-700 text-gray-400 hover:border-nura-petrol dark:hover:border-primary hover:text-nura-petrol dark:hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[26px]">{item.icon}</span>
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? 'text-nura-petrol dark:text-primary font-bold' : 'text-nura-muted dark:text-gray-500'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Record */}
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center mb-5 px-1">
            <h3 className="text-nura-main dark:text-white text-lg font-medium">{jt.visualRecord}</h3>
            <span className="text-[10px] uppercase tracking-wider text-nura-petrol dark:text-primary font-bold bg-nura-petrol/10 dark:bg-primary/10 px-3 py-1.5 rounded-full">Feed the Flow</span>
          </div>

          <label className={`relative block w-full aspect-[4/3] rounded-2xl border border-dashed hover:border-nura-petrol dark:hover:border-primary transition-all cursor-pointer group overflow-hidden bg-white dark:bg-[#1a2630] shadow-sm ${imagePreview ? 'border-transparent' : 'border-nura-border dark:border-gray-700 hover:bg-nura-petrol/5 dark:hover:bg-primary/5'}`}>
            <input
              accept="image/*"
              className="hidden"
              type="file"
              onChange={handleImageUpload}
            />

            {imagePreview ? (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imagePreview})` }}>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="material-symbols-outlined text-white text-4xl">edit</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 transition-opacity group-hover:opacity-90">
                <div className="size-16 rounded-full bg-nura-bg dark:bg-background-dark flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-nura-border dark:border-gray-800">
                  <span className="material-symbols-outlined text-nura-petrol dark:text-primary text-3xl font-light">add_a_photo</span>
                </div>
                <h1 className="text-xl font-serif italic text-nura-main dark:text-white mb-1">{jt.captureFlow}</h1>
                <p className="text-xs text-nura-muted dark:text-gray-500 max-w-[160px] leading-relaxed">{jt.captureFlowSub}</p>
              </div>
            )}
          </label>
        </div>

        {/* Notes */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-nura-main dark:text-white text-lg font-medium mb-3 px-1">{jt.notesOfDay}</h3>
          <div className="relative group">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-transparent text-nura-main dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-base leading-relaxed border-0 border-b border-nura-border dark:border-gray-700 focus:ring-0 focus:border-nura-petrol dark:focus:border-primary px-1 py-3 resize-none transition-colors"
              placeholder={jt.notesPlaceholder}
              rows={3}
            ></textarea>
            <div className="absolute bottom-0 left-0 w-0 h-px bg-nura-petrol dark:bg-primary transition-all duration-500 group-focus-within:w-full"></div>
          </div>
        </div>

        {/* Share Checkbox */}
        <div className="mb-6 animate-fade-in-up flex items-center gap-3 px-1" style={{ animationDelay: '0.45s' }}>
          <div
            onClick={() => setShareToFeed(!shareToFeed)}
            className={`size-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${shareToFeed ? 'bg-nura-petrol dark:bg-primary border-nura-petrol dark:border-primary' : 'border-nura-border dark:border-gray-600'}`}
          >
            {shareToFeed && <span className="material-symbols-outlined text-white text-sm">check</span>}
          </div>
          <label onClick={() => setShareToFeed(!shareToFeed)} className="text-nura-main dark:text-white text-sm cursor-pointer select-none">
            {jt.shareToCommunity}
          </label>
        </div>

      </main>

      {/* Footer Action */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-nura-bg via-nura-bg/95 to-transparent dark:from-background-dark dark:via-background-dark/95 pt-16 pb-8 px-6 pointer-events-none flex justify-center z-40">
        <div className="w-full max-w-md pointer-events-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-nura-petrol hover:brightness-110 dark:bg-primary dark:hover:brightness-110 active:scale-[0.98] text-white font-medium text-lg py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300"
          >
            {saving ? (
              <span className="animate-spin material-symbols-outlined">sync</span>
            ) : (
              <span className="material-symbols-outlined text-xl">ios_share</span>
            )}
            <span>{saving ? jt.saving : jt.saveJournal}</span>
          </button>
        </div>
      </div>

    </div>
  );
};