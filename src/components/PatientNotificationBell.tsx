// =====================================================
// Nura — Sino de Notificações do Paciente
// Badge realtime + abre PatientNotificationCenter
// =====================================================

import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { PatientNotificationCenter } from './PatientNotificationCenter';

interface Props {
  userId: string;
  isDarkMode: boolean;
  onOpenChat?: (params: { consultationId: string; doctorName: string }) => void;
}

export const PatientNotificationBell: React.FC<Props> = ({ userId, isDarkMode, onOpenChat }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('patient_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));

    const channel = supabase
      .channel(`patient-notifs-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'patient_notifications',
        filter: `user_id=eq.${userId}`,
      }, () => setUnreadCount(c => c + 1))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark border border-Malama-border dark:border-transparent hover:bg-Malama-petrol-light dark:hover:bg-primary/10 transition-colors text-Malama-petrol dark:text-primary shadow-sm dark:shadow-none"
        title="Notificações médicas"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 border border-white dark:border-background-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <PatientNotificationCenter
          onClose={() => setOpen(false)}
          onUnreadChange={setUnreadCount}
          onOpenChat={(params) => {
            setOpen(false);
            onOpenChat?.(params);
          }}
        />
      )}
    </>
  );
};
