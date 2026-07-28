// =====================================================
// Nura — Painel de Notificações do Paciente
// Notificações médicas: análise clínica, suporte, exames
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { X, Bell, Stethoscope, Clock, FileText, ClipboardList, RefreshCw, MessageSquare, CalendarClock } from 'lucide-react';
import { supabase } from '../services/supabase';

interface PatientNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

const CHAT_TYPES = new Set(['chat_opened', 'chat_message']);
const CONSULTA_TYPES = new Set(['consultation_reminder']);

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  chat_opened:                    { icon: <Stethoscope className="w-4 h-4" />,   color: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30' },
  chat_message:                   { icon: <MessageSquare className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30' },
  chat_expiring:                  { icon: <Clock className="w-4 h-4" />,         color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
  consultation_reminder:          { icon: <CalendarClock className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' },
  exam_reviewed:                  { icon: <FileText className="w-4 h-4" />,      color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' },
  prescription_issued:            { icon: <ClipboardList className="w-4 h-4" />, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/30' },
  appointment_reschedule_request: { icon: <RefreshCw className="w-4 h-4" />,     color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

interface Props {
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  onOpenChat?: (params: { consultationId: string; doctorName: string }) => void;
  onOpenConsultas?: () => void;
}

export const PatientNotificationCenter: React.FC<Props> = ({ onClose, onUnreadChange, onOpenChat, onOpenConsultas }) => {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(() => {
    supabase.rpc('get_patient_notifications', { p_limit: 40 })
      .then(
        ({ data }) => {
          const list = (data ?? []) as PatientNotification[];
          setNotifications(list.map(n => ({ ...n, is_read: true })));
          setLoading(false);
          onUnreadChange?.(0);
          // O builder do PostgREST implementa apenas `then` — não tem `catch`.
          // Encadear .catch lançava TypeError e, pior, a consulta é LAZY:
          // sem chamar .then a requisição nunca era enviada, então as
          // notificações jamais eram marcadas como lidas no servidor (o
          // contador voltava a aparecer no próximo carregamento).
          supabase.rpc('mark_patient_notifications_read').then(
            ({ error }) => { if (error) console.error(error); },
            (e) => console.error(e),
          );
        },
        (e) => { console.error(e); setLoading(false); },
      );
  }, [onUnreadChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (n: PatientNotification) => {
    // Lembrete de consulta → tela "Minhas Consultas" (onde fica o botão Entrar)
    if (CONSULTA_TYPES.has(n.type)) {
      onOpenConsultas?.();
      return;
    }
    if (!CHAT_TYPES.has(n.type)) return;
    const consultationId = n.data?.consultation_id as string | undefined;
    if (!consultationId) return;
    const doctorName = (n.data?.doctor_name as string | undefined) ?? 'Médico';
    onOpenChat?.({ consultationId, doctorName });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-4 top-20 z-50 w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[75vh] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-Malama-petrol dark:text-primary" />
            <span className="font-semibold text-gray-800 dark:text-white text-sm">Notificações</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Sem notificações médicas</p>
            </div>
          )}

          {!loading && notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? { icon: <Bell className="w-4 h-4" />, color: 'text-gray-600 bg-gray-100' };
            const isClickable = CONSULTA_TYPES.has(n.type) || (CHAT_TYPES.has(n.type) && !!n.data?.consultation_id);
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 transition ${
                  !n.is_read ? 'bg-teal-50/40 dark:bg-teal-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                } ${isClickable ? 'cursor-pointer active:bg-teal-50 dark:active:bg-teal-900/20' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5" />}
                  {isClickable && <span className="material-symbols-outlined text-[14px] text-gray-300">chevron_right</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
