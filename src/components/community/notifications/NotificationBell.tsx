import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { AppView } from '../../../types';

interface NotificationBellProps {
  userId: string;
  onNavigate: (view: AppView) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId, onNavigate }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('community_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };

    fetchCount();

    // Realtime subscription
    const channel = supabase
      .channel(`notif_bell_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_notifications',
        filter: `recipient_id=eq.${userId}`,
      }, () => { setUnreadCount(c => c + 1); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <button
      onClick={() => { onNavigate(AppView.NOTIFICATION_CENTER); setUnreadCount(0); }}
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <Bell size={18} className="text-gray-500" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px]
          font-bold rounded-full flex items-center justify-center px-0.5">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
