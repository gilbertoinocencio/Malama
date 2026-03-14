import React from 'react';
import { AppView } from '../types';
import { useLanguage } from '../i18n';

interface BottomNavigationProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onFabClick: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeView,
  onNavigate,
  onFabClick
}) => {
  const { t } = useLanguage();

  const navItems = [
    { view: AppView.HOME, icon: 'home', label: t.nav.home, filled: true },
    { view: AppView.FOOD_GUIDE, icon: 'restaurant', label: t.nav.nutri, filled: true },
    { view: 'FAB', icon: 'add', label: '' },
    { view: AppView.PLAN, icon: 'bar_chart', label: t.nav.data, filled: false },
    { view: AppView.PROFILE, icon: 'person', label: t.nav.profile, filled: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#101e22]/90 backdrop-blur-md border-t border-nura-border dark:border-white/5 pb-6 pt-2 px-6 z-40 transition-colors duration-300 max-w-md mx-auto left-0 right-0">
      <ul className="flex justify-between items-end h-12">
        {navItems.map((item, index) => {
          if (item.view === 'FAB') {
            return (
              <li key={index} className="relative -top-5">
                <button
                  onClick={onFabClick}
                  className="flex items-center justify-center size-14 bg-nura-petrol dark:bg-primary text-white rounded-full shadow-lg shadow-nura-petrol/30 dark:shadow-primary/30 active:scale-95 transition-transform hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-[32px]">add</span>
                </button>
              </li>
            );
          }

          const isActive = activeView === item.view;

          return (
            <li key={index} className="flex-1 flex justify-center">
              <button
                onClick={() => onNavigate(item.view as AppView)}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive
                  ? 'text-nura-petrol dark:text-primary'
                  : 'text-nura-muted dark:text-slate-500 hover:text-nura-main dark:hover:text-slate-300'
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[26px] ${item.filled && isActive ? 'filled' : ''}`}
                  style={item.filled ? { fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" } : {}}
                >
                  {item.icon}
                </span>
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};