import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import {
  LogOut, Users, CreditCard, ShieldCheck, Leaf, Brain, CalendarX2,
  ClipboardList, Upload, Building2, UserCog, ShieldAlert, Compass, LifeBuoy, FileText,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';
import { rhService, type RhAcesso, type RhPermissao } from '../../services/empresaService';
import { RhAccessProvider } from '../../contexts/RhAccessContext';
import { RhJornadaProvider, useRhJornada } from '../../contexts/RhJornadaContext';
import { FaixaProximoPasso } from '../../components/rh/FaixaProximoPasso';
import { PrimeiroAcessoRh } from '../../components/rh/PrimeiroAcessoRh';
import { RhCopilot } from '../../components/rh/RhCopilot';
import { RelatosSentinelaAlerta } from '../../components/rh/RelatosSentinelaAlerta';
import { cicloCompleto, docsPendentesDe } from '../../lib/rhJornada';
import { jaViuApresentacao, marcarApresentacaoVista } from '../../lib/rhPrimeiroAcesso';
import { EMAIL_SUPORTE, linkSuporte } from '../../lib/suporteMalama';

/**
 * Grupos da barra. As oito abas chegavam com o mesmo peso e sem nenhuma
 * marca de ordem, então nada distinguia a SEQUÊNCIA do ciclo (medir →
 * agir → comprovar) das ferramentas de apoio e da parte administrativa —
 * eram oito decisões antes da primeira ação.
 */
type GrupoAba = 'ciclo' | 'apoio' | 'admin';
const ROTULO_GRUPO: Record<GrupoAba, string> = {
  ciclo: 'Ciclo',
  apoio: 'Apoio',
  admin: 'Administração',
};

type Tab = {
  to: string; label: string; icon: React.ReactNode;
  permissao: RhPermissao; grupo: GrupoAba;
};
const ABA_IMPACTO_ATIVA = false;

/**
 * Barra de abas. Componente próprio porque precisa do contexto da jornada
 * para saber quais abas ainda não têm nada dentro — e o provider é montado
 * pelo próprio RhLayout, então o corpo dele não pode ler o contexto.
 */
const AbasDoPainel: React.FC<{ tabs: Tab[]; atual: string }> = ({ tabs, atual }) => {
  const { dados, loading } = useRhJornada();

  // Documentos aparece sempre. Chegou a ficar oculta até o ciclo fechar,
  // mas com a emissão inteira consolidada nela isso trancaria o certificado
  // de disponibilização — que não depende do ciclo e é justamente o
  // documento que uma empresa nova precisa. O que muda com o ciclo completo
  // é a COR, não a existência: verde é a conquista que antes ocupava um card
  // inteiro no dashboard.
  const documentosProntos = cicloCompleto(dados);

  // Só marcamos "ainda sem dado" onde a jornada realmente sabe a resposta.
  // Relatos, Absenteísmo e Financeiro não passam por aqui, e chutar um
  // ponto neles seria pior do que não marcar nada.
  const vazias: Record<string, string> = {
    '/rh/dashboard': dados.nColaboradores === 0 ? 'Nenhuma pessoa cadastrada ainda' : '',
    '/rh/saude-mental': dados.campanhas.length === 0 ? 'Nenhuma medição aplicada ainda' : '',
    '/rh/plano-acao': dados.planos.length === 0 ? 'Nenhuma medida registrada ainda' : '',
  };

  const grupos: GrupoAba[] = ['ciclo', 'apoio', 'admin'];

  return (
    <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Seções do painel">
      {grupos.map((grupo, gi) => {
        const doGrupo = tabs.filter(t => t.grupo === grupo);
        if (doGrupo.length === 0) return null;
        return (
          <React.Fragment key={grupo}>
            {gi > 0 && (
              <span aria-hidden="true" className="my-2.5 w-px shrink-0 self-stretch bg-gray-200" />
            )}
            {doGrupo.map(tab => {
              const vazia = !loading && vazias[tab.to];
              // Verde quando o ciclo fechou: é o que substitui o antigo card
              // de "ciclo completo" no dashboard — a conquista vira a própria
              // aba, sem ocupar quatro linhas acima do próximo passo.
              const concluida = tab.to === '/rh/documentos' && documentosProntos;
              const cor = concluida
                ? (atual === tab.to
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-green-700 hover:text-green-800')
                : (atual === tab.to
                    ? 'border-[#7d4a3c] text-[#7d4a3c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700');
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  title={concluida
                    ? 'Ciclo completo — todos os documentos disponíveis'
                    : (vazia || undefined)}
                  aria-label={vazia ? `${tab.label} — ${vazia}` : undefined}
                  className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${cor}`}
                >
                  {tab.icon}
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {vazia && (
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    )}
                  </span>
                </Link>
              );
            })}
            {gi === 0 && (
              <span className="sr-only">Fim das abas do grupo {ROTULO_GRUPO[grupo]}</span>
            )}
          </React.Fragment>
        );
      })}
      {/* Fora do filtro de permissão, e à direita: quem está perdido na
          norma costuma ser quem tem o acesso mais restrito. Antes só se
          chegava aqui por um ícone dentro da faixa — que some no dashboard,
          a tela onde o RH mais aterrissa. O padding das abas foi reduzido
          para esta caber inteira num notebook de 1280px: aba que só aparece
          depois de rolar a barra não resolve descoberta nenhuma. */}
      <Link
        to="/rh/nr1"
        className={`ml-auto flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${atual === '/rh/nr1' ? 'border-[#7d4a3c] text-[#7d4a3c]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
        <Compass className="w-4 h-4" />Como funciona
      </Link>
    </nav>
  );
};

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
  const [copilotoAberto, setCopilotoAberto] = useState(false);

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
  // A ordem dentro de "ciclo" é a do próprio ciclo da NR-1: quem são as
  // pessoas → medir → agir → comprovar. Ler a barra da esquerda para a
  // direita passou a ser ler o processo.
  const todasAsTabs: Tab[] = [
    // Aba renomeada: dashboard virou o hub do ciclo (próximo passo, leitura
    // inteligente, ritmo), não só cadastro de gente. "Colaboradores" descrevia
    // cada vez menos o que a tela mostra. A permissão que a controla continua
    // 'colaboradores' — é a mesma tela, só o nome na aba mudou.
    { to: '/rh/dashboard', label: 'Início', icon: <Users className="w-4 h-4" />, permissao: 'colaboradores', grupo: 'ciclo' },
    { to: '/rh/saude-mental', label: 'Saúde Mental', icon: <Brain className="w-4 h-4" />, permissao: 'saude_mental', grupo: 'ciclo' },
    { to: '/rh/plano-acao', label: 'Plano de ação', icon: <ClipboardList className="w-4 h-4" />, permissao: 'plano_acao', grupo: 'ciclo' },
    { to: '/rh/compliance', label: 'Compliance', icon: <ShieldCheck className="w-4 h-4" />, permissao: 'compliance', grupo: 'ciclo' },
    // Antes do Financeiro: é o fim do ciclo, não administração.
    { to: '/rh/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" />, permissao: 'compliance', grupo: 'ciclo' },
    // Apoio: não é etapa do ciclo, é o que alimenta ou corre em paralelo.
    // Relatos não espera calendário nenhum — segue para apuração na hora.
    { to: '/rh/relatos', label: 'Relatos', icon: <ShieldAlert className="w-4 h-4" />, permissao: 'apuracao', grupo: 'apoio' },
    { to: '/rh/absenteismo', label: 'Absenteísmo', icon: <CalendarX2 className="w-4 h-4" />, permissao: 'absenteismo', grupo: 'apoio' },
    { to: '/rh/importar', label: 'Importar', icon: <Upload className="w-4 h-4" />, permissao: 'importar', grupo: 'apoio' },
    { to: '/rh/financeiro', label: 'Financeiro', icon: <CreditCard className="w-4 h-4" />, permissao: 'financeiro', grupo: 'admin' },
    ...(ABA_IMPACTO_ATIVA && temImpacto
      ? [{ to: '/rh/impacto', label: 'Impacto', icon: <Leaf className="w-4 h-4" />, permissao: 'compliance' as const, grupo: 'admin' as const }]
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
              {/* Antes vivia como card cheio dentro da aba Saúde Mental — só
                  existe quando há relato, e aqui alcança qualquer rota do
                  portal, não só quem passa por aquela aba específica. */}
              <RelatosSentinelaAlerta />
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
            <AbasDoPainel tabs={tabs} atual={location.pathname} />
          </div>

          {/* Bússola em todas as abas: sem isto, "o que eu faço agora?" só
              tinha resposta no dashboard. */}
          <FaixaProximoPasso />
        </header>

        <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:px-8"><Outlet /></main>
        <RhCopilot open={copilotoAberto} onOpenChange={setCopilotoAberto} />
        {apresentando && (
          <PrimeiroAcessoRh
            onFechar={encerrarApresentacao}
          />
        )}
        </div>
      </RhJornadaProvider>
    </RhAccessProvider>
  );
};
