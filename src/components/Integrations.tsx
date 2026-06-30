import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { IntegrationService } from '../services/integrationService';
import { HealthConnectService } from '../services/healthConnectService';
import { AppleHealthService } from '../services/appleHealthService';
import type { FitnessService, ConnectedIntegration } from '../types';

interface IntegrationsProps {
  onBack: () => void;
}

interface IntegrationItem {
  id: FitnessService;
  name: string;
  icon: string;
  color: string;
  iconBg: string;
  darkIconBg: string;
  /** Se true, o card é apenas UI — sem OAuth real */
  uiOnly?: boolean;
  /** Se true, mostra "Em breve" e desativa o toggle */
  comingSoon?: boolean;
}

const INTEGRATION_DEFS: IntegrationItem[] = [
  { id: 'strava',        name: 'Strava',         icon: 'directions_run',  color: 'text-[#FC4C02]',               iconBg: 'bg-[#FC4C02]/10',  darkIconBg: 'dark:bg-[#FC4C02]/20' },
  { id: 'apple_health', name: 'Apple Health',   icon: 'favorite',        color: 'text-Malama-main dark:text-white', iconBg: 'bg-Malama-bg',  darkIconBg: 'dark:bg-[#363330]' },
  { id: 'health_connect', name: 'Health Connect', icon: 'ecg_heart',     color: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50', darkIconBg: 'dark:bg-green-900/30' },
  { id: 'garmin',     name: 'Garmin',         icon: 'watch',           color: 'text-[#007cc3]',               iconBg: 'bg-blue-100',      darkIconBg: 'dark:bg-blue-800/30',  uiOnly: true },
  { id: 'polar',      name: 'Polar',          icon: 'monitor_heart',   color: 'text-[#E60012]',               iconBg: 'bg-red-50',        darkIconBg: 'dark:bg-red-900/20',   uiOnly: true },
  { id: 'samsung',    name: 'Samsung Health', icon: 'vital_signs',     color: 'text-[#1428a0] dark:text-indigo-400', iconBg: 'bg-indigo-50', darkIconBg: 'dark:bg-indigo-900/20', uiOnly: true },
];

export const Integrations: React.FC<IntegrationsProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const ig = t.integrations;
  const { user } = useAuth();

  // Mapa service → is_connected (derivado do banco)
  const [connected, setConnected] = useState<Partial<Record<FitnessService, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const isAndroid = Capacitor.getPlatform() === 'android';
  const isIOS = Capacitor.getPlatform() === 'ios';

  // Health Connect (Android) e Apple Health (iOS) são on-device — estado de
  // conexão vem do aparelho em runtime, não de um flag no banco.
  const [hcConnected, setHcConnected] = useState(false);
  const [ahConnected, setAhConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    IntegrationService.getConnectedIntegrations(user.id)
      .then((rows: ConnectedIntegration[]) => {
        const map: Partial<Record<FitnessService, boolean>> = {};
        rows.forEach(r => { map[r.service] = r.is_connected; });
        setConnected(map);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!isAndroid) return;
    HealthConnectService.getStatus()
      .then(s => setHcConnected(s.connected))
      .catch(() => {});
  }, [isAndroid]);

  useEffect(() => {
    if (!isIOS) return;
    AppleHealthService.getStatus()
      .then(s => setAhConnected(s.connected))
      .catch(() => {});
  }, [isIOS]);

  const isConnected = (id: FitnessService): boolean => {
    if (id === 'apple_health') return ahConnected;
    if (id === 'health_connect') return hcConnected;
    return connected[id] ?? false;
  };

  const handleToggle = async (item: IntegrationItem) => {
    if (!user || item.comingSoon || item.uiOnly) return;
    if (toggling) return; // evitar double-tap

    const service = item.id;
    setToggling(item.id);

    // Health Connect (Android): diálogo nativo de permissões (sem redirect OAuth).
    if (item.id === 'health_connect') {
      if (hcConnected) {
        await IntegrationService.disconnectService('health_connect', user.id);
        setHcConnected(false);
      } else {
        const ok = await HealthConnectService.requestPermissions();
        setHcConnected(ok);
      }
      setToggling(null);
      return;
    }

    // Apple Health (iOS): diálogo nativo de permissões (sem redirect OAuth).
    if (item.id === 'apple_health') {
      if (ahConnected) {
        await IntegrationService.disconnectService('apple_health', user.id);
        setAhConnected(false);
      } else {
        const ok = await AppleHealthService.requestPermissions();
        setAhConnected(ok);
      }
      setToggling(null);
      return;
    }

    if (isConnected(item.id)) {
      // Desconectar
      await IntegrationService.disconnectService(service, user.id);
      setConnected(prev => ({ ...prev, [service]: false }));
    } else {
      // Iniciar OAuth — o usuário será redirecionado
      IntegrationService.initiateOAuth(service as 'strava');
      // A função redirect não retorna; o estado será atualizado ao voltar do OAuth
    }

    setToggling(null);
  };

  const getStatusText = (item: IntegrationItem): string => {
    if (item.comingSoon) return 'Em breve';
    if (item.uiOnly)     return ig.disconnected;
    if (toggling === item.id) return '...';
    return isConnected(item.id) ? ig.connected : ig.disconnected;
  };

  const getStatusColor = (item: IntegrationItem): string => {
    if (item.comingSoon || item.uiOnly) return 'text-Malama-muted/70 dark:text-slate-600';
    return isConnected(item.id)
      ? 'text-Malama-petrol dark:text-primary'
      : 'text-Malama-muted/70 dark:text-slate-600';
  };

  const renderHeadline = (text: string) => {
    const parts = text.split(/<accent>(.*?)<\/accent>/);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <span key={i} className="text-Malama-petrol dark:text-primary">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-sm bg-Malama-bg dark:bg-background-dark font-display animate-fade-in transition-colors duration-300">

      {/* Top App Bar */}
      <div className="flex items-center px-4 py-3 justify-between sticky top-0 z-10 bg-Malama-bg/90 dark:bg-background-dark/90 backdrop-blur-sm transition-colors">
        <button
          onClick={onBack}
          className="text-Malama-main dark:text-white flex size-10 shrink-0 items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        </button>
        <h2 className="text-Malama-main dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">{ig.title}</h2>
      </div>

      {/* Headline */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-Malama-main dark:text-white text-[32px] font-bold leading-[1.2] tracking-tight">
          {renderHeadline(ig.headline)}
        </h1>
        <p className="mt-3 text-Malama-muted dark:text-slate-400 text-sm font-medium leading-relaxed">{ig.subtitle}</p>
      </div>

      {/* Integration List */}
      <div className="flex-1 px-4 pb-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-Malama-petrol dark:border-primary" />
          </div>
        ) : (
          INTEGRATION_DEFS
            // Health Connect só no Android; Apple Health só no iOS.
            // Cada um some na plataforma onde não funciona.
            .filter((item) => {
              if (item.id === 'health_connect') return isAndroid;
              if (item.id === 'apple_health') return isIOS;
              return true;
            })
            .map((item) => {
            const connected_ = isConnected(item.id);
            const disabled = item.comingSoon || item.uiOnly;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 bg-white dark:bg-surface-dark px-4 py-4 rounded-xl shadow-sm dark:shadow-none border border-Malama-border dark:border-white/5 transition-all ${disabled ? 'opacity-50' : 'hover:shadow-md'}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`flex items-center justify-center rounded-xl shrink-0 size-12 ${item.iconBg} ${item.darkIconBg} ${item.color}`}>
                    <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <p className="text-Malama-main dark:text-white text-base font-semibold leading-normal">{item.name}</p>
                      {item.id === 'apple_health' && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-Malama-muted/15 dark:bg-white/10 text-Malama-muted dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                          iOS
                        </span>
                      )}
                      {item.comingSoon && item.id !== 'apple_health' && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-Malama-muted/15 dark:bg-white/10 text-Malama-muted dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                          Em breve
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${getStatusColor(item)}`}>{getStatusText(item)}</p>
                  </div>
                </div>

                {/* Toggle */}
                <div className="shrink-0">
                  {item.comingSoon ? (
                    /* Apple Health — sem toggle, apenas badge */
                    <span className="text-xs font-semibold text-Malama-muted dark:text-slate-500 bg-Malama-bg dark:bg-white/5 px-2 py-1 rounded-lg border border-Malama-border dark:border-white/10">
                      Em breve
                    </span>
                  ) : (
                    <button
                      disabled={!!disabled || toggling === item.id}
                      onClick={() => handleToggle(item)}
                      aria-label={connected_ ? 'Desconectar' : 'Conectar'}
                      className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ease-in-out disabled:cursor-not-allowed ${connected_ ? 'justify-end bg-Malama-petrol dark:bg-primary' : 'justify-start bg-Malama-petrol/20 dark:bg-primary/20'}`}
                    >
                      <div className="h-[27px] w-[27px] rounded-full bg-white shadow-sm transform transition-transform duration-200" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Note */}
      <div className="px-6 pb-8 text-center mt-auto">
        <div className="flex items-center justify-center gap-2 text-Malama-muted dark:text-slate-500 text-xs font-medium bg-white dark:bg-surface-dark p-3 rounded-lg mx-auto w-fit shadow-sm border border-Malama-border dark:border-white/5">
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
          <span>{ig.securityNote}</span>
        </div>
      </div>

    </div>
  );
};
