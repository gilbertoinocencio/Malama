// =====================================================
// Nura — Painel de Notificações do Paciente
// Notificações médicas: análise clínica, suporte, exames
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { X, Bell, Stethoscope, Clock, FileText, CheckCircle, ClipboardList } from 'lucide-react';
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

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  chat_opened:         { icon: <Stethoscope className="w-4 h-4" />,   color: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30' },
  chat_expiring:       { icon: <Clock className="w-4 h-4" />,         color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
  exam_reviewed:       { icon: <FileText className="w-4 h-4" />,      color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' },
  prescription_issued: { icon: <ClipboardList className="w-4 h-4" />, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/30' },
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
}

export const PatientNotificationCenter: React.FC<Props> = ({ onClose, onUnreadChange }) => {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchNotifications = useCallback(() => {
    supabase.rpc('get_patient_notifications', { p_limit: 40 })
      .then(
        ({ data }) => {
          const list = (data ?? []) as PatientNotification[];
          setNotifications(list);
          setLoading(false);
          onUnreadChange?.(list.filter(n => !n.is_read).length);
        },
        (e) => { console.error(e); setLoading(false); },
      );
  }, [onUnreadChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    setMarking(true);
    await supabase.rpc('mark_patient_notifications_read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    onUnreadChange?.(0);
    setMarking(false);
  };

  const unread = notifications.filter(n => !n.is_read).length;

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
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                {unread} nova{unread > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="flex items-center gap-1 text-xs text-Malama-petrol dark:text-primary hover:underline disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
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
            return (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 transition ${
                  !n.is_read ? 'bg-teal-50/40 dark:bg-teal-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
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
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
