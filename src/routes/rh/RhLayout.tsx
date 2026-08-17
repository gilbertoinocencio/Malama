import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import {
  LogOut, Users, CreditCard, ShieldCheck, Leaf, Brain, CalendarX2,
  ClipboardList, Upload, Building2, UserCog, ShieldAlert, Compass, LifeBuoy,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';
import { rhService, type RhAcesso, type RhPermissao } from '../../services/empresaService';
import { RhAccessProvider } from '../../contexts/RhAccessContext';
import { RhJornadaProvider, useRhJornada } from '../../contexts/RhJornadaContext';
import { FaixaProximoPasso } from '../../components/rh/FaixaProximoPasso';
import { PrimeiroAcessoRh } from '../../components/rh/PrimeiroAcessoRh';
import { docsPendentesDe } from '../../lib/rhJornada';
import { jaViuApresentacao, marcarApresentacaoVista } from '../../lib/rhPrimeiroAcesso';
import { EMAIL_SUPORTE, linkSuporte } from '../../lib/suporteMalama';

type Tab = { to: string; label: string; icon: React.ReactNode; permissao: RhPermissao };
const ABA_IMPACTO_ATIVA = false;

/** Suporte no cabeçalho, com empresa e usuário já embutidos no e-mail.
 *  Vive dentro do provider da jornada para saber de qual empresa se trata —
 *  sem isso o atendimento começa perguntando quem é quem. */
const SuporteNoCabecalho: React.FC<{ usuario: string }> = ({ usuario }) => {
  const { empresa } = useRhJornada();
  return (
    <a
      href={linkSuporte({ empresa: empresa?.nome, usuario, assunto: 'Preciso de ajuda' })}
      title={`Falar com o suporte da Malama (${EMAIL_SUPORTE})`}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7d4a3c] transition"
    >
      <LifeBuoy className="w-5 h-5" /><span className="hidden md:inline">Suporte</span>
    </a>
  );
};

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
  const [apresentando, setApresentando] = useState(false);

  useEffect(() => {
    rhService.getMeuAcesso()
      .then(a => {
        setAcesso(a);
        // Por usuário: RH e SST dividem a mesma máquina, e quem entra
        // depois é justamente quem não acompanhou a venda.
        if (a && !jaViuApresentacao(a.id)) setApresentando(true);
      })
      .catch(() => setAcesso(null))
      .finally(() => setCarregando(false));
  }, []);

  const encerrarApresentacao = () => {
    if (acesso) marcarApresentacaoVista(acesso.id);
    setApresentando(false);
  };

  // O guard roda apenas na montagem. Sem acompanhar os eventos de Auth, uma
  // sessão encerrada/expirada deixava o painel aberto e as leituras seguintes
  // pareciam dados apagados. Qualquer troca para uma identidade que não seja
  // RH volta imediatamente ao login, antes de renderizar zeros falsos.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (session && session.user.app_metadata?.role !== 'rh')) {
        setAcesso(null);
        navigate('/rh', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

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
        <p className="text-sm text-gray-500 mt-2">
          Quem libera acesso é o usuário principal da sua empresa. Se você é o principal, o
          suporte resolve.
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={handleLogout} className="text-sm font-medium text-[#7d4a3c]">Voltar ao login</button>
          <a
            href={linkSuporte({ assunto: 'Acesso ao painel desativado', detalhe: 'O painel diz que o acesso está desativado.' })}
            className="text-sm font-medium text-gray-500 hover:text-[#7d4a3c]"
          >
            Falar com o suporte
          </a>
        </div>
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
              <SuporteNoCabecalho usuario={acesso.nome ? `${acesso.nome} (${acesso.email})` : acesso.email} />
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
                <Link key={tab.to} to={tab.to} className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${location.pathname === tab.to ? 'border-[#7d4a3c] text-[#7d4a3c]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab.icon}{tab.label}
                </Link>
              ))}
              {/* Fora do filtro de permissão, e à direita: quem está perdido na
                  norma costuma ser quem tem o acesso mais restrito. Antes só se
                  chegava aqui por um ícone dentro da faixa — que some no
                  dashboard, a tela onde o RH mais aterrissa.
                  O padding das abas foi reduzido para esta caber inteira num
                  notebook de 1280px: aba que só aparece depois de rolar a barra
                  não resolve descoberta nenhuma. */}
              <Link
                to="/rh/nr1"
                className={`ml-auto flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${location.pathname === '/rh/nr1' ? 'border-[#7d4a3c] text-[#7d4a3c]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Compass className="w-4 h-4" />Como funciona
              </Link>
            </nav>
          </div>

          {/* Bússola em todas as abas: sem isto, "o que eu faço agora?" só
              tinha resposta no dashboard. */}
          <FaixaProximoPasso />
        </header>

        <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:px-8"><Outlet /></main>
        {apresentando && <PrimeiroAcessoRh onFechar={encerrarApresentacao} />}
        </div>
      </RhJornadaProvider>
    </RhAccessProvider>
  );
};
