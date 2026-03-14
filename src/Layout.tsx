import React from 'react';
import { AppView } from './types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden max-w-md mx-auto relative bg-background-light dark:bg-background-dark shadow-2xl">
      <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
        {children}
      </main>
    </div>
  );
};