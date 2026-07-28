import React, { useRef, useEffect } from 'react';
import { AppView } from '../types';
import { BottomNavigation } from './BottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onFabClick?: () => void; // Optional, defaults to LOG view
  /** Empresa contratou só o modo Mental — muda a navegação inferior. */
  apenasMental?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  onChangeView,
  onFabClick,
  apenasMental = false,
}) => {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeView]);

  // Telas com navegação inferior. As do modo Mental são as quatro da própria
  // navegação dele; no modo metabólico a lista é a de sempre — Diário e
  // Consultas continuam SEM barra ali, como já era.
  const viewsComNav = apenasMental
    ? [
        AppView.MENTAL_HOME,
        AppView.DAILY_JOURNAL,
        AppView.AGENDAR_CONSULTA,
        AppView.MINHAS_CONSULTAS,
      ]
    : [
        AppView.HOME,
        AppView.FEED,
        AppView.FOOD_GUIDE,
        AppView.PLAN,
        AppView.PROFILE,
        AppView.COMMUNITY_SEARCH,
        AppView.NOTIFICATION_CENTER,
        AppView.COMMUNITY_PROFILE,
      ];
  const showBottomNav = viewsComNav.includes(activeView);

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
          apenasMental={apenasMental}
        />
      )}
    </div>
  );
};
