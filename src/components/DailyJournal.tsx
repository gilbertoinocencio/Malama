import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { DailyLogService } from '../services/dailyLogService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { getLocalDateString } from '../utils/dateUtils';

interface DailyJournalProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

type EnergyLevel = 'Baixa' | 'Média' | 'Boa' | 'Flow';

export const DailyJournal: React.FC<DailyJournalProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [pastLogs, setPastLogs] = useState<import('../services/dailyLogService').DailyLogData[]>([]);

  const jt = t.journal;

  useEffect(() => {
    if (user) loadLog();
  }, [user]);

  const loadLog = async () => {
    if (!user) return;
    const [log, s, recent] = await Promise.all([
      DailyLogService.getDailyLog(user.id),
      DailyLogService.getStreak(user.id),
      DailyLogService.getRecentLogs(user.id),
    ]);
    if (log) {
      setEnergy(log.energy_level as EnergyLevel || null);
      setNotes(log.notes || '');
      setImagePreview(log.photo_url || null);
    }
    setStreak(s);
    const today = new Date().toISOString().split('T')[0];
    setPastLogs(recent.filter(l => l.date !== today));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await DailyLogService.saveDailyLog({
        user_id: user.id,
        date: getLocalDateString(),
        energy_level: energy || undefined,
        notes,
        photo_url: imagePreview || undefined
      }, shareToFeed);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await loadLog();
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

  const flowStatusConfig = (() => {
    const d = streak.toString();
    if (streak === 0)  return { label: jt.starting,      color: 'text-gray-400',                        incentive: jt.startFirst };
    if (streak <= 7)   return { label: jt.starting,      color: 'text-gray-400',                        incentive: jt.keepLogging };
    if (streak <= 21)  return { label: jt.inProgress,    color: 'text-Malama-petrol dark:text-primary', incentive: jt.inProgressIncentive.replace('{days}', d) };
    if (streak <= 35)  return { label: jt.gainingRhythm, color: 'text-amber-500',                       incentive: jt.gainingRhythmIncentive.replace('{days}', d) };
    if (streak <= 49)  return { label: jt.consistent,    color: 'text-emerald-500',                     incentive: jt.consistentIncentive.replace('{days}', d) };
    if (streak <= 63)  return { label: jt.inFlow,        color: 'text-blue-400',                        incentive: jt.inFlowIncentive.replace('{days}', d) };
    return               { label: jt.totalFlow,          color: 'text-purple-400',                      incentive: jt.totalFlowIncentive.replace('{days}', d) };
  })();

  const localeMap: Record<string, string> = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' };
  const todayDate = new Date().toLocaleDateString(localeMap[language] || 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  const energyOptions = [
    { key: 'Baixa' as EnergyLevel, label: jt.low, icon: 'battery_low' },
    { key: 'Média' as EnergyLevel, label: jt.medium, icon: 'sentiment_neutral' },
    { key: 'Boa' as EnergyLevel, label: jt.good, icon: 'sentiment_satisfied' },
    { key: 'Flow' as EnergyLevel, label: jt.flow, icon: 'bolt', special: true },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-Malama-bg dark:bg-background-dark font-display text-Malama-main dark:text-white animate-fade-in transition-colors duration-500">

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-Malama-bg/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors duration-300">
        <button
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-Malama-main dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-sm font-semibold tracking-widest uppercase text-center flex-1 text-Malama-main dark:text-white opacity-90">{jt.title}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-end text-sm font-medium text-Malama-petrol dark:text-primary hover:opacity-80 transition-colors">
          {saving ? jt.saving : jt.save}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pb-32 pt-4">

        {/* Date & Title */}
        <div className="flex flex-col items-center mb-10 animate-fade-in-up">
          <p className="text-Malama-muted dark:text-gray-400 text-xs font-semibold tracking-widest uppercase mb-2 capitalize">{todayDate}</p>
          <h2 className="text-4xl font-light text-Malama-main dark:text-white tracking-tight text-center leading-tight">
            <span className="font-normal text-Malama-petrol dark:text-primary italic font-serif">{jt.myFlow}</span>
          </h2>
        </div>

        {/* Flow Status Card */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 mb-10 shadow-sm border border-Malama-border dark:border-white/10 transition-colors animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-Malama-muted dark:text-gray-500 uppercase tracking-widest">{jt.flowStatus}</span>
              <span className={`text-xl font-medium ${flowStatusConfig.color}`}>{flowStatusConfig.label}</span>
            </div>
            {streak > 0 && (
              <span className="text-2xl font-light text-Malama-muted dark:text-gray-500">
                {streak}<span className="text-xs ml-0.5">🔥</span>
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-Malama-muted dark:text-gray-400 text-right font-medium">{flowStatusConfig.incentive}</p>
        </div>

        {/* Energy Selector */}
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-Malama-main dark:text-white text-lg font-medium mb-5 px-1 flex items-center gap-2">
            {jt.energyOfDay}
            <span className="h-px flex-1 bg-gray-200 dark:bg-Malama-dark ml-2"></span>
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
                        ? 'bg-Malama-petrol dark:bg-primary border-Malama-petrol dark:border-primary text-white scale-110 shadow-lg'
                        : 'bg-white dark:bg-surface-dark border-Malama-petrol/50 dark:border-primary/50 text-Malama-petrol dark:text-primary hover:bg-Malama-petrol hover:text-white dark:hover:bg-primary'
                      : isActive
                        ? 'bg-Malama-petrol dark:bg-primary border-Malama-petrol dark:border-primary text-white scale-105'
                        : 'bg-white dark:bg-surface-dark border-Malama-border dark:border-white/10 text-gray-400 hover:border-Malama-petrol dark:hover:border-primary hover:text-Malama-petrol dark:hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[26px]">{item.icon}</span>
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? 'text-Malama-petrol dark:text-primary font-bold' : 'text-Malama-muted dark:text-gray-500'}`}>
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
            <h3 className="text-Malama-main dark:text-white text-lg font-medium">{jt.visualRecord}</h3>
            <span className="text-[10px] uppercase tracking-wider text-Malama-petrol dark:text-primary font-bold bg-Malama-petrol/10 dark:bg-primary/10 px-3 py-1.5 rounded-full">Feed the Flow</span>
          </div>

          <label className={`relative block w-full aspect-[4/3] rounded-2xl border border-dashed hover:border-Malama-petrol dark:hover:border-primary transition-all cursor-pointer group overflow-hidden bg-white dark:bg-surface-dark shadow-sm ${imagePreview ? 'border-transparent' : 'border-Malama-border dark:border-white/10 hover:bg-Malama-petrol/5 dark:hover:bg-primary/5'}`}>
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
                <div className="size-16 rounded-full bg-Malama-bg dark:bg-background-dark flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-Malama-border dark:border-white/10">
                  <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-3xl font-light">add_a_photo</span>
                </div>
                <h1 className="text-xl font-serif italic text-Malama-main dark:text-white mb-1">{jt.captureFlow}</h1>
                <p className="text-xs text-Malama-muted dark:text-gray-500 max-w-[160px] leading-relaxed">{jt.captureFlowSub}</p>
              </div>
            )}
          </label>
        </div>

        {/* Notes */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-Malama-main dark:text-white text-lg font-medium mb-3 px-1">{jt.notesOfDay}</h3>
          <div className="relative group">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-transparent text-Malama-main dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-base leading-relaxed border-0 border-b border-Malama-border dark:border-white/10 focus:ring-0 focus:border-Malama-petrol dark:focus:border-primary px-1 py-3 resize-none transition-colors"
              placeholder={jt.notesPlaceholder}
              rows={3}
            ></textarea>
            <div className="absolute bottom-0 left-0 w-0 h-px bg-Malama-petrol dark:bg-primary transition-all duration-500 group-focus-within:w-full"></div>
          </div>
        </div>

        {/* Share Checkbox */}
        <div className="mb-6 animate-fade-in-up flex items-center gap-3 px-1" style={{ animationDelay: '0.45s' }}>
          <div
            onClick={() => setShareToFeed(!shareToFeed)}
            className={`size-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${shareToFeed ? 'bg-Malama-petrol dark:bg-primary border-Malama-petrol dark:border-primary' : 'border-Malama-border dark:border-white/10'}`}
          >
            {shareToFeed && <span className="material-symbols-outlined text-white text-sm">check</span>}
          </div>
          <label onClick={() => setShareToFeed(!shareToFeed)} className="text-Malama-main dark:text-white text-sm cursor-pointer select-none">
            {jt.shareToCommunity}
          </label>
        </div>

        {/* Past Notes */}
        <div className="mb-36 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-Malama-main dark:text-white text-lg font-medium mb-5 px-1 flex items-center gap-2">
            {jt.pastNotes}
            <span className="h-px flex-1 bg-gray-200 dark:bg-Malama-dark ml-2"></span>
          </h3>
          {pastLogs.length === 0 ? (
            <p className="text-Malama-muted dark:text-gray-500 text-sm px-1">{jt.noPastNotes}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {pastLogs.map((log) => {
                const d = new Date(log.date + 'T12:00:00');
                const dateLabel = d.toLocaleDateString(localeMap[language] || 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                const energyColors: Record<string, string> = {
                  'Baixa': 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
                  'Média': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                  'Boa': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                  'Flow': 'bg-Malama-petrol/10 dark:bg-primary/10 text-Malama-petrol dark:text-primary',
                };
                const energyClass = log.energy_level ? (energyColors[log.energy_level] || '') : '';
                return (
                  <div key={log.id} className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-Malama-border dark:border-white/10 flex gap-3">
                    {log.photo_url && (
                      <div className="shrink-0 size-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img src={log.photo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-Malama-muted dark:text-gray-500 capitalize">{dateLabel}</span>
                        {log.energy_level && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${energyClass}`}>{log.energy_level}</span>
                        )}
                      </div>
                      <p className="text-sm text-Malama-main dark:text-white leading-relaxed line-clamp-3">{log.notes}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Footer Action */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-Malama-bg via-Malama-bg/95 to-transparent dark:from-background-dark dark:via-background-dark/95 pt-16 pb-8 px-6 pointer-events-none flex justify-center z-40">
        <div className="w-full max-w-md pointer-events-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-Malama-petrol hover:brightness-110 dark:bg-primary dark:hover:brightness-110 active:scale-[0.98] text-white font-medium text-lg py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300"
          >
            {saving ? (
              <span className="animate-spin material-symbols-outlined">sync</span>
            ) : saved ? (
              <span className="material-symbols-outlined text-xl">check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-xl">save</span>
            )}
            <span>{saving ? jt.saving : saved ? jt.save : jt.saveJournal}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
