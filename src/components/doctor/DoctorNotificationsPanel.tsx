// =====================================================
// Malama — Painel de Notificações do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Bell, MessageSquare, FileText, AlertTriangle,
  Clock, Shield, CheckCircle
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface DoctorNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  patient_id: string | null;
  data: Record<string, unknown>;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  chat_message:  { icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  chat_opened:   { icon: <MessageSquare className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  sla_risk:      { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600 bg-red-50' },
  chat_expiring: { icon: <Clock className="w-4 h-4" />,         color: 'text-amber-600 bg-amber-50' },
  ai_alert:      { icon: <Shield className="w-4 h-4" />,        color: 'text-purple-600 bg-purple-50' },
  exam_uploaded: { icon: <FileText className="w-4 h-4" />,      color: 'text-teal-600 bg-teal-50' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

interface Props {
  onClose: () => void;
}

// Mapeia tipo de notificação → aba de destino no perfil do paciente
const NOTIFICATION_TAB: Record<string, string> = {
  chat_message:  'chat',
  chat_opened:   'chat',
  sla_risk:      'chat',
  chat_expiring: 'chat',
  exam_uploaded: 'exams',
  ai_alert:      'briefing',
};

export const DoctorNotificationsPanel: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchNotifications = () => {
    supabase.rpc('get_doctor_notifications', { p_limit: 40 })
      .then(
        ({ data }) => { setNotifications((data ?? []) as DoctorNotification[]); setLoading(false); },
        (e) => { console.error(e); setLoading(false); },
      );
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime: re-busca quando uma nova notificação chega para o médico
    // doctor_notifications.doctor_id é o PK da tabela doctors (não auth.uid())
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: doc } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle();
      if (!doc) return;
      channel = supabase
        .channel(`doctor-notifs-${doc.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'doctor_notifications',
          filter: `doctor_id=eq.${doc.id}`,
        }, () => { fetchNotifications(); })
        .subscribe();
    });

    return () => { channel?.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = async () => {
    setMarking(true);
    await supabase.rpc('mark_doctor_notifications_read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setMarking(false);
  };

  const unread = notifications.filter(n => !n.is_read).length;

  const handleClick = async (n: DoctorNotification) => {
    // Marca como lida imediatamente (otimista)
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    supabase.from('doctor_notifications').update({ is_read: true }).eq('id', n.id);

    // patient_id é coluna top-level na tabela doctor_notifications
    const patientId = n.patient_id;
    if (!patientId) { onClose(); return; }

    const tab = NOTIFICATION_TAB[n.type];
    const chatId = n.data?.chat_id as string | undefined;
    let path = tab
      ? `/medico/paciente/${patientId}?tab=${tab}`
      : `/medico/paciente/${patientId}`;
    if (tab === 'chat' && chatId) path += `&chatId=${chatId}`;

    onClose();
    navigate(path);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-4 top-16 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#7d4a3c]" />
            <span className="font-semibold text-gray-800 text-sm">Notificações</span>
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
                className="flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">Sem notificações</p>
            </div>
          )}

          {!loading && notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? { icon: <Bell className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50' };
            const isActionable = !!(n.data?.patient_id ?? n.data?.patientId);
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex gap-3 px-4 py-3 border-b border-gray-50 transition ${
                  !n.is_read ? 'bg-blue-50/40' : 'bg-white'
                } ${isActionable ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold text-gray-800 ${!n.is_read ? 'text-gray-900' : ''}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
