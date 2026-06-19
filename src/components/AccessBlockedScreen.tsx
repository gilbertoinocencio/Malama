// =====================================================
// Malama — Tela de acesso suspenso (inadimplência da empresa)
// Renderizada no lugar do app quando a RPC empresa_acesso_bloqueado
// retorna true. É só uma trava de render — nenhum dado é alterado.
// =====================================================

import React from 'react';
import { Lock, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';
import { MalamaLogo } from './MalamaLogo';

export const AccessBlockedScreen: React.FC = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/acesso';
  };

  return (
    <div className="min-h-screen bg-Malama-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <MalamaLogo size="lg" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-Malama-border">
          <div className="w-14 h-14 rounded-full bg-Malama-petrol-light flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-Malama-petrol" />
          </div>

          <h1 className="text-xl font-semibold text-Malama-main mb-3">Acesso temporariamente suspenso</h1>
          <p className="text-Malama-muted text-sm leading-relaxed">
            Seu acesso à Malama está temporariamente suspenso. Entre em contato com o RH da sua
            empresa para mais informações.
          </p>

          <button
            onClick={handleLogout}
            className="mt-7 inline-flex items-center gap-2 text-sm text-Malama-muted hover:text-Malama-petrol transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
