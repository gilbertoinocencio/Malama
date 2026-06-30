import React, { useRef, useEffect } from 'react';
import { AppView } from '../types';
import { BottomNavigation } from './BottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onFabClick?: () => void; // Optional, defaults to LOG view
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  onChangeView,
  onFabClick
}) => {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeView]);

  // Define which views should show the bottom navigation
  const showBottomNav = [
    AppView.HOME,
    AppView.FEED,
    AppView.FOOD_GUIDE,
    AppView.PLAN,
    AppView.PROFILE,
    AppView.COMMUNITY_SEARCH,
    AppView.NOTIFICATION_CENTER,
    AppView.COMMUNITY_PROFILE,
  ].includes(activeView);

  const handleFabClick = () => {
    if (onFabClick) {
      onFabClick();
    } else {
      onChangeView(AppView.LOG);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden max-w-md mx-auto relative bg-background-light dark:bg-background-dark shadow-2xl transition-colors duration-300 pt-safe">
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar relative">
        {children}
      </main>

      {showBottomNav && (
        <BottomNavigation
          activeView={activeView}
          onNavigate={onChangeView}
          onFabClick={handleFabClick}
        />
      )}
    </div>
  );
};
