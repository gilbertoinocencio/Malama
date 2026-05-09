import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, CheckCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getNotifications,
  markNotificationsRead,
  type CommunityNotification,
} from '../../../services/communityService';
import { AppView } from '../../../types';
import { NotificationItem } from './NotificationItem';
import { NotificationPreferencesSheet } from './NotificationPreferencesSheet';

interface NotificationCenterProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  onOpenPost?: (postId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onBack, onOpenPost }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    if (!user) return;
    const c = reset ? null : cursor;
    const result = await getNotifications(user.id, c);
    if (reset) setNotifications(result.notifications);
    else setNotifications(prev => [...prev, ...result.notifications]);
    setCursor(result.nextCursor);
    setHasMore(result.nextCursor !== null);
    setLoading(false);
    setLoadingMore(false);
  }, [user, cursor]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    markNotificationsRead(user.id);
  }, [user]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true);
        load(false);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, load]);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-white dark:bg-background-dark"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-background-dark z-10">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Notificações</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { markNotificationsRead(user.id); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); }}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Marcar tudo como lido"
          >
            <CheckCheck size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => setPrefsOpen(true)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-Malama-dark animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-3">🔔</span>
            <p className="text-gray-400 text-sm">Nenhuma notificação ainda.</p>
          </div>
        ) : (
          <>
            {notifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => {
                  if (n.post_id && onOpenPost) {
                    markNotificationsRead(user.id, [n.id]);
                    onOpenPost(n.post_id);
                  }
                }}
              />
            ))}
            <div ref={loaderRef} className="h-8 flex items-center justify-center">
              {loadingMore && <div className="w-5 h-5 border-2 border-[#2ECC71] border-t-transparent rounded-full animate-spin" />}
            </div>
          </>
        )}
      </div>

      {prefsOpen && user && (
        <NotificationPreferencesSheet userId={user.id} onClose={() => setPrefsOpen(false)} />
      )}
    </motion.div>
  );
};
