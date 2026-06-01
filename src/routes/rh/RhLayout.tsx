// =====================================================
// Malama — Layout do Portal do RH
// Header simples, focado em usuário não-técnico.
// =====================================================

import React from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';

export const RhLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/rh');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MalamaLogo size="sm" />
            <span className="hidden sm:inline text-sm text-gray-400 border-l border-gray-200 pl-3">Portal do RH</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7d4a3c] transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};
