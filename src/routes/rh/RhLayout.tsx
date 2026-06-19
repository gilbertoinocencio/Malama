// =====================================================
// Malama — Layout do Portal do RH
// Header + navegação por abas. Focado em usuário não-técnico.
// A aba "Impacto" só aparece quando há ao menos 1 certificado emitido.
// =====================================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { LogOut, Users, CreditCard, ShieldCheck, Leaf } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';
import { rhService } from '../../services/empresaService';

type Tab = { to: string; label: string; icon: React.ReactNode };

export const RhLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [temImpacto, setTemImpacto] = useState(false);

  useEffect(() => {
    // Best-effort: a aba Impacto só aparece se houver certificados emitidos.
    // Tolerante a erro (tabela pode não existir antes da migration de ESG).
    rhService.hasCertificados().then(setTemImpacto).catch(() => setTemImpacto(false));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/rh');
  };

  const tabs: Tab[] = [
    { to: '/rh/dashboard', label: 'Colaboradores', icon: <Users className="w-4 h-4" /> },
    { to: '/rh/financeiro', label: 'Financeiro', icon: <CreditCard className="w-4 h-4" /> },
    { to: '/rh/compliance', label: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
    ...(temImpacto
      ? [{ to: '/rh/impacto', label: 'Impacto', icon: <Leaf className="w-4 h-4" /> }]
      : []),
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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

        {/* Abas */}
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  isActive(tab.to)
                    ? 'border-[#7d4a3c] text-[#7d4a3c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};
