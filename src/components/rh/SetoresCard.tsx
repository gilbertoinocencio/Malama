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
import { Layers, Plus, Pencil, Archive, ArchiveRestore, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhService, type SetorAdmin } from '../../services/empresaService';

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
}> = ({ onChange, onMutacao, disabled }) => {
  const [setores, setSetores] = useState<SetorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  // Rascunho por linha do campo de efetivo, para não gravar a cada tecla.
  const [efetivoEdit, setEfetivoEdit] = useState<Record<string, string>>({});

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

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    setSalvando(true);
    try {
      const res = await rhService.criarSetor(nome);
      if (!res.ok) { toast.error(res.error || 'Não foi possível criar o setor.'); return; }
      toast.success(res.reativado ? `Setor "${nome}" reativado.` : `Setor "${nome}" criado.`);
      setNovo('');
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

      // Nome de destino já existe: isto é uma FUSÃO de duas coortes, não um
      // rename. Confirmação explícita porque muda relatório histórico e pode
      // invalidar um link de campanha já divulgado.
      if (!res.ok && res.fusao_possivel) {
        const ok = confirm(
          `Já existe o setor "${res.destino}".\n\n` +
          `Unir "${s.nome}" em "${res.destino}"? As pessoas, os afastamentos, os atendimentos ` +
          `e os itens do plano de ação passam para "${res.destino}", e os relatórios anteriores ` +
          `passam a contar as duas coortes juntas.\n\n` +
          `Se as duas já receberam link da mesma campanha, o link de "${s.nome}" deixa de funcionar.`
        );
        if (!ok) return;
        res = await rhService.renomearSetor(s.id, nome, true);
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

    const res = await rhService.definirEfetivoSetor(s.id, valor);
    if (!res.ok) { toast.error(res.error || 'Não foi possível salvar o efetivo.'); limparRascunho(s.id); return; }
    limparRascunho(s.id);
    await load();
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

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Setores da empresa</h2>
          <span className="text-xs text-gray-400">{ativos.length}</span>
        </div>
        {arquivados.length > 0 && (
          <button
            onClick={() => setMostrarArquivados(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {mostrarArquivados ? 'Ocultar arquivados' : `Ver arquivados (${arquivados.length})`}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Registre os setores em que a empresa quer agir. São eles que recortam os relatórios de
        bem-estar, absenteísmo e o plano de ação — e é desta lista que o cadastro do colaborador escolhe.
        O campo <strong>efetivo</strong> é quantas pessoas trabalham no setor, incluindo quem ainda não
        tem acesso ao Malama; é ele que mostra a cobertura real de cada setor.
      </p>

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
            <li key={s.id} className="flex items-center gap-2 py-2">
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
                    type="number" min={s.n} max={100000}
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
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCriar} className="flex gap-2">
        <input
          type="text"
          value={novo}
          onChange={e => setNovo(e.target.value)}
          placeholder="Novo setor (ex.: Operações)"
          maxLength={60}
          disabled={disabled || salvando}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={disabled || salvando || !novo.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>
    </div>
  );
};
