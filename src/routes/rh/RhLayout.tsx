// =====================================================
// Malama — Layout do Portal do RH
// Header + navegação por abas. Focado em usuário não-técnico.
// A aba "Impacto" está desligada por enquanto (ABA_IMPACTO_ATIVA = false) para
// não poluir a barra. Quando religar, ela só aparece se houver ≥1 certificado emitido.
// =====================================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import {
  LogOut, Users, CreditCard, ShieldCheck, Leaf, Brain, CalendarX2, ClipboardList,
  Upload, Building2,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';
import { rhService } from '../../services/empresaService';

type Tab = { to: string; label: string; icon: React.ReactNode };

// Liga/desliga a aba Impacto na navegação. A rota /rh/impacto continua acessível
// por link direto — só sai da barra de abas.
const ABA_IMPACTO_ATIVA = false;

export const RhLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [temImpacto, setTemImpacto] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');
  const [docsPendentes, setDocsPendentes] = useState(0);

  useEffect(() => {
    if (!ABA_IMPACTO_ATIVA) return;
    // Best-effort: a aba Impacto só aparece se houver certificados emitidos.
    // Tolerante a erro (tabela pode não existir antes da migration de ESG).
    rhService.hasCertificados().then(setTemImpacto).catch(() => setTemImpacto(false));
  }, []);

  useEffect(() => {
    rhService.getMyEmpresa().then(e => setEmpresaNome(e?.nome ?? '')).catch(() => {});
    // Marcador de documento por aceitar. Sem ele a área da empresa seria uma
    // gaveta que ninguém abre — e termo não lido é termo não aceito.
    // Tolerante a erro: antes da migration 20260825 a RPC não existe.
    rhService.getDocumentos()
      .then(ds => setDocsPendentes(ds.filter(d => d.exige_aceite && !d.aceito_em).length))
      .catch(() => setDocsPendentes(0));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/rh');
  };

  const tabs: Tab[] = [
    { to: '/rh/dashboard', label: 'Colaboradores', icon: <Users className="w-4 h-4" /> },
    { to: '/rh/saude-mental', label: 'Saúde Mental', icon: <Brain className="w-4 h-4" /> },
    { to: '/rh/absenteismo', label: 'Absenteísmo', icon: <CalendarX2 className="w-4 h-4" /> },
    { to: '/rh/plano-acao', label: 'Plano de ação', icon: <ClipboardList className="w-4 h-4" /> },
    // Fica ao lado de Absenteísmo porque é ele que a importação alimenta.
    { to: '/rh/importar', label: 'Importar', icon: <Upload className="w-4 h-4" /> },
    { to: '/rh/financeiro', label: 'Financeiro', icon: <CreditCard className="w-4 h-4" /> },
    { to: '/rh/compliance', label: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
    ...(ABA_IMPACTO_ATIVA && temImpacto
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
          <div className="flex items-center gap-4">
            {/* Área da empresa: dados cadastrais e termos. Fora da barra de
                abas de propósito — é conta, não trabalho do dia. */}
            <Link
              to="/rh/empresa"
              title="Dados e documentos da empresa"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7d4a3c] transition max-w-[45vw] sm:max-w-none"
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{empresaNome || 'Minha empresa'}</span>
              {docsPendentes > 0 && (
                <span
                  title={`${docsPendentes} documento(s) aguardando aceite`}
                  className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"
                />
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7d4a3c] transition"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
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
