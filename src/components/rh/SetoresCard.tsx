// =====================================================
// Malama — Setores da empresa (Portal do RH)
//
// O setor deixou de ser efeito colateral do cadastro. A empresa registra
// aqui os setores em que quer agir, e o cadastro do colaborador passa a
// escolher da lista — nunca digitar.
//
// Por que isso importa e não é preciosismo: os relatórios psicossociais
// aplicam piso de coorte (k). Enquanto o setor era texto livre, "T.I." e
// "TI" viravam duas coortes, cada uma abaixo do piso, e as duas eram
// suprimidas — o RH via gráfico vazio sem nenhuma mensagem de erro.
// Renomear/unir setores aqui é o que reconstitui essas coortes.
// =====================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Layers, Plus, Pencil, Archive, ArchiveRestore, Trash2, Check, X, AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { rhSetorSugestoes } from '../../lib/rhSetorSugestoes';
import {
  rhService, type ModeloTrabalhoSetor, type SetorAdmin, type TurnoSetor,
} from '../../services/empresaService';
import { CabecalhoColapsavel, ResumoRecolhido, useSecaoAberta } from './SecaoColapsavel';
import { ConfirmarUniaoSetor } from './ConfirmarUniaoSetor';

/**
 * Piso de coorte dos relatórios. Duplicado do banco de propósito — lá é
 * `v_min` nas funções que aplicam o corte, e não existe RPC que o exponha.
 * Se mudar de lado, tem que mudar dos dois.
 */
const PISO_COORTE = 5;

const MODELOS: Array<{ valor: ModeloTrabalhoSetor; label: string }> = [
  { valor: 'presencial', label: 'Presencial' },
  { valor: 'home_office', label: 'Home office' },
  { valor: 'hibrido', label: 'Híbrido' },
];
const TURNOS: Array<{ valor: TurnoSetor; label: string }> = [
  { valor: 'comercial', label: 'Comercial' },
  { valor: 'manha', label: 'Manhã' },
  { valor: 'tarde', label: 'Tarde' },
  { valor: 'noite', label: 'Noite' },
  { valor: 'madrugada', label: 'Madrugada' },
  { valor: 'flexivel', label: 'Flexível' },
];

const alternar = <T extends string>(lista: T[], valor: T) =>
  lista.includes(valor) ? lista.filter(item => item !== valor) : [...lista, valor];

const rotulo = (valor: ModeloTrabalhoSetor | TurnoSetor) =>
  [...MODELOS, ...TURNOS].find(item => item.valor === valor)?.label ?? valor;

const GrupoCheckbox: React.FC<{
  titulo: string;
  opcoes: Array<{ valor: string; label: string }>;
  selecionados: string[];
  onToggle: (valor: string) => void;
  disabled?: boolean;
}> = ({ titulo, opcoes, selecionados, onToggle, disabled }) => (
  <fieldset>
    <legend className="mb-1.5 text-xs font-medium text-gray-700">{titulo}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {opcoes.map(opcao => (
        <label key={opcao.valor} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={selecionados.includes(opcao.valor)}
            onChange={() => onToggle(opcao.valor)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-[#7d4a3c] focus:ring-[#7d4a3c]"
          />
          {opcao.label}
        </label>
      ))}
    </div>
  </fieldset>
);

/** Tamanho real do setor: efetivo declarado, nunca menos que os cadastrados. */
const tamanhoSetor = (s: SetorAdmin) => Math.max(s.n, s.efetivo ?? 0);

export const SetoresCard: React.FC<{
  /** Avisa o formulário de colaborador para atualizar o seletor. */
  onChange?: (ativos: string[]) => void;
  /**
   * Disparado só depois de criar/renomear/arquivar/excluir — nunca na carga
   * inicial. Renomear um setor muda o texto gravado em cada colaborador, e
   * sem isto a lista continuaria mostrando o nome antigo até um F5.
   */
  onMutacao?: () => void;
  disabled?: boolean;
  /** Total de pessoas contratado pela empresa, distribuído entre os setores. */
  limitePessoas?: number | null;
}> = ({ onChange, onMutacao, disabled, limitePessoas }) => {
  const { acesso } = useRhAccess();
  const [setores, setSetores] = useState<SetorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState('');
  const [novoEfetivo, setNovoEfetivo] = useState('');
  const [novosModelos, setNovosModelos] = useState<ModeloTrabalhoSetor[]>([]);
  const [novosTurnos, setNovosTurnos] = useState<TurnoSetor[]>([]);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [operacaoEditandoId, setOperacaoEditandoId] = useState<string | null>(null);
  const [operacaoModelos, setOperacaoModelos] = useState<ModeloTrabalhoSetor[]>([]);
  const [operacaoTurnos, setOperacaoTurnos] = useState<TurnoSetor[]>([]);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  // Rascunho por linha do campo de efetivo, para não gravar a cada tecla.
  const [efetivoEdit, setEfetivoEdit] = useState<Record<string, string>>({});
  // Destino escolhido na sugestão de união dos setores abaixo do piso.
  const [uniaoDestino, setUniaoDestino] = useState<Record<string, string>>({});
  // União aguardando confirmação. Os dois caminhos que levam a uma fusão
  // (renomear para um nome existente, e o botão de unir) desaguam aqui,
  // para haver um aviso só — e não duas redações que envelhecem separadas.
  const [uniao, setUniao] = useState<
    { setorId: string; origem: string; destino: string; pessoas: number } | null
  >(null);

  // Recolhido por padrão, mas abre sozinho enquanto não houver setor: é o
  // primeiro passo do onboarding, e escondê-lo atrás de um clique seria
  // esconder justamente o que o guia acabou de mandar fazer.
  const semSetores = !loading && setores.filter(s => s.ativo).length === 0;
  const [aberto, setAberto] = useSecaoAberta('#setores', semSetores);

  // Via ref: o callback costuma ser uma arrow inline no pai, e depender dele
  // em `load` recarregaria a lista a cada render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const load = useCallback(async () => {
    const lista = await rhService.getSetoresAdmin();
    setSetores(lista);
    setLoading(false);
    onChangeRef.current?.(lista.filter(s => s.ativo).map(s => s.nome));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const atualizar = (event?: Event) => {
      const empresaDoEvento = (event as CustomEvent<{ empresaId?: string }>)?.detail?.empresaId;
      if (!empresaDoEvento || empresaDoEvento === acesso.empresa_id) {
        setSugestoes(rhSetorSugestoes.listar(acesso.empresa_id));
      }
    };
    atualizar();
    window.addEventListener(rhSetorSugestoes.evento, atualizar);
    return () => window.removeEventListener(rhSetorSugestoes.evento, atualizar);
  }, [acesso.empresa_id]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    const efetivo = Number(novoEfetivo);
    if (!novoEfetivo.trim() || !Number.isInteger(efetivo) || efetivo <= 0) {
      toast.error('Informe a quantidade de pessoas do setor.');
      return;
    }
    const alocado = setores.filter(setor => setor.ativo).reduce((total, setor) => total + tamanhoSetor(setor), 0);
    if (limitePessoas != null && alocado + efetivo > limitePessoas) {
      toast.error(`Restam ${Math.max(0, limitePessoas - alocado)} pessoa(s) no limite contratado.`);
      return;
    }
    setSalvando(true);
    try {
      const res = await rhService.criarSetor(nome, efetivo, novosModelos, novosTurnos);
      if (!res.ok) { toast.error(res.error || 'Não foi possível criar o setor.'); return; }
      toast.success(res.reativado ? `Setor "${nome}" reativado.` : `Setor "${nome}" criado.`);
      rhSetorSugestoes.remover(acesso.empresa_id, nome);
      setNovo('');
      setNovoEfetivo('');
      setNovosModelos([]);
      setNovosTurnos([]);
      await load();
      onMutacao?.();
    } finally {
      setSalvando(false);
    }
  };

  const iniciarOperacao = (s: SetorAdmin) => {
    setOperacaoEditandoId(s.id);
    setOperacaoModelos(s.modelos_trabalho ?? []);
    setOperacaoTurnos(s.turnos ?? []);
  };

  const salvarOperacao = async (s: SetorAdmin) => {
    setSalvando(true);
    try {
      const res = await rhService.atualizarOperacaoSetor(s.id, operacaoModelos, operacaoTurnos);
      if (!res.ok) { toast.error(res.error || 'Não foi possível salvar a organização do setor.'); return; }
      toast.success(`Organização do setor "${s.nome}" atualizada.`);
      setOperacaoEditandoId(null);
      await load();
      onMutacao?.();
    } finally {
      setSalvando(false);
    }
  };

  const handleRenomear = async (s: SetorAdmin) => {
    const nome = editNome.trim();
    if (!nome || nome === s.nome) { setEditandoId(null); return; }

    setSalvando(true);
    try {
      let res = await rhService.renomearSetor(s.id, nome);

      // Nome de destino já existe: isto é uma FUSÃO de dois setores, não um
      // rename. Sai do fluxo e abre o diálogo de confirmação — antes era um
      // `confirm()` do navegador, que entrega uma operação irreversível como
      // um parágrafo cinza com dois botões iguais.
      if (!res.ok && res.fusao_possivel) {
        setUniao({ setorId: s.id, origem: s.nome, destino: res.destino ?? nome, pessoas: tamanhoSetor(s) });
        return;
      }

      if (!res.ok) { toast.error(res.error || 'Não foi possível renomear.'); return; }
      toast.success(res.fundido ? `Setores unidos em "${res.nome}".` : `Setor renomeado para "${res.nome}".`);
      setEditandoId(null);
      await load();
      onMutacao?.();
    } finally {
      setSalvando(false);
    }
  };

  /**
   * Une um setor pequeno demais a outro. É a mesma fusão do renomear, e é
   * DEFINITIVA: o setor de origem deixa de existir e o histórico dele passa
   * a contar no destino. Só abre o diálogo — quem executa é `confirmarUniao`.
   */
  const handleUnir = (s: SetorAdmin, destino: string) => {
    if (!destino) return;
    setUniao({ setorId: s.id, origem: s.nome, destino, pessoas: tamanhoSetor(s) });
  };

  /** Executa a fusão já confirmada, vinda de qualquer um dos dois caminhos. */
  const confirmarUniao = async () => {
    if (!uniao) return;
    setSalvando(true);
    try {
      const res = await rhService.renomearSetor(uniao.setorId, uniao.destino, true);
      if (!res.ok) { toast.error(res.error || 'Não foi possível unir os setores.'); return; }
      toast.success(`Setores unidos em "${res.nome}".`);
      setUniao(null);
      setEditandoId(null);
      await load();
      onMutacao?.();
    } finally {
      setSalvando(false);
    }
  };

  const handleEfetivo = async (s: SetorAdmin) => {
    const bruto = efetivoEdit[s.id];
    if (bruto === undefined) return;

    const atual = s.efetivo != null ? String(s.efetivo) : '';
    if (bruto.trim() === atual) { limparRascunho(s.id); return; }

    // Campo esvaziado = "não informado", que não é zero.
    const valor = bruto.trim() === '' ? null : Number(bruto);
    if (valor !== null && (!Number.isFinite(valor) || !Number.isInteger(valor))) {
      toast.error('Informe um número inteiro de pessoas.');
      limparRascunho(s.id);
      return;
    }

    const totalAtual = setores.filter(item => item.ativo).reduce((total, item) => total + tamanhoSetor(item), 0);
    const totalProjetado = totalAtual - (s.ativo ? tamanhoSetor(s) : 0)
      + (s.ativo ? Math.max(s.n, valor ?? 0) : 0);
    if (limitePessoas != null && totalProjetado > limitePessoas) {
      toast.error(`O total dos setores não pode ultrapassar o limite contratado de ${limitePessoas} pessoas.`);
      limparRascunho(s.id);
      return;
    }

    const res = await rhService.definirEfetivoSetor(s.id, valor);
    if (!res.ok) { toast.error(res.error || 'Não foi possível salvar o efetivo.'); limparRascunho(s.id); return; }
    limparRascunho(s.id);
    await load();
    onMutacao?.();
  };

  const limparRascunho = (id: string) =>
    setEfetivoEdit(prev => {
      const { [id]: _, ...resto } = prev;
      return resto;
    });

  const handleArquivar = async (s: SetorAdmin, ativo: boolean) => {
    const res = await rhService.arquivarSetor(s.id, ativo);
    if (!res.ok) { toast.error(res.error || 'Não foi possível atualizar o setor.'); return; }
    toast.success(ativo ? `Setor "${s.nome}" reativado.` : `Setor "${s.nome}" arquivado.`);
    await load();
    onMutacao?.();
  };

  const handleExcluir = async (s: SetorAdmin) => {
    if (!confirm(`Excluir o setor "${s.nome}"? Ele nunca foi usado, então nada do histórico é afetado.`)) return;
    const res = await rhService.excluirSetor(s.id);
    if (!res.ok) { toast.error(res.error || 'Não foi possível excluir.'); return; }
    toast.success(`Setor "${s.nome}" excluído.`);
    await load();
    onMutacao?.();
  };

  const ativos = setores.filter(s => s.ativo);
  const arquivados = setores.filter(s => !s.ativo);
  const visiveis = mostrarArquivados ? setores : ativos;
  const sugestoesPendentes = sugestoes.filter(nome => !setores.some(
    setor => setor.nome.trim().toLocaleLowerCase('pt-BR') === nome.trim().toLocaleLowerCase('pt-BR'),
  ));
  const totalAlocado = ativos.reduce((total, setor) => total + tamanhoSetor(setor), 0);
  const saldoPessoas = limitePessoas == null ? null : Math.max(0, limitePessoas - totalAlocado);
  const novoEfetivoNumero = Number(novoEfetivo);
  const novoEfetivoValido = novoEfetivo.trim().length > 0
    && Number.isInteger(novoEfetivoNumero) && novoEfetivoNumero > 0
    && (saldoPessoas == null || novoEfetivoNumero <= saldoPessoas);

  return (
    <div className="bg-white rounded-xl shadow p-5">
      {uniao && (
        <ConfirmarUniaoSetor
          uniao={uniao}
          salvando={salvando}
          onConfirmar={confirmarUniao}
          onCancelar={() => setUniao(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <CabecalhoColapsavel
          icone={<Layers className="w-5 h-5 text-[#7d4a3c]" />}
          titulo="Setores da empresa"
          contagem={ativos.length}
          aberto={aberto}
          onToggle={() => setAberto(v => !v)}
          desabilitado={loading}
        />
        {aberto && arquivados.length > 0 && (
          <button
            onClick={() => setMostrarArquivados(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {mostrarArquivados ? 'Ocultar arquivados' : `Ver arquivados (${arquivados.length})`}
          </button>
        )}
      </div>

      {!aberto ? (
        <ResumoRecolhido onAbrir={() => setAberto(true)}>
          {/* Sem o caso de loading, o resumo piscava "nenhum setor
              cadastrado" antes de a lista chegar. */}
          {loading
            ? 'Carregando...'
            : ativos.length === 0
              ? 'Nenhum setor cadastrado — clique para começar.'
              : ativos.map(s => s.nome).join(' · ')}
        </ResumoRecolhido>
      ) : (
      <>
      <p className="text-xs text-gray-500 mb-4 mt-1">
        Registre os setores em que a empresa quer agir. São eles que recortam os relatórios de
        bem-estar, absenteísmo e o plano de ação — e é desta lista que o cadastro do colaborador escolhe.
        O campo <strong>efetivo</strong> é quantas pessoas trabalham no setor, incluindo quem ainda não
        tem acesso ao Malama; é ele que mostra a cobertura real de cada setor.
      </p>

      {limitePessoas != null && (
        <div className={`mb-4 rounded-lg border px-3 py-3 ${totalAlocado > limitePessoas ? 'border-red-200 bg-red-50' : 'border-[#7d4a3c]/15 bg-[#7d4a3c]/5'}`}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-gray-700">Pessoas distribuídas nos setores</span>
            <span className={`font-semibold tabular-nums ${totalAlocado > limitePessoas ? 'text-red-700' : 'text-[#7d4a3c]'}`}>{totalAlocado} de {limitePessoas}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full ${totalAlocado > limitePessoas ? 'bg-red-500' : 'bg-[#7d4a3c]'}`} style={{ width: `${Math.min(100, limitePessoas > 0 ? (totalAlocado / limitePessoas) * 100 : 0)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">
            {totalAlocado > limitePessoas
              ? `A distribuição atual excede o contrato em ${totalAlocado - limitePessoas} pessoa(s). Reduza um setor para continuar.`
              : `${saldoPessoas} pessoa(s) ainda podem ser distribuídas. A soma dos efetivos não pode ultrapassar o limite contratado.`}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">
          Nenhum setor cadastrado ainda. Comece pelos setores que você quer acompanhar —
          depois é só apontar cada colaborador para um deles.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 mb-4">
          {visiveis.map(s => (
            <li key={s.id} className="py-2">
              <div className="flex items-center gap-2">
              {editandoId === s.id ? (
                <>
                  <input
                    autoFocus
                    value={editNome}
                    onChange={e => setEditNome(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleRenomear(s); }
                      if (e.key === 'Escape') setEditandoId(null);
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                  />
                  <button
                    onClick={() => handleRenomear(s)}
                    disabled={salvando}
                    title="Salvar"
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-40"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    title="Cancelar"
                    className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${s.ativo ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {s.nome}
                    <span className="ml-2 text-xs text-gray-400">
                      {s.efetivo != null
                        ? `${s.n} de ${s.efetivo} com acesso`
                        : s.n === 1 ? '1 com acesso' : `${s.n} com acesso`}
                    </span>
                  </span>

                  {/* Efetivo do setor: quantas pessoas trabalham nele, incluindo
                      quem não usa o Malama. É outro número, não a contagem de
                      cadastrados — e só a empresa sabe qual é. */}
                  <input
                    type="number" min={s.n} max={limitePessoas ?? 100000}
                    value={efetivoEdit[s.id] ?? (s.efetivo != null ? String(s.efetivo) : '')}
                    onChange={e => setEfetivoEdit(prev => ({ ...prev, [s.id]: e.target.value }))}
                    onBlur={() => handleEfetivo(s)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    disabled={disabled}
                    placeholder="efetivo"
                    title="Total de pessoas que trabalham no setor, mesmo sem acesso ao Malama"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-600 text-right focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:opacity-40"
                  />

                  {s.ativo && (
                    <button
                      onClick={() => { setEditandoId(s.id); setEditNome(s.nome); }}
                      disabled={disabled}
                      title="Renomear"
                      className="p-1.5 text-gray-400 hover:text-[#7d4a3c] hover:bg-gray-50 rounded-lg transition disabled:opacity-40"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {s.ativo && (
                    <button
                      onClick={() => iniciarOperacao(s)}
                      disabled={disabled}
                      title="Configurar modalidade e turnos"
                      className="p-1.5 text-gray-400 hover:text-[#7d4a3c] hover:bg-gray-50 rounded-lg transition disabled:opacity-40"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleArquivar(s, !s.ativo)}
                    disabled={disabled}
                    title={s.ativo ? 'Arquivar (some dos seletores, o histórico fica)' : 'Reativar'}
                    className="p-1.5 text-gray-400 hover:text-[#7d4a3c] hover:bg-gray-50 rounded-lg transition disabled:opacity-40"
                  >
                    {s.ativo ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                  </button>

                  {/* Excluir só existe para setor sem nenhum histórico. */}
                  {!s.em_uso && s.n === 0 && (
                    <button
                      onClick={() => handleExcluir(s)}
                      disabled={disabled}
                      title="Excluir"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              </div>

              {operacaoEditandoId !== s.id && ((s.modelos_trabalho?.length ?? 0) > 0 || (s.turnos?.length ?? 0) > 0) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                  {(s.modelos_trabalho ?? []).map(item => (
                    <span key={`modelo-${item}`} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">{rotulo(item)}</span>
                  ))}
                  {(s.turnos ?? []).map(item => (
                    <span key={`turno-${item}`} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{rotulo(item)}</span>
                  ))}
                </div>
              )}

              {operacaoEditandoId === s.id && (
                <div className="mt-2 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <GrupoCheckbox
                    titulo="Modelo de trabalho · selecione os que se aplicam"
                    opcoes={MODELOS}
                    selecionados={operacaoModelos}
                    onToggle={valor => setOperacaoModelos(atual => alternar(atual, valor as ModeloTrabalhoSetor))}
                    disabled={disabled || salvando}
                  />
                  <GrupoCheckbox
                    titulo="Turnos · selecione os que se aplicam"
                    opcoes={TURNOS}
                    selecionados={operacaoTurnos}
                    onToggle={valor => setOperacaoTurnos(atual => alternar(atual, valor as TurnoSetor))}
                    disabled={disabled || salvando}
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setOperacaoEditandoId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500">Cancelar</button>
                    <button type="button" onClick={() => salvarOperacao(s)} disabled={disabled || salvando} className="rounded-md bg-[#7d4a3c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Salvar</button>
                  </div>
                </div>
              )}

              {/* Setor abaixo do piso de coorte: os relatórios não o mostram
                  separadamente, então as pessoas dele ficam sem leitura — é
                  onde o colaborador vira avulso. A saída oferecida é unir a um
                  setor próximo, com o custo dito na confirmação. */}
              {s.ativo && tamanhoSetor(s) > 0 && tamanhoSetor(s) < PISO_COORTE && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 min-w-[14rem]">
                    {tamanhoSetor(s)} pessoa(s) — abaixo do piso de {PISO_COORTE}. Este setor não
                    aparece separadamente nos relatórios, para não identificar ninguém.
                  </span>
                  <select
                    value={uniaoDestino[s.id] ?? ''}
                    onChange={e => setUniaoDestino(prev => ({ ...prev, [s.id]: e.target.value }))}
                    disabled={disabled || salvando}
                    className="px-2 py-1 border border-amber-200 rounded-md bg-white text-xs text-gray-700 focus:ring-2 focus:ring-[#7d4a3c] focus:outline-none disabled:opacity-50"
                  >
                    <option value="">unir a...</option>
                    {ativos.filter(o => o.id !== s.id).map(o => (
                      <option key={o.id} value={o.nome}>{o.nome}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleUnir(s, uniaoDestino[s.id] ?? '')}
                    disabled={disabled || salvando || !uniaoDestino[s.id]}
                    className="px-2.5 py-1 rounded-md bg-[#7d4a3c] text-white font-medium hover:bg-[#623a2f] transition disabled:opacity-40"
                  >
                    Unir
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {sugestoesPendentes.length > 0 && (
        <div className="mb-3 rounded-lg border border-[#7d4a3c]/10 bg-[#7d4a3c]/5 p-3">
          <p className="mb-2 text-xs font-medium text-gray-700">Setores sugeridos pelo copiloto · revise antes de criar</p>
          <div className="flex flex-wrap gap-2">
            {sugestoesPendentes.map(nome => (
              <span key={nome} className="inline-flex items-center overflow-hidden rounded-full border border-[#7d4a3c]/20 bg-white text-xs text-[#7d4a3c]">
                <button type="button" onClick={() => setNovo(nome)} className="px-3 py-1.5 font-medium hover:bg-[#7d4a3c]/5">{nome}</button>
                <button type="button" onClick={() => rhSetorSugestoes.remover(acesso.empresa_id, nome)} aria-label={`Descartar sugestão ${nome}`} className="border-l border-[#7d4a3c]/10 px-1.5 py-1.5 hover:bg-[#7d4a3c]/5"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleCriar} className="space-y-3 rounded-lg border border-gray-100 p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Nome do setor</span>
            <input
              type="text"
              value={novo}
              onChange={e => setNovo(e.target.value)}
              placeholder="Ex.: Operações"
              maxLength={60}
              disabled={disabled || salvando}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Quantidade de pessoas</span>
            <input
              type="number"
              min={1}
              max={saldoPessoas ?? 100000}
              value={novoEfetivo}
              onChange={e => setNovoEfetivo(e.target.value)}
              placeholder={saldoPessoas == null ? 'Efetivo' : `Até ${saldoPessoas}`}
              disabled={disabled || salvando || saldoPessoas === 0}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
          </label>
          <button
            type="submit"
            disabled={disabled || salvando || !novo.trim() || !novoEfetivoValido}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
        {limitePessoas != null && (
          <p className="text-[11px] text-gray-500">Disponível no contrato: {saldoPessoas} de {limitePessoas} pessoa(s).</p>
        )}
        <GrupoCheckbox
          titulo="Modelo de trabalho · selecione os que se aplicam"
          opcoes={MODELOS}
          selecionados={novosModelos}
          onToggle={valor => setNovosModelos(atual => alternar(atual, valor as ModeloTrabalhoSetor))}
          disabled={disabled || salvando}
        />
        <GrupoCheckbox
          titulo="Turnos · selecione os que se aplicam"
          opcoes={TURNOS}
          selecionados={novosTurnos}
          onToggle={valor => setNovosTurnos(atual => alternar(atual, valor as TurnoSetor))}
          disabled={disabled || salvando}
        />
      </form>
      </>
      )}
    </div>
  );
};
