import React from 'react';
import { MessageCircle, Heart, UserPlus, Trophy, Star, Stethoscope } from 'lucide-react';
import type { CommunityNotification, NotificationType } from '../../../services/communityService';
import { formatDistanceToNow } from '../../../utils/dateUtils';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  comment:          <MessageCircle size={16} className="text-blue-500" />,
  reply:            <MessageCircle size={16} className="text-purple-500" />,
  reaction:         <Heart size={16} className="text-red-500" />,
  milestone:        <Trophy size={16} className="text-yellow-500" />,
  spotlight:        <Star size={16} className="text-orange-400" />,
  new_follower:     <UserPlus size={16} className="text-[#2ECC71]" />,
  doctor_broadcast: <Stethoscope size={16} className="text-teal-500" />,
  badge_earned:     <Trophy size={16} className="text-yellow-500" />,
};

const TYPE_LABEL: Record<NotificationType, (n: CommunityNotification) => string> = {
  comment:          n => `${n.actor?.display_name ?? 'Alguém'} comentou no seu post.`,
  reply:            n => `${n.actor?.display_name ?? 'Alguém'} respondeu seu comentário.`,
  reaction:         n => `${n.actor?.display_name ?? 'Alguém'} reagiu ao seu post.`,
  milestone:        n => (n.data?.removed ? 'Seu post foi removido por violar as diretrizes.' : 'Você conquistou um novo marco! 🎉'),
  spotlight:        () => 'Seu post foi o destaque da semana! 🏆',
  new_follower:     n => `${n.actor?.display_name ?? 'Alguém'} começou a te seguir.`,
  doctor_broadcast: n => (n.data?.message as string) ?? 'Mensagem da equipe médica.',
  badge_earned:     n => `Você ganhou o badge ${n.data?.badge_code ?? ''}! 🏅`,
};

interface NotificationItemProps {
  notification: CommunityNotification;
  onClick?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
      !notification.is_read ? 'bg-[#2ECC71]/5 dark:bg-[#2ECC71]/5' : ''
    }`}
  >
    {/* Avatar ou ícone de tipo */}
    <div className="relative shrink-0">
      {notification.actor?.avatar_url ? (
        <img src={notification.actor.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-sm">
          {notification.actor?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full
        flex items-center justify-center border border-gray-100 dark:border-gray-800">
        {TYPE_ICON[notification.type]}
      </div>
    </div>

    {/* Texto */}
    <div className="flex-1 text-left">
      <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        {TYPE_LABEL[notification.type](notification)}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        {formatDistanceToNow(new Date(notification.created_at))}
      </p>
    </div>

    {!notification.is_read && (
      <div className="w-2 h-2 bg-[#2ECC71] rounded-full shrink-0 mt-1.5" />
    )}
  </button>
);
