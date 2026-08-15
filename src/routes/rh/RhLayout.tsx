import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import {
  LogOut, Users, CreditCard, ShieldCheck, Leaf, Brain, CalendarX2,
  ClipboardList, Upload, Building2, UserCog, ShieldAlert,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';
import { rhService, type RhAcesso, type RhPermissao } from '../../services/empresaService';
import { RhAccessProvider } from '../../contexts/RhAccessContext';
import { RhJornadaProvider, useRhJornada } from '../../contexts/RhJornadaContext';
import { FaixaProximoPasso } from '../../components/rh/FaixaProximoPasso';
import { docsPendentesDe } from '../../lib/rhJornada';

type Tab = { to: string; label: string; icon: React.ReactNode; permissao: RhPermissao };
const ABA_IMPACTO_ATIVA = false;

/** Identidade da empresa no cabeçalho. Fica em componente próprio para poder
 *  ler o contexto da jornada — nome e documentos já vêm de lá, sem repetir
 *  as chamadas que o layout fazia por conta própria. */
const EmpresaNoCabecalho: React.FC = () => {
  const { empresa, documentos } = useRhJornada();
  const pendentes = docsPendentesDe(documentos);
  return (
    <Link to="/rh/empresa" title="Dados e documentos da empresa" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7d4a3c] transition max-w-[45vw] sm:max-w-none">
      <Building2 className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{empresa?.nome || 'Minha empresa'}</span>
      {pendentes > 0 && <span title={`${pendentes} documento(s) aguardando aceite`} className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
    </Link>
  );
};

export const RhLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [temImpacto, setTemImpacto] = useState(false);
  const [acesso, setAcesso] = useState<RhAcesso | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    rhService.getMeuAcesso()
      .then(setAcesso)
      .catch(() => setAcesso(null))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!ABA_IMPACTO_ATIVA) return;
    rhService.hasCertificados().then(setTemImpacto).catch(() => setTemImpacto(false));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/rh');
  };

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="w-9 h-9 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!acesso) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center max-w-md">
        <h1 className="font-semibold text-gray-900">Acesso ao painel desativado</h1>
        <p className="text-sm text-gray-500 mt-2">Fale com o usuário principal da sua empresa.</p>
        <button onClick={handleLogout} className="mt-4 text-sm font-medium text-[#7d4a3c]">Voltar ao login</button>
      </div>
    </div>
  );

  const can = (p: RhPermissao) => acesso.principal || acesso.permissoes.includes(p);
  const todasAsTabs: Tab[] = [
    { to: '/rh/dashboard', label: 'Colaboradores', icon: <Users className="w-4 h-4" />, permissao: 'colaboradores' },
    { to: '/rh/saude-mental', label: 'Saúde Mental', icon: <Brain className="w-4 h-4" />, permissao: 'saude_mental' },
    { to: '/rh/relatos', label: 'Relatos', icon: <ShieldAlert className="w-4 h-4" />, permissao: 'apuracao' },
    { to: '/rh/absenteismo', label: 'Absenteísmo', icon: <CalendarX2 className="w-4 h-4" />, permissao: 'absenteismo' },
    { to: '/rh/plano-acao', label: 'Plano de ação', icon: <ClipboardList className="w-4 h-4" />, permissao: 'plano_acao' },
    { to: '/rh/importar', label: 'Importar', icon: <Upload className="w-4 h-4" />, permissao: 'importar' },
    { to: '/rh/financeiro', label: 'Financeiro', icon: <CreditCard className="w-4 h-4" />, permissao: 'financeiro' },
    { to: '/rh/compliance', label: 'Compliance', icon: <ShieldCheck className="w-4 h-4" />, permissao: 'compliance' },
    ...(ABA_IMPACTO_ATIVA && temImpacto
      ? [{ to: '/rh/impacto', label: 'Impacto', icon: <Leaf className="w-4 h-4" />, permissao: 'compliance' as const }]
      : []),
  ];
  const tabs = todasAsTabs.filter(tab => can(tab.permissao));

  return (
    <RhAccessProvider acesso={acesso}>
      <RhJornadaProvider>
        <div className="min-h-screen bg-[#F8F9FA]">
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <MalamaLogo size="sm" />
              <span className="hidden sm:inline text-sm text-gray-400 border-l border-gray-200 pl-3">Portal do RH</span>
            </div>
            <div className="flex items-center gap-4">
              {can('empresa') && <EmpresaNoCabecalho />}
              {acesso.principal && (
                <Link to="/rh/usuarios" title="Usuários e permissões" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7d4a3c] transition">
                  <UserCog className="w-5 h-5" /><span className="hidden md:inline">Equipe</span>
                </Link>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7d4a3c] transition">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {tabs.map(tab => (
                <Link key={tab.to} to={tab.to} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${location.pathname === tab.to ? 'border-[#7d4a3c] text-[#7d4a3c]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab.icon}{tab.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bússola em todas as abas: sem isto, "o que eu faço agora?" só
              tinha resposta no dashboard. */}
          <FaixaProximoPasso />
        </header>

        <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:px-8"><Outlet /></main>
        </div>
      </RhJornadaProvider>
    </RhAccessProvider>
  );
};
