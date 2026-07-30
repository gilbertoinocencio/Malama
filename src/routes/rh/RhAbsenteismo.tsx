// =====================================================
// Malama — Portal do RH · Aba Absenteísmo
//
// Lançamento e leitura de afastamentos (atestados) e atendimentos de
// ambulatório. Os registros NÃO apontam para pessoa nenhuma — só setor,
// capítulo de CID e dias. O atestado a empresa já recebe por lei; o que
// entra aqui é o mínimo que produz o indicador, e nada além disso.
//
// Piso de privacidade: aqui o corte é pelo TAMANHO do setor, não pelo
// número de eventos. Contagem agregada num setor de 3 pessoas identifica.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarX2, Stethoscope, Plus, X, Info, Brain, TrendingDown,
  Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService,
  // Alias: o tipo e o componente desta página têm o mesmo nome, e as duas
  // declarações no mesmo módulo colidem.
  type RhAbsenteismo as AbsenteismoResumo,
  type RhAmbulatorio as AmbulatorioResumo,
  type SetorEmpresa,
  type AfastamentoLancamento, type AmbulatorioLancamento,
} from '../../services/empresaService';
// Fonte única dos capítulos — compartilhada com a ingestão do eSocial.
import { CID_GRUPOS, CID_LABEL } from '../../lib/cid';

const iso = (d: Date) => d.toISOString().slice(0, 10);
// 'T00:00:00' evita o deslocamento de um dia que Date('YYYY-MM-DD') causa
// ao interpretar a string como UTC no fuso do Brasil.
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

type PeriodoPreset = 'tri' | 'semestre' | 'ano';
const PERIODO_MESES: Record<PeriodoPreset, number> = { tri: 3, semestre: 6, ano: 12 };
const PERIODO_LABEL: Record<PeriodoPreset, string> = {
  tri: 'Trimestre', semestre: 'Semestre', ano: 'Ano',
};

function periodoRange(preset: PeriodoPreset) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - PERIODO_MESES[preset]);
  return { inicio: iso(inicio), fim: iso(fim) };
}

const CATEGORIAS: { valor: string; label: string }[] = [
  { valor: 'ansiedade_estresse',     label: 'Ansiedade / estresse' },
  { valor: 'cefaleia',               label: 'Cefaleia' },
  { valor: 'dor_musculoesqueletica', label: 'Dor musculoesquelética' },
  { valor: 'gastrointestinal',       label: 'Gastrointestinal' },
  { valor: 'respiratorio',           label: 'Respiratório' },
  { valor: 'cardiovascular',         label: 'Cardiovascular' },
  { valor: 'curativo_procedimento',  label: 'Curativo / procedimento' },
  { valor: 'medicacao',              label: 'Medicação' },
  { valor: 'outro',                  label: 'Outro' },
];

const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIAS.map(c => [c.valor, c.label])
);

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white ' +
  'focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent';

// ─── Formulário de afastamento ─────────────────────────
const FormAfastamento: React.FC<{
  setores: SetorEmpresa[];
  onSalvo: () => void;
  onFechar: () => void;
}> = ({ setores, onSalvo, onFechar }) => {
  const [setor, setSetor] = useState('');
  const [grupo, setGrupo] = useState('F');
  const [dias, setDias] = useState('');
  const [data, setData] = useState(iso(new Date()));
  const [salvando, setSalvando] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(dias, 10);
    if (!Number.isInteger(n) || n <= 0) { toast.error('Informe os dias de afastamento.'); return; }
    setSalvando(true);
    try {
      const res = await rhService.lancarAfastamento(setor, grupo, n, data);
      if (!res.ok) { toast.error(res.error || 'Não foi possível lançar.'); return; }
      toast.success('Afastamento registrado.');
      setDias('');
      onSalvo();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={submeter} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lançar afastamento</p>
        <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Setor</label>
          <select value={setor} onChange={e => setSetor(e.target.value)} className={inputCls}>
            <option value="">Sem setor</option>
            {setores.map(s => <option key={s.setor} value={s.setor}>{s.setor}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Capítulo do CID</label>
          <select value={grupo} onChange={e => setGrupo(e.target.value)} className={inputCls}>
            {CID_GRUPOS.map(g => <option key={g.letra} value={g.letra}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dias de afastamento</label>
          <input
            type="number" min="1" max="365" value={dias}
            onChange={e => setDias(e.target.value)} className={inputCls} placeholder="3"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Início do afastamento</label>
          <input
            type="date" value={data} max={iso(new Date())}
            onChange={e => setData(e.target.value)} className={inputCls}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-snug">
        Informe apenas a <strong>letra do capítulo</strong> do CID que consta no atestado — nunca o
        código completo. Não guardamos o atestado, o nome do colaborador nem o nome do médico.
      </p>

      <button
        type="submit" disabled={salvando}
        className="px-5 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Registrar'}
      </button>
    </form>
  );
};

// ─── Formulário de ambulatório ─────────────────────────
const FormAmbulatorio: React.FC<{
  setores: SetorEmpresa[];
  onSalvo: () => void;
  onFechar: () => void;
}> = ({ setores, onSalvo, onFechar }) => {
  const [setor, setSetor] = useState('');
  const [categoria, setCategoria] = useState('ansiedade_estresse');
  const [data, setData] = useState(iso(new Date()));
  const [salvando, setSalvando] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await rhService.lancarAmbulatorio(setor, categoria, data);
      if (!res.ok) { toast.error(res.error || 'Não foi possível lançar.'); return; }
      toast.success('Atendimento registrado.');
      onSalvo();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={submeter} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lançar atendimento</p>
        <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Setor</label>
          <select value={setor} onChange={e => setSetor(e.target.value)} className={inputCls}>
            <option value="">Sem setor</option>
            {setores.map(s => <option key={s.setor} value={s.setor}>{s.setor}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Queixa</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls}>
            {CATEGORIAS.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
          <input
            type="date" value={data} max={iso(new Date())}
            onChange={e => setData(e.target.value)} className={inputCls}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-snug">
        Registre a <strong>queixa</strong>, não o diagnóstico. É um sinal precoce: o pico de uma
        queixa num setor costuma aparecer meses antes do afastamento.
      </p>

      <button
        type="submit" disabled={salvando}
        className="px-5 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Registrar'}
      </button>
    </form>
  );
};

/**
 * Lançamentos recentes, para conferir e desfazer erro de digitação.
 * Sem isto o indicador carrega o erro para sempre: os blocos acima só
 * mostram agregados, então nem dá para saber qual linha está errada.
 * Correção é apagar e relançar — não há edição, por design.
 */
const ListaLancamentos: React.FC<{
  titulo: string;
  linhas: { id: string; data: string; setor: string | null; descricao: string; extra?: string }[];
  onExcluir: (id: string) => void;
}> = ({ titulo, linhas, onExcluir }) => {
  const [aberta, setAberta] = useState(false);

  if (linhas.length === 0) return null;

  return (
    <div className="mt-5 border-t border-gray-100 pt-3">
      <button
        onClick={() => setAberta(a => !a)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition"
      >
        {aberta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {titulo} ({linhas.length})
      </button>

      {aberta && (
        <>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {linhas.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition">
                    <td className="py-1.5 text-gray-500 text-xs whitespace-nowrap tabular-nums w-24">
                      {fmtDate(l.data)}
                    </td>
                    <td className="py-1.5 text-gray-500 text-xs">{l.setor || 'Sem setor'}</td>
                    <td className="py-1.5 text-gray-700">{l.descricao}</td>
                    <td className="py-1.5 text-gray-500 text-xs text-right whitespace-nowrap">
                      {l.extra ?? ''}
                    </td>
                    <td className="py-1.5 text-right w-10">
                      <button
                        onClick={() => onExcluir(l.id)}
                        title="Excluir lançamento"
                        className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-snug">
            Lançamento errado se corrige apagando e relançando — não há edição, para o registro
            não mudar em silêncio depois de ter entrado num documento.
          </p>
        </>
      )}
    </div>
  );
};

/** Barra proporcional simples — mark fino, sem bloco saturado. */
const Barra: React.FC<{ valor: number; max: number; destaque?: boolean }> = ({ valor, max, destaque }) => (
  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[48px]">
    <div
      className="h-full rounded-full"
      style={{ width: `${max > 0 ? (valor / max) * 100 : 0}%`, background: destaque ? '#d03b3b' : '#7d4a3c' }}
    />
  </div>
);

// ─── Página ────────────────────────────────────────────
export const RhAbsenteismo: React.FC = () => {
  const [periodo, setPeriodo] = useState<PeriodoPreset>('semestre');
  const [abs, setAbs] = useState<AbsenteismoResumo | null>(null);
  const [amb, setAmb] = useState<AmbulatorioResumo | null>(null);
  const [setores, setSetores] = useState<SetorEmpresa[]>([]);
  const [lancAfast, setLancAfast] = useState<AfastamentoLancamento[]>([]);
  const [lancAmb, setLancAmb] = useState<AmbulatorioLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [formAfast, setFormAfast] = useState(false);
  const [formAmb, setFormAmb] = useState(false);

  const load = useCallback(async () => {
    const { inicio, fim } = periodoRange(periodo);
    try {
      const [a, b, s, la, lb] = await Promise.all([
        rhService.getAbsenteismo(inicio, fim),
        rhService.getAmbulatorio(inicio, fim),
        rhService.getSetores(),
        rhService.getLancamentosAfastamento(inicio, fim),
        rhService.getLancamentosAmbulatorio(inicio, fim),
      ]);
      setAbs(a); setAmb(b); setSetores(s);
      setLancAfast(la); setLancAmb(lb);
    } catch {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { load(); }, [load]);

  const excluirAfast = async (id: string) => {
    if (!confirm('Excluir este lançamento? O indicador será recalculado.')) return;
    const res = await rhService.excluirAfastamento(id);
    if (!res.ok) { toast.error(res.error || 'Não foi possível excluir.'); return; }
    toast.success('Lançamento excluído.');
    load();
  };

  const excluirAmb = async (id: string) => {
    if (!confirm('Excluir este lançamento? O indicador será recalculado.')) return;
    const res = await rhService.excluirAmbulatorio(id);
    if (!res.ok) { toast.error(res.error || 'Não foi possível excluir.'); return; }
    toast.success('Lançamento excluído.');
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  const diasF = abs?.grupos.find(g => g.grupo === 'F')?.dias ?? 0;
  const pctF = abs && abs.total_dias > 0 ? Math.round((diasF / abs.total_dias) * 100) : 0;
  const maxDiasGrupo = Math.max(1, ...(abs?.grupos.map(g => g.dias) ?? [1]));
  const maxDiasSetor = Math.max(1, ...(abs?.setores.map(s => s.dias) ?? [1]));
  const maxCat = Math.max(1, ...(amb?.categorias.map(c => c.atendimentos) ?? [1]));

  return (
    <div className="space-y-6">
      {/* Filtro único, acima de tudo que ele escopa */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Registros no período
        </span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(Object.keys(PERIODO_LABEL) as PeriodoPreset[]).map(p => (
            <button
              key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                periodo === p ? 'bg-white text-[#7d4a3c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIODO_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Absenteísmo ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarX2 className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Absenteísmo por causa</h2>
          </div>
          {!formAfast && (
            <button
              onClick={() => setFormAfast(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Lançar afastamento
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Dias perdidos por capítulo de CID e por setor. É o indicador que liga adoecimento
          mental (capítulo F) à área onde ele acontece.
        </p>

        {formAfast && (
          <FormAfastamento
            setores={setores}
            onSalvo={() => { setFormAfast(false); load(); }}
            onFechar={() => setFormAfast(false)}
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{abs?.total_dias ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Dias perdidos</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{abs?.total_episodios ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Afastamentos</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Brain className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-[#7d4a3c]">{diasF}</p>
            <p className="text-xs text-gray-500 mt-1">Dias por capítulo F</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <TrendingDown className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{pctF}%</p>
            <p className="text-xs text-gray-500 mt-1">do total é saúde mental</p>
          </div>
        </div>

        {(abs?.grupos.length ?? 0) > 0 ? (
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Capítulo do CID</th>
                  <th className="text-right font-medium py-2">Afast.</th>
                  <th className="text-right font-medium py-2">Dias</th>
                  <th className="text-left font-medium py-2 pl-4 w-1/3">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {abs!.grupos.map(g => (
                  <tr key={g.grupo}>
                    <td className="py-2 text-gray-700">
                      <span className="font-semibold text-gray-800">{g.grupo}</span>
                      <span className="text-gray-500"> — {CID_LABEL[g.grupo] ?? 'Outros'}</span>
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{g.episodios}</td>
                    <td className="py-2 text-right font-semibold text-gray-800 tabular-nums">{g.dias}</td>
                    <td className="py-2 pl-4">
                      <Barra valor={g.dias} max={maxDiasGrupo} destaque={g.grupo === 'F'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-400 mb-5">
            Nenhum afastamento lançado neste período.
          </div>
        )}

        {(abs?.setores.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <p className="text-xs font-medium text-gray-500 mb-2">Por setor</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Setor</th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell">Colab.</th>
                  <th className="text-right font-medium py-2">Dias</th>
                  <th className="text-right font-medium py-2">Dias/colab.</th>
                  <th className="text-right font-medium py-2">Dias F</th>
                  <th className="text-left font-medium py-2 pl-4 w-1/4">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {abs!.setores.map(s => (
                  <tr key={s.setor}>
                    <td className="py-2 text-gray-700">{s.setor}</td>
                    <td className="py-2 text-right text-gray-400 tabular-nums hidden sm:table-cell">
                      {s.colaboradores}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{s.dias}</td>
                    <td className="py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {s.dias_por_colaborador}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{s.dias_f}</td>
                    <td className="py-2 pl-4"><Barra valor={s.dias} max={maxDiasSetor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ListaLancamentos
          titulo="Lançamentos no período"
          linhas={lancAfast.map(l => ({
            id: l.id,
            data: l.data_inicio,
            setor: l.setor,
            descricao: `${l.cid_grupo} — ${CID_LABEL[l.cid_grupo] ?? 'Outros'}`,
            extra: `${l.dias} ${l.dias === 1 ? 'dia' : 'dias'}`,
          }))}
          onExcluir={excluirAfast}
        />

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Compare setores por <strong>dias por colaborador</strong>, não por dias absolutos —
            senão o setor maior sempre parece o pior. Setores com menos de {abs?.k_min ?? 5}{' '}
            colaboradores não aparecem na quebra
            {(abs?.setores_suprimidos ?? 0) > 0 && ` (${abs?.setores_suprimidos} omitido(s))`}:
            contagem agregada em setor pequeno identifica. Os registros não guardam identificação
            de nenhum colaborador.
          </span>
        </div>
      </div>

      {/* ── Ambulatório ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Ambulatório</h2>
            <span className="text-xs text-gray-400">{amb?.total ?? 0}</span>
          </div>
          {!formAmb && (
            <button
              onClick={() => setFormAmb(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Lançar atendimento
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Idas ao ambulatório por categoria de queixa. Sinal precoce: aparece antes do afastamento.
        </p>

        {formAmb && (
          <FormAmbulatorio
            setores={setores}
            onSalvo={() => { setFormAmb(false); load(); }}
            onFechar={() => setFormAmb(false)}
          />
        )}

        {(amb?.categorias.length ?? 0) === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-400">
            Nenhum atendimento lançado neste período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Queixa</th>
                  <th className="text-right font-medium py-2">Atendimentos</th>
                  <th className="text-left font-medium py-2 pl-4 w-1/3">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {amb!.categorias.map(c => (
                  <tr key={c.categoria}>
                    <td className="py-2 text-gray-700">
                      {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {c.atendimentos}
                    </td>
                    <td className="py-2 pl-4">
                      <Barra
                        valor={c.atendimentos} max={maxCat}
                        destaque={c.categoria === 'ansiedade_estresse'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(amb?.setores.length ?? 0) > 0 && (
          <div className="overflow-x-auto mt-5">
            <p className="text-xs font-medium text-gray-500 mb-2">Por setor</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Setor</th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell">Colab.</th>
                  <th className="text-right font-medium py-2">Atend.</th>
                  <th className="text-right font-medium py-2">Por colab.</th>
                  <th className="text-right font-medium py-2">Ansiedade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {amb!.setores.map(s => (
                  <tr key={s.setor}>
                    <td className="py-2 text-gray-700">{s.setor}</td>
                    <td className="py-2 text-right text-gray-400 tabular-nums hidden sm:table-cell">
                      {s.colaboradores}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{s.atendimentos}</td>
                    <td className="py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {s.por_colaborador}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{s.ansiedade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ListaLancamentos
          titulo="Lançamentos no período"
          linhas={lancAmb.map(l => ({
            id: l.id,
            data: l.data,
            setor: l.setor,
            descricao: CATEGORIA_LABEL[l.categoria] ?? l.categoria,
          }))}
          onExcluir={excluirAmb}
        />

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Categoria de queixa, nunca diagnóstico — o ambulatório da empresa não é prontuário e
            este painel não substitui um. Mesmo piso de {amb?.k_min ?? 5} colaboradores por setor
            {(amb?.setores_suprimidos ?? 0) > 0 && ` (${amb?.setores_suprimidos} setor(es) omitido(s))`}.
          </span>
        </div>
      </div>
    </div>
  );
};
