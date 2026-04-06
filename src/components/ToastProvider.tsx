// =====================================================
// NURA — Toast Provider para notificações
// =====================================================

import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1A1A1A',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500'
          },
          success: {
            iconTheme: {
              primary: '#2ECC71',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#e74c3c',
              secondary: '#fff'
            }
          }
        }}
      />
    </>
  );
};
