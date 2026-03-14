import React, { useState } from 'react';
import { useLanguage } from '../i18n';

interface IntegrationsProps {
  onBack: () => void;
}

interface IntegrationItem {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'pending' | 'disconnected';
  color: string;
  iconBg: string;
  darkIconBg: string;
  opacity?: string;
}

export const Integrations: React.FC<IntegrationsProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const ig = t.integrations;

  const [items, setItems] = useState<IntegrationItem[]>([
    { id: 'strava', name: 'Strava', icon: 'directions_run', status: 'connected', color: 'text-[#FC4C02]', iconBg: 'bg-[#FC4C02]/10', darkIconBg: 'dark:bg-[#FC4C02]/20' },
    { id: 'apple', name: 'Apple Health', icon: 'favorite', status: 'pending', color: 'text-nura-main dark:text-white', iconBg: 'bg-nura-bg', darkIconBg: 'dark:bg-gray-700' },
    { id: 'google', name: 'Google Health', icon: 'health_and_safety', status: 'disconnected', color: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50', darkIconBg: 'dark:bg-blue-900/30' },
    { id: 'garmin', name: 'Garmin', icon: 'watch', status: 'connected', color: 'text-[#007cc3]', iconBg: 'bg-blue-100', darkIconBg: 'dark:bg-blue-800/30' },
    { id: 'polar', name: 'Polar', icon: 'monitor_heart', status: 'disconnected', color: 'text-[#E60012]', iconBg: 'bg-red-50', darkIconBg: 'dark:bg-red-900/20' },
    { id: 'samsung', name: 'Samsung Health', icon: 'vital_signs', status: 'disconnected', color: 'text-[#1428a0] dark:text-indigo-400', iconBg: 'bg-indigo-50', darkIconBg: 'dark:bg-indigo-900/20', opacity: 'opacity-80' },
  ]);

  const toggleStatus = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, status: item.status === 'connected' ? 'disconnected' : 'connected' }
        : item
    ));
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return ig.connected;
      case 'pending': return ig.pending;
      case 'disconnected': return ig.disconnected;
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-nura-petrol dark:text-primary';
      case 'pending': return 'text-nura-muted dark:text-slate-400';
      case 'disconnected': return 'text-nura-muted/70 dark:text-slate-600';
      default: return '';
    }
  };

  // Parse headline with <accent> tags
  const renderHeadline = (text: string) => {
    const parts = text.split(/<accent>(.*?)<\/accent>/);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <span key={i} className="text-nura-petrol dark:text-primary">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-sm bg-nura-bg dark:bg-background-dark font-display animate-fade-in transition-colors duration-300">

      {/* Top App Bar */}
      <div className="flex items-center px-4 py-3 justify-between sticky top-0 z-10 bg-nura-bg/90 dark:bg-background-dark/90 backdrop-blur-sm transition-colors">
        <button
          onClick={onBack}
          className="text-nura-main dark:text-white flex size-10 shrink-0 items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        </button>
        <h2 className="text-nura-main dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">{ig.title}</h2>
      </div>

      {/* Headline */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-nura-main dark:text-white text-[32px] font-bold leading-[1.2] tracking-tight">
          {renderHeadline(ig.headline)}
        </h1>
        <p className="mt-3 text-nura-muted dark:text-slate-400 text-sm font-medium leading-relaxed">{ig.subtitle}</p>
      </div>

      {/* Integration List */}
      <div className="flex-1 px-4 pb-8 space-y-4">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-4 bg-white dark:bg-[#1a2630] px-4 py-4 rounded-xl shadow-sm dark:shadow-none border border-nura-border dark:border-white/5 transition-all hover:shadow-md ${item.opacity || ''}`}>
            <div className="flex items-center gap-4 flex-1">
              <div className={`flex items-center justify-center rounded-xl shrink-0 size-12 ${item.iconBg} ${item.darkIconBg} ${item.color}`}>
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              <div className="flex flex-col">
                <p className="text-nura-main dark:text-white text-base font-semibold leading-normal">{item.name}</p>
                <p className={`text-xs font-medium ${getStatusColor(item.status)}`}>{getStatusText(item.status)}</p>
              </div>
            </div>
            <div className="shrink-0">
              <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ease-in-out ${item.status === 'connected' ? 'justify-end bg-nura-petrol dark:bg-primary' : 'justify-start bg-nura-petrol/20 dark:bg-primary/20'}`}>
                <input type="checkbox" className="invisible absolute" checked={item.status === 'connected'} onChange={() => toggleStatus(item.id)} />
                <div className="h-[27px] w-[27px] rounded-full bg-white shadow-sm transform transition-transform duration-200"></div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="px-6 pb-8 text-center mt-auto">
        <div className="flex items-center justify-center gap-2 text-nura-muted dark:text-slate-500 text-xs font-medium bg-white dark:bg-[#1a2630] p-3 rounded-lg mx-auto w-fit shadow-sm border border-nura-border dark:border-white/5">
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
          <span>{ig.securityNote}</span>
        </div>
      </div>

    </div>
  );
};