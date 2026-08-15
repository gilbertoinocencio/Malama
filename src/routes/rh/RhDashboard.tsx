// =====================================================
// Malama — Dashboard do Portal do RH
// Dados da empresa, breakdown de assentos, lista de
// colaboradores com reenvio de convite e exportação CSV.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Trash2, Download, Mail, AlertCircle,
  CheckCircle2, Clock, Building2, Calendar, Send, Brain, Phone,
  ArrowRight, Circle, ClipboardCheck, UserCog, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, type RhEmpresa, type EmpresaColaborador, type LiderancaCiclo,
  type PsychosocialCampanha, type RhUsuarioEquipe,
} from '../../services/empresaService';
import { SetoresCard } from '../../components/rh/SetoresCard';
import { useRhAccess } from '../../contexts/RhAccessContext';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const ColabStatusBadge: React.FC<{ status: EmpresaColaborador['status'] }> = ({ status }) => {
  if (status === 'ativo') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" /> Convidado
    </span>
  );
};

type GuiaRhProps = {
  setores: number;
  colaboradores: number;
  campanhas: PsychosocialCampanha[];
  ciclos: LiderancaCiclo[];
  usuariosEquipe: RhUsuarioEquipe[];
  principal: boolean;
  podeSaudeMental: boolean;
  podePlanoAcao: boolean;
};

const GuiaJornadaRh: React.FC<GuiaRhProps> = ({
  setores, colaboradores, campanhas, ciclos, usuariosEquipe, principal,
  podeSaudeMental, podePlanoAcao,
}) => {
  const temSetores = setores > 0;
  const temColaboradores = colaboradores > 0;
  const temCampanha = campanhas.some(c => c.status !== 'cancelada');
  const requisitos = [true, temSetores, temColaboradores, ...(podeSaudeMental ? [temCampanha] : [])];
  const concluidos = requisitos.filter(Boolean).length;
  const progresso = Math.round((concluidos / requisitos.length) * 100);
  const campanhaAberta = campanhas.find(c => c.status === 'aberta');
  const temJss = campanhas.some(c => c.instrument === 'jss' && c.status !== 'cancelada');
  const cicloAtivo = ciclos.find(c => c.status === 'ativo');

  let titulo = 'Base da empresa pronta';
  let descricao = 'Os setores e colaboradores estão organizados. Continue acompanhando os próximos ciclos.';
  let destino = '/rh/dashboard';
  let acao = 'Revisar cadastro';

  if (!temSetores) {
    titulo = 'Organize os setores da empresa';
    descricao = 'Os setores permitem apresentar resultados úteis sem expor respostas individuais.';
    destino = '/rh/dashboard#setores';
    acao = 'Cadastrar setores';
  } else if (!temColaboradores) {
    titulo = 'Adicione os colaboradores';
    descricao = 'Convide pelo painel ou importe a lista para preparar a primeira avaliação.';
    destino = '/rh/dashboard#novo-colaborador';
    acao = 'Adicionar colaboradores';
  } else if (podeSaudeMental && campanhaAberta) {
    titulo = `Acompanhe a campanha de ${campanhaAberta.instrument === 'jss' ? 'JSS' : 'WHO-5'}`;
    descricao = 'Veja a participação, compartilhe os links e encerre a campanha quando a janela terminar.';
    destino = '/rh/saude-mental#campanhas';
    acao = 'Acompanhar campanha';
  } else if (podeSaudeMental && !temCampanha) {
    titulo = 'Abra o primeiro diagnóstico';
    descricao = 'Comece com WHO-5 e JSS para criar a primeira fotografia de bem-estar e condições de trabalho.';
    destino = '/rh/saude-mental?nova=1';
    acao = 'Iniciar diagnóstico';
  } else if (podeSaudeMental && !temJss) {
    titulo = 'Complete o diagnóstico inicial com o JSS';
    descricao = 'O WHO-5 mostra como as pessoas estão; o JSS ajuda a entender o que no trabalho precisa mudar.';
    destino = '/rh/saude-mental?nova=1&instrumento=jss';
    acao = 'Abrir JSS';
  } else if (podePlanoAcao && cicloAtivo) {
    titulo = `Acompanhe os combinados de ${cicloAtivo.setor}`;
    descricao = 'Registre o que entrou em prática e avance a jornada somente quando houver evidência.';
    destino = '/rh/plano-acao?visao=lideranca';
    acao = 'Ver evolução';
  } else if (podePlanoAcao && temJss) {
    titulo = 'Prepare a conversa com as lideranças';
    descricao = 'Use o diagnóstico agregado para reconhecer pontos fortes e combinar até três melhorias por setor.';
    destino = '/rh/plano-acao?visao=lideranca&nova=1';
    acao = 'Preparar conversa';
  }

  const passos = [
    { label: 'Empresa vinculada', ok: true },
    { label: 'Setores organizados', ok: temSetores },
    { label: 'Colaboradores adicionados', ok: temColaboradores },
    ...(podeSaudeMental ? [{ label: 'Primeira avaliação aberta', ok: temCampanha }] : []),
  ];

  return (
    <section className="rounded-xl border border-[#7d4a3c]/20 bg-white p-5 shadow-sm" aria-labelledby="guia-rh-titulo">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7d4a3c]/10 text-[#7d4a3c]">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">Seu próximo passo</p>
            <h2 id="guia-rh-titulo" className="mt-0.5 text-lg font-semibold text-gray-900">{titulo}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">{descricao}</p>
          </div>
        </div>
        <Link to={destino} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#623a2f]">
          {acao} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <details className="group mt-4 border-t border-gray-100 pt-3" open={progresso < 100}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-medium text-gray-700">Preparação do painel</span>
          <span className="text-xs text-gray-500">{concluidos} de {requisitos.length} etapas · {progresso}%</span>
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {passos.map(passo => (
            <div key={passo.label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${passo.ok ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-500'}`}>
              {passo.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : <Circle className="h-4 w-4 shrink-0 text-gray-300" />}
              {passo.label}
            </div>
          ))}
        </div>
        {principal && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <span className="inline-flex items-center gap-2"><UserCog className="h-4 w-4 text-gray-400" />Equipe do RH: {Math.max(0, usuariosEquipe.filter(u => !u.principal && u.ativo).length)} usuário(s) auxiliar(es). Esta etapa é opcional.</span>
            <Link to="/rh/usuarios" className="font-semibold text-[#7d4a3c]">Gerenciar acessos</Link>
          </div>
        )}
      </details>
    </section>
  );
};

export const RhDashboard: React.FC = () => {
  const { acesso } = useRhAccess();
  const [empresa, setEmpresa] = useState<RhEmpresa | null>(null);
  const [colaboradores, setColaboradores] = useState<EmpresaColaborador[]>([]);
  const [campanhas, setCampanhas] = useState<PsychosocialCampanha[]>([]);
  const [ciclos, setCiclos] = useState<LiderancaCiclo[]>([]);
  const [usuariosEquipe, setUsuariosEquipe] = useState<RhUsuarioEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [setor, setSetor] = useState('');
  // Setores ativos do registro da empresa (migration 20260824). O campo de
  // setor é um seletor: texto livre aqui era o que fabricava coortes
  // duplicadas ("TI" / "T.I.") e fazia o piso k suprimir as duas.
  const [setoresAtivos, setSetoresAtivos] = useState<string[]>([]);
  const [funcao, setFuncao] = useState('');
  // Chave de junção com os eventos do eSocial (migration 20260814). Opcional
  // aqui: quem já tem cadastro pode vincular em lote na aba Importar.
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [adding, setAdding] = useState(false);
  const [salvandoSetor, setSalvandoSetor] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [psi, setPsi] = useState<{ plano_ativo: boolean; max_assentos: number; assentos_em_uso: number } | null>(null);
  const [togglingPsi, setTogglingPsi] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  // A lista cresce sem limite e empurrava o resto do dashboard para fora
  // da tela; nasce fechada e o RH abre quando precisa mexer nela.
  const [listaAberta, setListaAberta] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const emp = await rhService.getMyEmpresa();
      if (!emp) {
        setEmpresa(null);
        return;
      }
      if (emp) {
        const [colabs, resumoPsi, setores, campanhasAtuais, ciclosAtuais, equipe] = await Promise.all([
          rhService.getColaboradores(emp.id),
          rhService.getResumoPsicologico(),
          rhService.getSetores().catch(() => []),
          (acesso.principal || acesso.permissoes.includes('saude_mental'))
            ? rhService.getCampanhas().catch(() => []) : Promise.resolve([]),
          (acesso.principal || acesso.permissoes.includes('plano_acao'))
            ? rhService.getLiderancaCiclos().catch(() => []) : Promise.resolve([]),
          acesso.principal ? rhService.getUsuariosEquipe().catch(() => []) : Promise.resolve([]),
        ]);
        // Publica o conjunto de uma vez: nunca mostra empresa nova com lista
        // antiga, nem apaga o estado anterior se uma das chamadas falhar.
        setEmpresa(emp);
        setColaboradores(colabs);
        setPsi(resumoPsi);
        setSetoresAtivos(setores.map(s => s.setor));
        setCampanhas(campanhasAtuais);
        setCiclos(ciclosAtuais);
        setUsuariosEquipe(equipe);
      }
    } catch (err) {
      console.error('Erro ao carregar painel do RH:', err);
      setLoadError('Não foi possível atualizar os dados. Sua sessão ou conexão pode ter oscilado.');
    } finally {
      setLoading(false);
    }
  }, [acesso]);

  useEffect(() => { load(); }, [load]);

  // O React Router não rola até a âncora sozinho. Sem isto, o atalho
  // "criar setores" vindo da campanha só trocaria de aba e deixaria a pessoa
  // no topo, procurando o card.
  useEffect(() => {
    if (loading || window.location.hash !== '#setores') return;
    document.getElementById('setores')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);

  const ativos = colaboradores.filter(c => c.status === 'ativo').length;
  const convidados = colaboradores.filter(c => c.status === 'convidado').length;
  const usados = colaboradores.length;
  const limite = empresa?.max_assentos ?? null;
  const cheio = limite != null && usados >= limite;
  const pct = limite ? Math.min(100, (usados / limite) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    const nomeValue = nome.trim();
    const whatsappValue = whatsapp.trim();
    if (!value) return;
    if (!nomeValue) { toast.error('Informe o nome do colaborador.'); return; }
    if (!whatsappValue) { toast.error('Informe o WhatsApp do colaborador.'); return; }
    if (cheio) { toast.error('Limite de assentos atingido.'); return; }

    setAdding(true);
    try {
      const res = await rhService.inviteColaborador(value, nomeValue, setor.trim(), funcao.trim(), cpf.trim(), whatsappValue);
      if (res.existing) {
        toast.success(
          res.emailed
            ? 'Colaborador adicionado! Enviamos um e-mail de ativação — o acesso fica ativo quando ele abrir o app.'
            : 'Colaborador adicionado! Fica ativo quando ele abrir o app.'
        );
        if (!res.emailed && res.warning) toast('O e-mail de ativação não pôde ser enviado agora.', { icon: '⚠️' });
      } else if (res.invited) {
        toast.success('Convite enviado por e-mail. O acesso fica ativo quando o colaborador acessar o app.');
      } else {
        toast.success('Colaborador adicionado.');
        if (res.warning) toast('O e-mail de convite não pôde ser enviado agora.', { icon: '⚠️' });
      }
      setEmail('');
      setNome('');
      setSetor('');
      setFuncao('');
      setCpf('');
      setWhatsapp('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível adicionar o colaborador.');
    } finally {
      setAdding(false);
    }
  };

  // No modo Mental o psicólogo é universal — o RH não aloca nominalmente,
  // então o toggle por colaborador não deve nem existir na tela.
  const modoMental = empresa?.modo_mental === true;
  const psiToggleVisivel = !modoMental && psi?.plano_ativo === true;

  const psiCheio = psi ? psi.assentos_em_uso >= psi.max_assentos : false;

  const handleTogglePsi = async (c: EmpresaColaborador) => {
    const ativar = !c.plano_psicologico;
    if (ativar && psiCheio) { toast.error('Limite de assentos psicológicos atingido.'); return; }
    setTogglingPsi(c.id);
    try {
      const res = await rhService.alocarPsicologo(c.id, ativar);
      if (!res.ok) { toast.error(res.error || 'Não foi possível atualizar.'); return; }
      setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, plano_psicologico: ativar } : x));
      setPsi(prev => prev ? { ...prev, assentos_em_uso: prev.assentos_em_uso + (ativar ? 1 : -1) } : prev);
      toast.success(ativar ? 'Acesso psicológico liberado.' : 'Acesso psicológico removido.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar acesso psicológico.');
    } finally {
      setTogglingPsi(null);
    }
  };

  const handleSetorColaborador = async (c: EmpresaColaborador, novo: string) => {
    const anterior = c.setor ?? '';
    if (novo === anterior) return;
    setSalvandoSetor(c.id);
    // Otimista: a linha muda na hora e volta atrás se o servidor recusar —
    // reclassificar em lote fica insuportável esperando ida e volta a cada um.
    setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, setor: novo || null } : x));
    try {
      const res = await rhService.definirSetorColaborador(c.id, novo);
      if (!res.ok) {
        setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, setor: c.setor } : x));
        toast.error(res.error || 'Não foi possível alterar o setor.');
        return;
      }
      // O servidor devolve a grafia canônica do registro.
      setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, setor: res.setor ?? null } : x));
    } catch (err: any) {
      setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, setor: c.setor } : x));
      toast.error(err?.message || 'Erro ao alterar o setor.');
    } finally {
      setSalvandoSetor(null);
    }
  };

  const handleRemove = async (c: EmpresaColaborador) => {
    if (!confirm(`Remover ${c.email}? O acesso corporativo será encerrado e o assento liberado.`)) return;
    try {
      await rhService.removeColaborador(c.id);
      toast.success('Colaborador removido.');
      setColaboradores(prev => prev.filter(x => x.id !== c.id));
      // Remover quem tinha plano psicológico libera o assento — sem isto o
      // contador só se corrigia no reload e o RH batia no limite à toa.
      if (c.plano_psicologico) {
        setPsi(prev => prev ? { ...prev, assentos_em_uso: Math.max(0, prev.assentos_em_uso - 1) } : prev);
      }
    } catch {
      toast.error('Erro ao remover colaborador.');
    }
  };

  const handleResend = async (c: EmpresaColaborador) => {
    setResending(c.id);
    try {
      const res = await rhService.resendInvite(c.id);
      if (res.sent) {
        toast.success(`E-mail reenviado para ${c.email}.`);
      } else {
        toast(`Não foi possível reenviar: ${res.warning ?? 'erro desconhecido'}`, { icon: '⚠️' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reenviar convite.');
    } finally {
      setResending(null);
    }
  };

  const exportCsv = () => {
    const header = ['email', 'whatsapp', 'setor', 'funcao', 'status', 'data_adicao', 'data_ativacao'];
    const rows = colaboradores.map(c => [
      c.email,
      c.whatsapp ?? '',
      c.setor ?? '',
      c.funcao ?? '',
      c.status,
      c.data_adicao ? new Date(c.data_adicao).toISOString().slice(0, 10) : '',
      c.data_ativacao ? new Date(c.data_ativacao).toISOString().slice(0, 10) : '',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colaboradores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  if (loadError && !empresa) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Não foi possível carregar o painel agora.</p>
        <p className="text-gray-500 text-sm mt-1">Seus dados não foram apagados.</p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-lg bg-[#7d4a3c] text-white text-sm font-semibold">Tentar novamente</button>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Nenhuma empresa vinculada a esta conta.</p>
        <p className="text-gray-400 text-sm mt-1">Entre em contato com a Malama.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3"><span>{loadError} Mantivemos a última informação carregada.</span><button onClick={load} className="font-semibold whitespace-nowrap">Tentar novamente</button></div>}
      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{empresa.nome}</h1>
        <p className="text-sm text-gray-500">Gerencie os colaboradores com acesso ao benefício Malama.</p>
      </div>

      <GuiaJornadaRh
        setores={setoresAtivos.length}
        colaboradores={colaboradores.length}
        campanhas={campanhas}
        ciclos={ciclos}
        usuariosEquipe={usuariosEquipe}
        principal={acesso.principal}
        podeSaudeMental={acesso.principal || acesso.permissoes.includes('saude_mental')}
        podePlanoAcao={acesso.principal || acesso.permissoes.includes('plano_acao')}
      />

      {empresa.status !== 'ativa' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          A conta da empresa está {empresa.status}. Novos colaboradores não podem ser adicionados no momento.
        </div>
      )}

      {/* ── Dados da empresa ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Dados da empresa</h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {empresa.cnpj && (
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">CNPJ</dt>
              <dd className="mt-1 text-sm text-gray-700">{empresa.cnpj}</dd>
            </div>
          )}
          {empresa.responsavel_nome && (
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Responsável</dt>
              <dd className="mt-1 text-sm text-gray-700">{empresa.responsavel_nome}</dd>
            </div>
          )}
          {empresa.data_inicio && (
            <div className="flex flex-col">
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Início do contrato
              </dt>
              <dd className="mt-1 text-sm text-gray-700">{fmtDate(empresa.data_inicio)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* ── Breakdown de assentos ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ativos
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{convidados}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Convidados
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">
            {usados}{limite != null && <span className="text-gray-400 text-lg"> / {limite}</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> Assentos
          </p>
        </div>
      </div>

      {/* Barra de progresso de assentos */}
      {limite != null && (
        <div className="bg-white rounded-xl shadow px-5 py-3">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
            <span>Ocupação dos assentos contratados</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cheio ? '#DC2626' : '#7d4a3c' }}
            />
          </div>
          {cheio && (
            <p className="text-xs text-red-500 mt-2">
              Limite atingido. Remova um colaborador ou fale com a Malama para ampliar.
            </p>
          )}
        </div>
      )}

      {/* ── Acompanhamento psicológico ──
          Modo Mental: universal, todo colaborador com assento tem direito.
          Legado (plano avulso): o RH aloca nominalmente. Os dois nunca
          aparecem juntos — ver colaborador_tem_psicologo() no banco. */}
      {modoMental ? (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Acompanhamento psicológico</h2>
          </div>
          <p className="text-sm text-gray-500">
            Incluso para <strong>todos</strong> os {colaboradores.length} colaboradores com assento —
            uma consulta por mês, sem custo adicional na ponta e sem necessidade de liberação
            individual. O colaborador agenda direto pelo app.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            A disponibilização é universal de propósito: assim, marcar uma consulta não revela nada
            sobre a resposta de ninguém aos questionários de bem-estar.
          </p>
        </div>
      ) : psi?.plano_ativo && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Plano psicológico</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Sua empresa contratou consultas com psicólogos. Escolha, na lista de colaboradores
            abaixo, quem terá acesso a esse benefício adicional.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Assentos psicológicos: <strong className="text-[#7d4a3c]">{psi.assentos_em_uso}</strong>
              {' / '}{psi.max_assentos}
            </span>
            {psiCheio && <span className="text-xs text-amber-600">Limite atingido</span>}
          </div>
        </div>
      )}

      {/* ── Setores ──
          Antes do cadastro de propósito: a empresa decide os setores que quer
          acompanhar, e só depois aponta cada pessoa para um deles.
          A âncora #setores é o destino do atalho vindo da tela de campanha. */}
      <div id="setores" className="scroll-mt-6">
      <SetoresCard
        disabled={empresa.status !== 'ativa'}
        // Renomear/unir setor reescreve o texto gravado em cada colaborador:
        // a lista precisa ser relida para não exibir o nome antigo.
        onMutacao={load}
        onChange={ativos => {
          setSetoresAtivos(ativos);
          // Setor selecionado que foi renomeado/arquivado no card não pode
          // continuar no formulário: gravaria um texto que não existe mais.
          setSetor(prev => (prev && !ativos.includes(prev) ? '' : prev));
        }}
        />
      </div>

      {/* ── Adicionar colaborador ── */}
      <div id="novo-colaborador" className="scroll-mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Adicionar colaborador</h2>
        </div>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Nome do colaborador"
                disabled={cheio || empresa.status !== 'ativa'}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@colaborador.com"
                disabled={cheio || empresa.status !== 'ativa'}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel" inputMode="tel" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="WhatsApp do colaborador"
                disabled={cheio || empresa.status !== 'ativa'}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <select
              value={setor} onChange={e => setSetor(e.target.value)}
              disabled={cheio || empresa.status !== 'ativa' || setoresAtivos.length === 0}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {setoresAtivos.length === 0
                  ? 'Cadastre um setor acima primeiro'
                  : 'Setor — opcional'}
              </option>
              {setoresAtivos.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="text" value={funcao} onChange={e => setFuncao(e.target.value)}
              placeholder="Função (ex.: Analista) — opcional"
              disabled={cheio || empresa.status !== 'ativa'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
            <input
              type="text" inputMode="numeric" value={cpf}
              onChange={e => setCpf(e.target.value)}
              placeholder="CPF — opcional, usado só para importar afastamentos"
              disabled={cheio || empresa.status !== 'ativa'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <button
            type="submit" disabled={adding || cheio || empresa.status !== 'ativa'}
            className="self-start flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Se o colaborador já tem conta Malama, o acesso é vinculado na hora. Caso contrário, ele recebe um convite por e-mail.
          Setor e função alimentam os relatórios agregados de bem-estar (nunca identificam respostas individuais).
        </p>
      </div>

      {/* ── Lista de colaboradores ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setListaAberta(v => !v)}
            disabled={colaboradores.length === 0}
            aria-expanded={listaAberta}
            className="flex items-center gap-2 text-left rounded-lg -m-1 p-1 hover:bg-gray-50 transition disabled:hover:bg-transparent disabled:cursor-default"
          >
            <Users className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Colaboradores</h2>
            <span className="text-xs text-gray-400">{colaboradores.length}</span>
            {colaboradores.length > 0 && (
              listaAberta
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={exportCsv}
            disabled={colaboradores.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>

        {colaboradores.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum colaborador ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Adicione o primeiro colaborador pelo e-mail acima.</p>
          </div>
        ) : !listaAberta ? (
          <button
            type="button"
            onClick={() => setListaAberta(true)}
            className="w-full px-5 py-3 text-xs text-gray-500 hover:bg-gray-50 transition text-left"
          >
            Lista recolhida — clique para ver os {colaboradores.length} colaboradores.
          </button>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">WhatsApp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Setor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Adicionado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Ativado</th>
                  {psiToggleVisivel && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Psi</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colaboradores.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800">{c.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {c.whatsapp || '—'}
                    </td>
                    {/* Reclassificável na própria linha: sem isto, quem entrou
                        sem setor (ou no errado) ficava assim para sempre, e
                        setor com gente dentro nunca podia ser arquivado. */}
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      <select
                        value={c.setor ?? ''}
                        onChange={e => handleSetorColaborador(c, e.target.value)}
                        disabled={setoresAtivos.length === 0 || salvandoSetor === c.id}
                        title="Setor do colaborador"
                        className="max-w-[10rem] bg-transparent border border-transparent hover:border-gray-300 focus:border-gray-300 rounded-md px-1.5 py-1 text-xs text-gray-600 focus:ring-2 focus:ring-[#7d4a3c] focus:outline-none disabled:opacity-60"
                      >
                        <option value="">Sem setor</option>
                        {/* O setor atual pode estar arquivado: sem esta opção o
                            select mostraria "Sem setor" e mentiria sobre o dado. */}
                        {c.setor && !setoresAtivos.includes(c.setor) && (
                          <option value={c.setor}>{c.setor} (arquivado)</option>
                        )}
                        {setoresAtivos.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {c.funcao ? <span className="ml-1">· {c.funcao}</span> : ''}
                    </td>
                    <td className="px-4 py-3 text-center"><ColabStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtDate(c.data_adicao)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{fmtDate(c.data_ativacao)}</td>
                    {psiToggleVisivel && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleTogglePsi(c)}
                          disabled={togglingPsi === c.id || (!c.plano_psicologico && psiCheio)}
                          title={c.plano_psicologico ? 'Remover acesso psicológico' : 'Liberar acesso psicológico'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-40 ${
                            c.plano_psicologico ? 'bg-[#7d4a3c]' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                            c.plano_psicologico ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'convidado' && (
                          <button
                            onClick={() => handleResend(c)}
                            disabled={resending === c.id}
                            title="Reenviar convite"
                            className="p-1.5 text-[#7d4a3c] hover:bg-[#7d4a3c]/10 rounded-lg transition disabled:opacity-40"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(c)}
                          title="Remover"
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
