import React from 'react';
import { Search } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { AppView } from '../../../types';

interface FeedHeaderProps {
  mode: 'all' | 'following';
  onModeChange: (mode: 'all' | 'following') => void;
  onNavigate: (view: AppView) => void;
  userId: string;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({ mode, onModeChange, onNavigate, userId }) => (
  <div className="sticky top-0 z-20 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-white/10">
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-lg font-bold text-gray-900 dark:text-white">Comunidade</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate(AppView.COMMUNITY_SEARCH)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Search size={18} className="text-gray-500" />
        </button>
        <NotificationBell userId={userId} onNavigate={onNavigate} />
      </div>
    </div>
    <div className="flex px-4 pb-2 gap-1">
      <button
        onClick={() => onModeChange('all')}
        className={`text-sm font-medium px-4 py-1.5 rounded-full transition-all ${
          mode === 'all'
            ? 'bg-Malama-petrol text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        Todos
      </button>
      <button
        onClick={() => onModeChange('following')}
        className={`text-sm font-medium px-4 py-1.5 rounded-full transition-all ${
          mode === 'following'
            ? 'bg-Malama-petrol text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        Seguindo
      </button>
    </div>
  </div>
);
