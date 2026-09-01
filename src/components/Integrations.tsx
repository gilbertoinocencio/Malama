import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { IntegrationService } from '../services/integrationService';
import { HealthConnectService, isHCFailure } from '../services/healthConnectService';
import type { HCConnectResult } from '../services/healthConnectService';
import { AppleHealthService } from '../services/appleHealthService';
import type { FitnessService } from '../types';

interface IntegrationsProps {
  onBack: () => void;
}

type HCFailReason = Extract<HCConnectResult, { ok: false }>['reason'];

/** Traduz o motivo da falha em orientação para o usuário (+ detalhe técnico). */
function hcReasonMessage(reason: HCFailReason, detail?: string): string {
  const base: Record<HCFailReason, string> = {
    not_android: 'O Health Connect só está disponível no Android.',
    not_supported: 'Este aparelho não é compatível com o Health Connect.',
    provider_missing: 'Abra a Play Store e instale/atualize o app "Health Connect" (Google).',
    denied: 'Permissão não concedida. Abra o app Health Connect › Permissões de apps › Malama e permita o acesso.',
    error: 'Não foi possível abrir o Health Connect.',
  };
  return detail ? `${base[reason]}\n(${detail})` : base[reason];
}

interface IntegrationItem {
  id: FitnessService;
  name: string;
  icon: string;
  color: string;
  iconBg: string;
  darkIconBg: string;
}

// Strava, Garmin, Polar e Samsung Health saíram (decisão de produto,
// 01/09/2026): a cobertura de atividade física é só HealthKit/Health
// Connect agora — on-device, sem OAuth de terceiro.
const INTEGRATION_DEFS: IntegrationItem[] = [
  { id: 'apple_health', name: 'Apple Health',   icon: 'favorite',        color: 'text-Malama-main dark:text-white', iconBg: 'bg-Malama-bg',  darkIconBg: 'dark:bg-[#363330]' },
  { id: 'health_connect', name: 'Health Connect', icon: 'ecg_heart',     color: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50', darkIconBg: 'dark:bg-green-900/30' },
];

export const Integrations: React.FC<IntegrationsProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const ig = t.integrations;
  const { user } = useAuth();

  const [toggling, setToggling] = useState<string | null>(null);

  const isAndroid = Capacitor.getPlatform() === 'android';
  const isIOS = Capacitor.getPlatform() === 'ios';

  // As duas integrações que restam são on-device — estado de conexão vem do
  // aparelho em runtime, não de um flag no banco (não há mais OAuth de
  // terceiro para buscar via IntegrationService.getConnectedIntegrations).
  const [hcConnected, setHcConnected] = useState(false);
  const [ahConnected, setAhConnected] = useState(false);
  // Mensagem de falha ao conectar o Health Connect (orientação + diagnóstico).
  const [hcMessage, setHcMessage] = useState<string | null>(null);

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

  // As duas integrações que restam são on-device, então isto é só um
  // despacho por id — sem fallback genérico, porque não sobrou nenhum
  // serviço via OAuth/banco para cair nele.
  const isConnected = (id: FitnessService): boolean =>
    id === 'apple_health' ? ahConnected : hcConnected;

  const handleToggle = async (item: IntegrationItem) => {
    if (!user || toggling) return; // evitar double-tap

    setToggling(item.id);

    // Health Connect (Android): diálogo nativo de permissões (sem redirect OAuth).
    if (item.id === 'health_connect') {
      if (hcConnected) {
        await IntegrationService.disconnectService('health_connect', user.id);
        setHcConnected(false);
      } else {
        setHcMessage(null);
        const res = await HealthConnectService.requestPermissions();
        if (isHCFailure(res)) {
          setHcConnected(false);
          setHcMessage(hcReasonMessage(res.reason, res.detail));
        } else {
          setHcConnected(true);
        }
      }
    } else if (item.id === 'apple_health') {
      // Apple Health (iOS): diálogo nativo de permissões (sem redirect OAuth).
      if (ahConnected) {
        await IntegrationService.disconnectService('apple_health', user.id);
        setAhConnected(false);
      } else {
        const ok = await AppleHealthService.requestPermissions();
        setAhConnected(ok);
      }
    }

    setToggling(null);
  };

  const getStatusText = (item: IntegrationItem): string => {
    if (toggling === item.id) return '...';
    return isConnected(item.id) ? ig.connected : ig.disconnected;
  };

  const getStatusColor = (item: IntegrationItem): string =>
    isConnected(item.id)
      ? 'text-Malama-petrol dark:text-primary'
      : 'text-Malama-muted/70 dark:text-slate-600';

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
        {
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

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white dark:bg-surface-dark px-4 py-4 rounded-xl shadow-sm dark:shadow-none border border-Malama-border dark:border-white/5 transition-all hover:shadow-md"
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
                    </div>
                    <p className={`text-xs font-medium ${getStatusColor(item)}`}>{getStatusText(item)}</p>
                  </div>
                </div>

                {/* Toggle */}
                <div className="shrink-0">
                  <button
                    disabled={toggling === item.id}
                    onClick={() => handleToggle(item)}
                    aria-label={connected_ ? 'Desconectar' : 'Conectar'}
                    className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ease-in-out disabled:cursor-not-allowed ${connected_ ? 'justify-end bg-Malama-petrol dark:bg-primary' : 'justify-start bg-Malama-petrol/20 dark:bg-primary/20'}`}
                  >
                    <div className="h-[27px] w-[27px] rounded-full bg-white shadow-sm transform transition-transform duration-200" />
                  </button>
                </div>
              </div>
            );
          })
        }

        {/* Aviso de falha ao conectar o Health Connect */}
        {hcMessage && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-medium px-4 py-3 rounded-xl">
            <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
            <span className="whitespace-pre-line break-words">{hcMessage}</span>
          </div>
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
