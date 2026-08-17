// =====================================================
// Malama — Portal do RH · Aba Plano de ação (NR-1 / GRO)
//
// Fecha o ciclo: identificar → avaliar → CONTROLAR → verificar.
//
// Duas regras que a tela impõe de propósito, porque são o que dá valor
// jurídico ao documento:
//   1. Concluir exige EVIDÊNCIA de execução (validado também no banco).
//   2. Setor em risco ocupacional tratado só com medida individual é
//      sinalizado. Cuidado individual não é errado — mas sozinho não
//      encerra risco de fonte na hierarquia de controle da NR-1.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Plus, X, Info, AlertTriangle, CheckCircle2, Clock,
  Trash2, CalendarClock, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LiderancaEvolucao } from '../../components/rh/LiderancaEvolucao';
import {
  rhService,
  type PlanoAcao, type RhPlanosResumo, type SetorEmpresa,
  type PlanoFator, type PlanoNivel, type PlanoStatus,
} from '../../services/empresaService';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const FATORES: { v: PlanoFator; label: string }[] = [
  { v: 'demanda',        label: 'Cobrança / ritmo de trabalho' },
  { v: 'controle',       label: 'Autonomia para decidir o trabalho' },
  { v: 'apoio',          label: 'Apoio social e liderança' },
  { v: 'assedio',        label: 'Assédio e violência' },
  { v: 'jornada',        label: 'Jornada e escalas' },
  { v: 'reconhecimento', label: 'Reconhecimento e recompensa' },
  { v: 'outro',          label: 'Outro' },
];
const FATOR_LABEL = Object.fromEntries(FATORES.map(f => [f.v, f.label]));

const NIVEIS: { v: PlanoNivel; label: string; ajuda: string }[] = [
  { v: 'fonte',          label: 'Na fonte',
    ajuda: 'Elimina ou reduz o fator de risco na origem (redimensionar carga, rever metas, alterar escala).' },
  { v: 'organizacional', label: 'Organizacional',
    ajuda: 'Muda como o trabalho é gerido (treinar liderança, criar pausas, revisar fluxo de comunicação).' },
  { v: 'individual',     label: 'Individual',
    ajuda: 'Cuida de quem já foi afetado (acolhimento, encaminhamento). Sozinha não encerra risco de fonte.' },
];
const NIVEL_LABEL = Object.fromEntries(NIVEIS.map(n => [n.v, n.label]));

const STATUS_INFO: Record<PlanoStatus, { label: string; cls: string }> = {
  planejada:    { label: 'Planejada',    cls: 'bg-gray-100 text-gray-600' },
  em_andamento: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-700' },
  concluida:    { label: 'Concluída',    cls: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',    cls: 'bg-gray-100 text-gray-400' },
};

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white ' +
  'focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent';

// ─── Formulário ────────────────────────────────────────
const NovoItem: React.FC<{
  setores: SetorEmpresa[];
  onCriado: () => void;
  onFechar: () => void;
}> = ({ setores, onCriado, onFechar }) => {
  const prazoPadrao = new Date();
  prazoPadrao.setMonth(prazoPadrao.getMonth() + 3);

  const [setor, setSetor] = useState('');
  const [fator, setFator] = useState<PlanoFator>('demanda');
  const [risco, setRisco] = useState('');
  const [medida, setMedida] = useState('');
  const [nivel, setNivel] = useState<PlanoNivel>('fonte');
  const [responsavel, setResponsavel] = useState('');
  const [prazo, setPrazo] = useState(iso(prazoPadrao));
  const [salvando, setSalvando] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await rhService.criarPlanoAcao({
        setor, origem: 'manual', fator,
        risco_descricao: risco, medida, nivel_controle: nivel,
        responsavel, prazo,
      });
      if (!res.ok) { toast.error(res.error || 'Não foi possível criar o item.'); return; }
      toast.success('Item adicionado ao plano de ação.');
      onCriado();
    } finally {
      setSalvando(false);
    }
  };

  const ajudaNivel = NIVEIS.find(n => n.v === nivel)?.ajuda;

  return (
    <form onSubmit={submeter} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Novo item</p>
        <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Setor</label>
          <select value={setor} onChange={e => setSetor(e.target.value)} className={inputCls}>
            <option value="">Toda a empresa</option>
            {setores.map(s => <option key={s.setor} value={s.setor}>{s.setor}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fator de risco</label>
          <select
            value={fator} onChange={e => setFator(e.target.value as PlanoFator)} className={inputCls}
          >
            {FATORES.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Risco identificado</label>
        <textarea
          required value={risco} onChange={e => setRisco(e.target.value)} rows={2}
          className={inputCls}
          placeholder="Ex.: Cobrança alta com pouca autonomia no setor, carga de trabalho 78 e bem-estar 39."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Medida de controle</label>
        <textarea
          required value={medida} onChange={e => setMedida(e.target.value)} rows={2}
          className={inputCls}
          placeholder="Ex.: Redimensionar a fila de atendimento e contratar 2 posições no turno da tarde."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Nível de controle</label>
        <div className="flex flex-wrap gap-1.5">
          {NIVEIS.map(n => (
            <button
              key={n.v} type="button" onClick={() => setNivel(n.v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                nivel === n.v
                  ? 'border-[#7d4a3c] bg-[#7d4a3c] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        {ajudaNivel && <p className="text-xs text-gray-500 mt-1.5 leading-snug">{ajudaNivel}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
          <input
            required value={responsavel} onChange={e => setResponsavel(e.target.value)}
            className={inputCls} placeholder="Nome ou cargo dentro da empresa"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prazo</label>
          <input
            type="date" required value={prazo} onChange={e => setPrazo(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <button
        type="submit" disabled={salvando}
        className="px-5 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Adicionar ao plano'}
      </button>
    </form>
  );
};

// ─── Página ────────────────────────────────────────────
export const RhPlanoAcao: React.FC = () => {
  const parametrosIniciais = new URLSearchParams(window.location.search);
  const [itens, setItens] = useState<PlanoAcao[]>([]);
  const [resumo, setResumo] = useState<RhPlanosResumo | null>(null);
  const [setores, setSetores] = useState<SetorEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [visao, setVisao] = useState<'plano' | 'lideranca'>(() =>
    parametrosIniciais.get('visao') === 'lideranca' ? 'lideranca' : 'plano',
  );
  const abrirNovaJornada = parametrosIniciais.get('nova') === '1';
  const setorInicial = parametrosIniciais.get('setor');
  // Ciclo a focar ao trocar de aba. Estado, e não query param: a troca
  // acontece dentro da mesma rota, e um <Link> para o mesmo caminho não
  // reexecutaria a leitura de `window.location.search`.
  const [cicloFoco, setCicloFoco] = useState<string | null>(parametrosIniciais.get('ciclo'));

  const load = useCallback(async () => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 6);
    try {
      const [i, r, s] = await Promise.all([
        rhService.getPlanosAcao(),
        rhService.getPlanosResumo(iso(inicio), iso(fim)),
        rhService.getSetores(),
      ]);
      setItens(i); setResumo(r); setSetores(s);
    } catch {
      toast.error('Erro ao carregar o plano de ação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mudarStatus = async (item: PlanoAcao, status: PlanoStatus) => {
    let evidencia: string | undefined;
    if (status === 'concluida') {
      // Evidência é condição de conclusão — o banco recusa sem ela.
      const resp = prompt(
        'O que comprova que esta medida foi executada?\n' +
        '(ex.: ata da reunião de 12/08, nova escala publicada, turma treinada em 03/09)',
        item.evidencia ?? '',
      );
      if (resp === null) return;
      if (!resp.trim()) { toast.error('Sem evidência não dá para concluir o item.'); return; }
      evidencia = resp.trim();
    }
    const res = await rhService.atualizarPlanoAcao(item.id, status, evidencia);
    if (!res.ok) { toast.error(res.error || 'Não foi possível atualizar.'); return; }
    toast.success('Item atualizado.');
    load();
  };

  const excluir = async (item: PlanoAcao) => {
    if (!confirm('Excluir este item do plano de ação?')) return;
    const res = await rhService.excluirPlanoAcao(item.id);
    if (!res.ok) { toast.error(res.error || 'Não foi possível excluir.'); return; }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  const lacunas = resumo?.setores_sem_acao_na_fonte ?? [];

  return (
    <div className="space-y-6">
      <div className="inline-flex max-w-full rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setVisao('plano')}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            visao === 'plano'
              ? 'bg-[#7d4a3c] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Plano de ação
        </button>
        <button
          type="button"
          onClick={() => setVisao('lideranca')}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            visao === 'lideranca'
              ? 'bg-[#7d4a3c] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Evolução da liderança
        </button>
      </div>

      {/* As duas abas pareciam a mesma coisa, porque as duas criam medida com
          responsável e prazo. A diferença é a direção: uma é a conversa que
          PRODUZ a medida, a outra é o registro que a SUSTENTA. Dizer isso na
          tela é mais barato do que esperar que o RH deduza. */}
      <p className="-mt-2 max-w-3xl text-xs leading-relaxed text-gray-500">
        {visao === 'lideranca'
          ? 'Aqui é a conversa com cada liderança: o que está funcionando, o que precisa melhorar e até três combinados por setor. Todo combinado registrado vira automaticamente um item do Plano de ação, com prazo e evidência.'
          : 'Este é o registro formal de todas as medidas — as que nasceram da conversa com a liderança e as que você adiciona direto aqui. É esta lista que a fiscalização lê.'}
      </p>

      {visao === 'lideranca' ? (
        <LiderancaEvolucao
          setores={setores}
          abrirNovo={abrirNovaJornada}
          setorInicial={setorInicial}
          cicloFoco={cicloFoco}
          onVerNoPlano={() => { setCicloFoco(null); setVisao('plano'); }}
        />
      ) : (
        <>
      {/* ── Alerta: risco de fonte tratado só no indivíduo ── */}
      {lacunas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 mb-1">
              Risco ocupacional sem medida sobre a fonte
            </p>
            <p className="text-amber-800 leading-snug">
              {lacunas.join(', ')} {lacunas.length === 1 ? 'está classificado' : 'estão classificados'}{' '}
              como risco ocupacional na matriz, mas não {lacunas.length === 1 ? 'tem' : 'têm'} nenhuma
              medida <strong>na fonte</strong> ou <strong>organizacional</strong> registrada.
            </p>
            <p className="text-amber-700 text-xs mt-1.5 leading-snug">
              A NR-1 trabalha com hierarquia de controle: cuidado individual é a última camada, não
              substituto de agir sobre a organização do trabalho. Um relatório que documenta o risco
              sem medida na fonte é, na prática, registro de que a empresa sabia e não agiu.
            </p>
          </div>
        </div>
      )}

      {/* ── Cabeçalho + indicadores ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Plano de ação</h2>
            <span className="text-xs text-gray-400">{itens.length}</span>
          </div>
          {!criando && (
            <button
              onClick={() => setCriando(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Novo item
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          As medidas de controle dos riscos identificados, com responsável, prazo e evidência de
          execução. É esta etapa que fecha o ciclo exigido pela NR-1.
        </p>

        {criando && (
          <NovoItem
            setores={setores}
            onCriado={() => { setCriando(false); load(); }}
            onFechar={() => setCriando(false)}
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{resumo?.total ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Itens</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{resumo?.abertas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Em aberto</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-green-600">{resumo?.concluidas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Concluídas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <CalendarClock className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-bold ${(resumo?.atrasadas ?? 0) > 0 ? 'text-red-500' : 'text-gray-800'}`}>
              {resumo?.atrasadas ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Fora do prazo</p>
          </div>
        </div>
      </div>

      {/* ── Lista ── */}
      {itens.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum item no plano ainda.</p>
          <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto leading-snug">
            Comece pelos setores que a matriz de risco apontou. Sem plano de ação, o diagnóstico
            documenta o risco sem endereçá-lo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map(it => (
            <div
              key={it.id}
              className={`bg-white rounded-xl shadow p-4 border-l-4 ${
                it.atrasada ? 'border-l-red-400'
                : it.status === 'concluida' ? 'border-l-green-400'
                : 'border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_INFO[it.status].cls}`}>
                      {STATUS_INFO[it.status].label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {it.setor ?? 'Toda a empresa'} · {FATOR_LABEL[it.fator]}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      it.nivel_controle === 'individual'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-[#7d4a3c]/10 text-[#7d4a3c]'
                    }`}>
                      {NIVEL_LABEL[it.nivel_controle]}
                    </span>
                    {it.atrasada && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">
                        Fora do prazo
                      </span>
                    )}
                    {/* De onde a medida veio. Sem isto, um combinado nascido
                        na conversa com a liderança ficava idêntico a um item
                        digitado à mão aqui — e as duas abas passavam a
                        impressão de ser a mesma coisa duplicada. */}
                    {/* Clicável: leva à conversa que gerou esta medida. O
                        vínculo existia no banco desde a 20260837 e não tinha
                        caminho nenhum na tela — era o que fazia as duas abas
                        parecerem listas paralelas. */}
                    {it.lideranca_ciclo_id && (
                      <button
                        type="button"
                        onClick={() => { setCicloFoco(it.lideranca_ciclo_id!); setVisao('lideranca'); }}
                        title="Abrir a conversa com a liderança que originou esta medida"
                        className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {it.lideranca_setor
                          ? `Combinado com a liderança de ${it.lideranca_setor}`
                          : 'Combinado com a liderança'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-snug">{it.risco_descricao}</p>
                  <p className="text-sm text-gray-600 leading-snug mt-1">
                    <span className="text-gray-400">Medida:</span> {it.medida}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {it.responsavel} · prazo {fmtDate(it.prazo)}
                    {it.concluida_em && ` · concluída em ${fmtDate(it.concluida_em)}`}
                  </p>
                  {it.evidencia && (
                    <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 leading-snug">
                      <span className="text-gray-400">Evidência:</span> {it.evidencia}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {it.status === 'planejada' && (
                    <button
                      onClick={() => mudarStatus(it, 'em_andamento')}
                      className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
                    >
                      Iniciar
                    </button>
                  )}
                  {(it.status === 'planejada' || it.status === 'em_andamento') && (
                    <>
                      <button
                        onClick={() => mudarStatus(it, 'concluida')}
                        className="px-2.5 py-1 text-xs font-medium bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg transition whitespace-nowrap"
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => mudarStatus(it, 'cancelada')}
                        title="Cancelar item"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => excluir(it)}
                    title="Excluir"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Concluir um item exige descrever a evidência de execução — item marcado como feito sem
          nada que comprove é pior que item em aberto num documento que vai ao PGR. O plano de ação
          é da empresa; a Malama registra e organiza, sem assumir a responsabilidade técnica do
          PGR/PCMSO nem das decisões de gestão.
        </span>
      </div>
        </>
      )}
    </div>
  );
};
