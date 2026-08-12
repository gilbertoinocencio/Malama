// =====================================================
// Malama — Portal do RH · Aba Saúde Mental (NR-1)
//
// Duas coisas, com sensibilidades diferentes e por isso separadas na tela:
//
//  1. CAMPANHAS — o RH aplica instrumentos validados (janela + público-alvo)
//     e acompanha a ADESÃO. Adesão não é dado de saúde: aparece por setor,
//     sem piso de anonimato. Adesão baixa num setor costuma ser sinal de
//     risco, e por isso é KPI de primeira linha, não rodapé.
//
//  2. ÍNDICE DE BEM-ESTAR — o resultado. É dado de saúde: só agregado, com
//     piso de k respondentes aplicado dentro do banco, e nunca individual.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Plus, Play, X, Users, BarChart3, Info, AlertCircle, FileDown,
  ChevronDown, ChevronUp, HeartPulse, Activity, CalendarRange, Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService,
  type PsychosocialCampanha,
  type PsychosocialInstrumento,
  type CampanhaParticipacao,
  type CampanhaLinks,
  type SetorEmpresa,
  type RhRelatorioPsicossocial,
  type RhRelatorioJss,
  type RhMatrizPsicossocial,
} from '../../services/empresaService';
import { generatePsychosocialReportPDF } from '../../lib/psychosocialReportDoc';
import { generateJssReportPDF } from '../../lib/jssReportDoc';
import { MatrizPsicossocial } from '../../components/rh/MatrizPsicossocial';

const MIN_COORTE = 5;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

// Presets de período do relatório de bem-estar (fim = hoje)
type PeriodoPreset = 'mes' | 'tri' | 'semestre' | 'ano';
const PERIODO_MESES: Record<PeriodoPreset, number> = { mes: 1, tri: 3, semestre: 6, ano: 12 };
const PERIODO_LABEL: Record<PeriodoPreset, string> = {
  mes: 'Mês', tri: 'Trimestre', semestre: 'Semestre', ano: 'Ano',
};

function periodoRange(preset: PeriodoPreset): { inicio: string; fim: string } {
  const fim = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - PERIODO_MESES[preset]);
  return { inicio: iso(inicio), fim: iso(fim) };
}

/** Janela padrão sugerida a partir da cadência do instrumento. */
function janelaSugerida(cadenciaMeses: number | null): { inicio: string; fim: string } {
  const inicio = new Date();
  const fim = new Date();
  // Mensal → 14 dias para responder. Cadência maior → 30 dias.
  fim.setDate(fim.getDate() + ((cadenciaMeses ?? 1) <= 1 ? 14 : 30));
  return { inicio: iso(inicio), fim: iso(fim) };
}

const StatusBadge: React.FC<{ status: PsychosocialCampanha['status'] }> = ({ status }) => {
  const map = {
    aberta:    { cls: 'bg-green-100 text-green-700',  label: 'Aberta' },
    encerrada: { cls: 'bg-gray-100 text-gray-600',    label: 'Encerrada' },
    cancelada: { cls: 'bg-red-50 text-red-500',       label: 'Cancelada' },
  }[status];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map.cls}`}>{map.label}</span>;
};

/** Barra de adesão. Cor é sinal, não decoração: adesão baixa é alerta. */
const BarraAdesao: React.FC<{ taxa: number }> = ({ taxa }) => {
  const cor = taxa >= 60 ? '#16a34a' : taxa >= 30 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${taxa}%`, background: cor }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: cor }}>{taxa}%</span>
    </div>
  );
};

// ─── Detalhe de participação por setor ─────────────────
const ParticipacaoSetores: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const [dados, setDados] = useState<CampanhaParticipacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    rhService.getCampanhaParticipacao(campaignId)
      .then(d => { if (!cancelado) setDados(d); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [campaignId]);

  if (loading) {
    return <div className="py-4 text-center text-xs text-gray-400">Carregando participação...</div>;
  }
  if (!dados || dados.convidados === 0) {
    return <div className="py-4 text-center text-xs text-gray-400">Sem colaboradores no público-alvo.</div>;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-medium text-gray-500">Adesão por setor</p>
        <p className="text-[11px] text-gray-400 tabular-nums">
          Empresa: {dados.respondentes}/{dados.convidados}
        </p>
      </div>

      {dados.setores.length > 0 && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {dados.setores.map(s => (
              <tr key={s.setor}>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <span className={s.agrupado ? 'text-gray-500 italic' : 'text-gray-700'}>
                    {s.setor}
                  </span>
                </td>
                <td className="py-1.5 pr-3 text-xs text-gray-400 whitespace-nowrap tabular-nums">
                  {s.respondentes}/{s.convidados}
                </td>
                <td className="py-1.5 w-full"><BarraAdesao taxa={s.taxa} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sem esta linha o RH acha que sumiu gente: o total da empresa não
          fecha com a soma das linhas quando há setor abaixo do piso. */}
      {dados.ocultos_setores > 0 && (
        <p className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-lg p-2 mt-2 leading-snug">
          {dados.ocultos_setores === 1
            ? `1 setor com menos de ${dados.min_coorte} pessoas não aparece detalhado`
            : `${dados.ocultos_setores} setores com menos de ${dados.min_coorte} pessoas não aparecem detalhados`}
          {` (${dados.ocultos_convidados} colaborador(es)). `}
          Eles continuam somados no total da empresa.
        </p>
      )}

      <p className="text-[11px] text-gray-400 mt-2 leading-snug">
        Setor com menos de {dados.min_coorte} pessoas não é detalhado: num grupo pequeno, a taxa
        de adesão diria quem respondeu. Setor com adesão muito baixa merece atenção — costuma
        indicar receio, não desinteresse.
      </p>
    </div>
  );
};

// ─── Links por setor para distribuir ───────────────────
//
// Existe para resolver adesão: esperar o colaborador abrir o app sozinho no
// começo do mês entrega participação baixa. Com o link, o RH manda no grupo
// de WhatsApp, no e-mail interno ou imprime um cartaz com QR na área.
//
// UM LINK POR SETOR, não por pessoa. O modelo anterior era por pessoa e caiu
// por dois motivos: empresa de mil colaboradores precisaria de mil links, e o
// RH ficava com o link de cada um — o que derruba a confiança na pesquisa
// mesmo que ninguém abuse. Numa pesquisa de saúde mental, desconfiança custa
// adesão, e adesão é o produto.
//
// Ninguém se identifica ao responder. O setor vem embutido no link, então o
// recorte que sustenta o PGR e a matriz de risco continua exato — é a única
// coisa que a resposta carrega.
const LinksCampanha: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const [dados, setDados] = useState<CampanhaLinks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    rhService.getCampanhaLinks(campaignId)
      .then(d => { if (!cancelado) setDados(d); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [campaignId]);

  const urlDe = (token: string) => `${window.location.origin}/q/${token}`;

  const copiar = async (texto: string, aviso: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(aviso);
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.');
    }
  };

  const baixarCsv = () => {
    if (!dados) return;
    // Ponto e vírgula e BOM: é o que faz o Excel em pt-BR abrir o arquivo em
    // colunas e com acento certo, sem a pessoa ter que importar na mão.
    const linhas = [
      ['Setor', 'Colaboradores', 'Link'],
      ...dados.links.map(l => [l.setor, String(l.colaboradores), urlDe(l.token)]),
    ];
    const csv = '﻿' + linhas
      .map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `links-questionario-${campaignId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-4 text-center text-xs text-gray-400">Gerando links...</div>;
  }
  if (!dados?.ok) {
    return (
      <div className="py-4 text-center text-xs text-gray-400">
        {dados?.error ?? 'Não foi possível gerar os links.'}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <p className="text-xs font-medium text-gray-500">
          Links por setor · {dados.links.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copiar(
              dados.links.map(l => `${l.setor}: ${urlDe(l.token)}`).join('\n'),
              `${dados.links.length} links copiados`,
            )}
            disabled={dados.links.length === 0}
            className="px-2.5 py-1 text-xs font-medium border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            Copiar todos
          </button>
          <button
            onClick={baixarCsv}
            disabled={dados.links.length === 0}
            className="px-2.5 py-1 text-xs font-medium border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            Baixar CSV
          </button>
        </div>
      </div>

      {dados.links.length === 0 ? (
        <p className="py-3 text-center text-xs text-gray-400">
          Nenhum colaborador no público-alvo desta campanha.
        </p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {dados.links.map(l => (
              <tr key={l.token}>
                <td className="py-1.5 pr-3">
                  <p className="text-gray-700 leading-tight">{l.setor}</p>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    {l.colaboradores} colaborador(es)
                  </p>
                </td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => copiar(urlDe(l.token), 'Link copiado')}
                    className="px-2.5 py-1 text-xs font-medium border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition"
                  >
                    Copiar link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-[11px] text-gray-400 mt-2 leading-snug">
        Cada link vale para todo o setor e pode ser divulgado no grupo ou no mural, até{' '}
        {fmtDate(dados.janela_fim)}. A pesquisa é anônima: quem responde não se identifica, então
        nem a Malama nem você conseguem saber quem respondeu — só quantos, por setor.
      </p>
    </div>
  );
};

// ─── Formulário de nova campanha ───────────────────────
const NovaCampanha: React.FC<{
  instrumentos: PsychosocialInstrumento[];
  setores: SetorEmpresa[];
  /** Total real de colaboradores ativos/convidados — ver `alvoCount`. */
  alvoTotal: number;
  onCriada: () => void;
  onCancelar: () => void;
}> = ({ instrumentos, setores, alvoTotal, onCriada, onCancelar }) => {
  const disponiveis = instrumentos.filter(i => i.ativo);
  const [code, setCode] = useState(disponiveis[0]?.code ?? '');
  const inicial = janelaSugerida(disponiveis[0]?.cadencia_meses ?? null);
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const [alvo, setAlvo] = useState<'todos' | 'setores'>('todos');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const instrumento = disponiveis.find(i => i.code === code) ?? null;

  const trocarInstrumento = (novo: string) => {
    setCode(novo);
    const j = janelaSugerida(disponiveis.find(i => i.code === novo)?.cadencia_meses ?? null);
    setInicio(j.inicio);
    setFim(j.fim);
  };

  const toggleSetor = (s: string) =>
    setSelecionados(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // "Toda a empresa" NÃO pode ser a soma dos setores: `rh_setores` só devolve
  // quem tem setor preenchido, então numa empresa que ainda não classificou o
  // quadro o número saía muito menor que o público real (1 em vez de 3, no
  // caso que apareceu) — e o RH abria a campanha achando que ela não cobria
  // quase ninguém. Por setor a soma vale, porque ali só entra quem tem setor.
  // O tamanho do setor é o EFETIVO declarado, não o número de cadastrados:
  // quem não tem app responde pelo link do setor, e contar só assentos fazia
  // um setor de 5 pessoas sem app aparecer como zero.
  const tamanho = (s: SetorEmpresa) => Math.max(s.n, s.efetivo ?? 0);

  const alvoCount = alvo === 'todos'
    ? alvoTotal
    : setores.filter(s => selecionados.includes(s.setor)).reduce((acc, s) => acc + tamanho(s), 0);

  // Quantos, dentro do alvo, recebem pelo app. O restante só chega por link —
  // e é isso que decide se vale imprimir cartaz.
  const alvoComApp = alvo === 'setores'
    ? setores.filter(s => selecionados.includes(s.setor)).reduce((acc, s) => acc + s.n, 0)
    : null;

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) { toast.error('Selecione o instrumento.'); return; }
    if (alvo === 'setores' && selecionados.length === 0) {
      toast.error('Selecione ao menos um setor.'); return;
    }
    setSalvando(true);
    try {
      const res = await rhService.criarCampanha(
        code, inicio, fim, alvo === 'setores' ? selecionados : null,
      );
      if (!res.ok) { toast.error(res.error || 'Não foi possível criar a campanha.'); return; }
      toast.success('Campanha aberta. Os colaboradores serão convidados no app.');
      onCriada();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar campanha.');
    } finally {
      setSalvando(false);
    }
  };

  if (disponiveis.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        Nenhum instrumento liberado para uso no momento. Fale com a Malama.
      </div>
    );
  }

  return (
    <form onSubmit={submeter} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova campanha</p>
        <button type="button" onClick={onCancelar} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Instrumento</label>
        <select
          value={code} onChange={e => trocarInstrumento(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
        >
          {disponiveis.map(i => (
            <option key={i.code} value={i.code}>
              {i.nome}{i.cadencia_meses ? ` — sugerido a cada ${i.cadencia_meses} ${i.cadencia_meses === 1 ? 'mês' : 'meses'}` : ''}
            </option>
          ))}
        </select>
        {instrumento?.descricao && (
          <p className="text-xs text-gray-500 mt-1.5 leading-snug">{instrumento.descricao}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Abre em</label>
          <input
            type="date" value={inicio} onChange={e => setInicio(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha em</label>
          <input
            type="date" value={fim} min={inicio} onChange={e => setFim(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Público-alvo</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button" onClick={() => setAlvo('todos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              alvo === 'todos' ? 'border-[#7d4a3c] bg-[#7d4a3c]/5 text-[#7d4a3c]' : 'border-gray-200 text-gray-500 bg-white'
            }`}
          >
            Toda a empresa
          </button>
          <button
            type="button" onClick={() => setAlvo('setores')}
            disabled={setores.length === 0}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition disabled:opacity-40 ${
              alvo === 'setores' ? 'border-[#7d4a3c] bg-[#7d4a3c]/5 text-[#7d4a3c]' : 'border-gray-200 text-gray-500 bg-white'
            }`}
          >
            Setores específicos
          </button>
        </div>

        {/* O setor é criado na aba Colaboradores, mas é AQUI que a falta dele
            aparece — quem vai abrir uma campanha por setor descobre neste
            momento que o setor não existe. Sem este atalho, a pessoa tem que
            adivinhar onde cadastrar. */}
        <div className="mt-2">
          <Link
            to="/rh/dashboard#setores"
            className="text-xs text-[#7d4a3c] underline hover:opacity-80"
          >
            {setores.length === 0
              ? 'Nenhum setor cadastrado — criar setores da empresa'
              : 'Criar ou renomear setores'}
          </Link>
        </div>

        {alvo === 'setores' && (
          <div className="flex flex-wrap gap-1.5">
            {setores.map(s => (
              <button
                key={s.setor} type="button" onClick={() => toggleSetor(s.setor)}
                className={`px-2.5 py-1 text-xs rounded-full border transition ${
                  selecionados.includes(s.setor)
                    ? 'border-[#7d4a3c] bg-[#7d4a3c] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.setor} <span className="opacity-60">({tamanho(s)})</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {alvoCount} pessoa(s) no público-alvo.
          {/* Diz de onde vem a diferença: sem isto, o RH veria "5" e esperaria
              notificação no app para as 5, quando só o link alcança quem não
              tem conta. */}
          {alvoComApp != null && alvoCount > alvoComApp && (
            ` ${alvoComApp} com acesso ao app; as demais respondem pelo link do setor, gerado em "Links" depois de abrir a campanha.`
          )}
          {setores.length === 0 && ' Nenhum setor cadastrado — o recorte por setor fica indisponível.'}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button" onClick={onCancelar}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white transition"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={salvando}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          {salvando ? 'Abrindo...' : 'Abrir campanha'}
        </button>
      </div>
    </form>
  );
};

// ─── Página ────────────────────────────────────────────
export const RhSaudeMental: React.FC = () => {
  const [campanhas, setCampanhas] = useState<PsychosocialCampanha[]>([]);
  const [instrumentos, setInstrumentos] = useState<PsychosocialInstrumento[]>([]);
  const [setores, setSetores] = useState<SetorEmpresa[]>([]);
  const [alvoTotal, setAlvoTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  // Separado da adesão de propósito: o RH costuma querer os links (para
  // reenviar) enquanto olha a adesão, e fechar um para ver o outro atrapalha.
  const [linksAbertos, setLinksAbertos] = useState<string | null>(null);

  // Período: um filtro só, acima de tudo que ele escopa (matriz + WHO-5)
  const [periodo, setPeriodo] = useState<PeriodoPreset>('tri');
  const [psico, setPsico] = useState<RhRelatorioPsicossocial | null>(null);
  const [psicoLoading, setPsicoLoading] = useState(false);
  const [gerandoPsico, setGerandoPsico] = useState(false);
  const [jss, setJss] = useState<RhRelatorioJss | null>(null);
  const [jssLoading, setJssLoading] = useState(false);
  const [gerandoJss, setGerandoJss] = useState(false);
  const [matriz, setMatriz] = useState<RhMatrizPsicossocial | null>(null);
  const [matrizLoading, setMatrizLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, i, s, total] = await Promise.all([
        rhService.getCampanhas(),
        rhService.getInstrumentos(),
        rhService.getSetores(),
        rhService.getAlvoTotal(),
      ]);
      setCampanhas(c);
      setInstrumentos(i);
      setSetores(s);
      setAlvoTotal(total);
    } catch (err) {
      console.error('Erro ao carregar saúde mental:', err);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelado = false;
    setPsicoLoading(true);
    setMatrizLoading(true);
    const { inicio, fim } = periodoRange(periodo);

    setJssLoading(true);

    rhService.getRelatorioPsicossocial(inicio, fim)
      .then(r => { if (!cancelado) setPsico(r); })
      .catch(() => { if (!cancelado) setPsico(null); })
      .finally(() => { if (!cancelado) setPsicoLoading(false); });

    rhService.getRelatorioJss(inicio, fim)
      .then(r => { if (!cancelado) setJss(r); })
      .catch(() => { if (!cancelado) setJss(null); })
      .finally(() => { if (!cancelado) setJssLoading(false); });

    rhService.getMatrizPsicossocial(inicio, fim)
      .then(m => { if (!cancelado) setMatriz(m); })
      .catch(() => { if (!cancelado) setMatriz(null); })
      .finally(() => { if (!cancelado) setMatrizLoading(false); });

    return () => { cancelado = true; };
  }, [periodo]);

  const encerrar = async (c: PsychosocialCampanha) => {
    if (!confirm(`Encerrar a campanha de ${c.instrument_nome}? Quem ainda não respondeu não poderá mais responder.`)) return;
    const res = await rhService.encerrarCampanha(c.id);
    if (!res.ok) { toast.error(res.error || 'Erro ao encerrar.'); return; }
    toast.success('Campanha encerrada.');
    load();
  };

  const handleGerarPsico = async () => {
    if (!psico) return;
    setGerandoPsico(true);
    try {
      // O plano de ação entra no mesmo documento: diagnóstico sem medida de
      // controle registra que a empresa sabia do risco e não agiu.
      const planos = await rhService.getPlanosAcao();
      const emitidoEm = new Date();
      const ymd = `${emitidoEm.getFullYear()}${String(emitidoEm.getMonth() + 1).padStart(2, '0')}${String(emitidoEm.getDate()).padStart(2, '0')}`;
      const numero = `MAL-PSICO-${ymd}-${PERIODO_LABEL[periodo].slice(0, 3).toUpperCase()}`;
      generatePsychosocialReportPDF(psico, { numeroDoc: numero, emitidoEm, planos });
      toast.success('Relatório psicossocial gerado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar relatório.');
    } finally {
      setGerandoPsico(false);
    }
  };

  const handleGerarJss = async () => {
    if (!jss) return;
    setGerandoJss(true);
    try {
      // Mesmo plano de ação do relatório WHO-5: é o mesmo registro de
      // medidas de controle da empresa, só o diagnóstico que muda de eixo.
      const planos = await rhService.getPlanosAcao();
      const emitidoEm = new Date();
      const ymd = `${emitidoEm.getFullYear()}${String(emitidoEm.getMonth() + 1).padStart(2, '0')}${String(emitidoEm.getDate()).padStart(2, '0')}`;
      const numero = `MAL-JSS-${ymd}-${PERIODO_LABEL[periodo].slice(0, 3).toUpperCase()}`;
      generateJssReportPDF(jss, { numeroDoc: numero, emitidoEm, planos });
      toast.success('Relatório de exposição ocupacional gerado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar relatório.');
    } finally {
      setGerandoJss(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  const temInstrumentoExposicao = instrumentos.some(i => i.eixo === 'exposicao' && i.ativo);

  return (
    <div className="space-y-6">
      {/* ── Campanhas ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Campanhas de avaliação</h2>
            <span className="text-xs text-gray-400">{campanhas.length}</span>
          </div>
          {!criando && (
            <button
              onClick={() => setCriando(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Nova campanha
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Aplique instrumentos validados aos colaboradores e acompanhe a adesão. As respostas são
          individuais e sigilosas — você vê quantos responderam, nunca quem respondeu o quê.
        </p>

        {criando && (
          <div className="mb-4">
            <NovaCampanha
              instrumentos={instrumentos}
              setores={setores}
              alvoTotal={alvoTotal}
              onCriada={() => { setCriando(false); load(); }}
              onCancelar={() => setCriando(false)}
            />
          </div>
        )}

        {campanhas.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <CalendarRange className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Nenhuma campanha ainda.</p>
            <p className="text-xs text-gray-400 mt-1">
              Abra a primeira para começar o inventário de riscos psicossociais.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {campanhas.map(c => {
              const taxa = c.n_convidados > 0
                ? Math.round((c.n_respondentes / c.n_convidados) * 100) : 0;
              const aberta = expandida === c.id;
              return (
                <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{c.instrument_nome}</span>
                        <StatusBadge status={c.status} />
                        {c.eixo === 'exposicao' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                            Exposição ocupacional
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(c.janela_inicio)} → {fmtDate(c.janela_fim)}
                        {' · '}
                        {c.setores ? `${c.setores.length} setor(es)` : 'Toda a empresa'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                          <Users className="w-3 h-3" />
                          <span className="tabular-nums">{c.n_respondentes}/{c.n_convidados}</span>
                        </div>
                        <BarraAdesao taxa={taxa} />
                      </div>
                      <button
                        onClick={() => setExpandida(aberta ? null : c.id)}
                        title="Adesão por setor"
                        className="p-1.5 text-gray-400 hover:text-[#7d4a3c] hover:bg-gray-50 rounded-lg transition"
                      >
                        {aberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {c.status === 'aberta' && (
                        <button
                          onClick={() => setLinksAbertos(linksAbertos === c.id ? null : c.id)}
                          title="Links para enviar aos colaboradores"
                          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition whitespace-nowrap flex items-center gap-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          Links
                        </button>
                      )}
                      {c.status === 'aberta' && (
                        <button
                          onClick={() => encerrar(c)}
                          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
                        >
                          Encerrar
                        </button>
                      )}
                    </div>
                  </div>

                  {aberta && <ParticipacaoSetores campaignId={c.id} />}
                  {linksAbertos === c.id && <LinksCampanha campaignId={c.id} />}
                </div>
              );
            })}
          </div>
        )}

        {!temInstrumentoExposicao && (
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            <span>
              O instrumento de <strong>exposição ocupacional</strong> (que mede demanda, controle e
              apoio no trabalho) ainda não está liberado. Sem ele é possível medir como o
              colaborador está, mas não distinguir o que vem da natureza da ocupação do que vem de
              fatores externos.
            </span>
          </div>
        )}
      </div>

      {/* ── Filtro de período: uma linha só, acima de tudo que ele escopa ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Resultados no período
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

      {/* ── Matriz exposição × bem-estar ── */}
      <MatrizPsicossocial matriz={matriz} loading={matrizLoading} />

      {/* ── Índice de bem-estar (resultado — dado de saúde) ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <HeartPulse className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Índice de bem-estar (WHO-5)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Resultado agregado das respostas no período, como subsídio à gestão de riscos
          psicossociais (NR-1). Instrumento validado; dados agregados e anônimos.
        </p>

        {psicoLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7d4a3c]" />
          </div>
        ) : !psico || 'suprimido' in psico.geral ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 font-medium">Dados insuficientes neste período.</p>
            <p className="text-xs text-gray-400 mt-1">
              São necessários pelo menos {psico?.k_min ?? MIN_COORTE} colaboradores respondentes
              para exibir resultados, preservando o anonimato.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{psico.geral.n_respondentes}</p>
                <p className="text-xs text-gray-500 mt-1">Respondentes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[#7d4a3c]">{psico.geral.score_medio}</p>
                <p className="text-xs text-gray-500 mt-1">Índice médio (0–100)</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{psico.geral.faixa_reduzido}</p>
                <p className="text-xs text-gray-500 mt-1">Bem-estar reduzido</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{psico.geral.faixa_risco}</p>
                <p className="text-xs text-gray-500 mt-1">Faixa de atenção</p>
              </div>
            </div>

            {psico.setores.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left font-medium py-2">Setor</th>
                      <th className="text-right font-medium py-2">Resp.</th>
                      <th className="text-right font-medium py-2">Índice</th>
                      <th className="text-right font-medium py-2">Reduzido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {psico.setores.map(s => (
                      <tr key={s.setor}>
                        <td className="py-2 text-gray-700">{s.setor}</td>
                        <td className="py-2 text-right text-gray-500">{s.n_respondentes}</td>
                        <td className="py-2 text-right font-semibold text-[#7d4a3c]">{s.score_medio}</td>
                        <td className="py-2 text-right text-gray-500">{s.faixa_reduzido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {psico.setores_suprimidos > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                {psico.setores_suprimidos} setor(es) omitido(s) por não atingir(em) {psico.k_min}{' '}
                respondentes.
              </p>
            )}

            <button
              onClick={handleGerarPsico}
              disabled={gerandoPsico}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {gerandoPsico ? 'Gerando...' : 'Gerar relatório para PGR'}
            </button>
          </>
        )}

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Subsídio à gestão de riscos psicossociais (NR-1). Não substitui o PGR, o PCMSO nem as
            avaliações do SESMT/médico do trabalho. Índice = WHO-5 (0–100); recortes abaixo de{' '}
            {psico?.k_min ?? MIN_COORTE} respondentes são suprimidos (LGPD).
          </span>
        </div>
      </div>

      {/* ── Exposição ocupacional (resultado — dado de saúde) ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Exposição ocupacional (JSS)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          O que no trabalho expõe a risco — demanda, controle e apoio (modelo Karasek/Theorell).
          Documento separado do WHO-5: eixos diferentes, cadência diferente (semestral).
        </p>

        {jssLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7d4a3c]" />
          </div>
        ) : !jss || 'suprimido' in jss.geral ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 font-medium">Dados insuficientes neste período.</p>
            <p className="text-xs text-gray-400 mt-1">
              São necessários pelo menos {jss?.k_min ?? MIN_COORTE} colaboradores respondentes
              para exibir resultados, preservando o anonimato.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{jss.geral.n_respondentes}</p>
                <p className="text-xs text-gray-500 mt-1">Respondentes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[#7d4a3c]">{jss.geral.indice_medio}</p>
                <p className="text-xs text-gray-500 mt-1">Índice de exposição</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{jss.geral.demanda_medio}</p>
                <p className="text-xs text-gray-500 mt-1">Demanda</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{jss.geral.controle_medio}</p>
                <p className="text-xs text-gray-500 mt-1">Controle</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{jss.geral.apoio_medio}</p>
                <p className="text-xs text-gray-500 mt-1">Apoio</p>
              </div>
            </div>

            {jss.setores.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left font-medium py-2">Setor</th>
                      <th className="text-right font-medium py-2">Resp.</th>
                      <th className="text-right font-medium py-2">Índice</th>
                      <th className="text-right font-medium py-2">Demanda</th>
                      <th className="text-right font-medium py-2">Controle</th>
                      <th className="text-right font-medium py-2">Apoio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {jss.setores.map(s => (
                      <tr key={s.setor}>
                        <td className="py-2 text-gray-700">{s.setor}</td>
                        <td className="py-2 text-right text-gray-500">{s.n_respondentes}</td>
                        <td className="py-2 text-right font-semibold text-[#7d4a3c]">{s.indice}</td>
                        <td className="py-2 text-right text-gray-500">{s.demanda}</td>
                        <td className="py-2 text-right text-gray-500">{s.controle}</td>
                        <td className="py-2 text-right text-gray-500">{s.apoio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {jss.setores_suprimidos > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                {jss.setores_suprimidos} setor(es) omitido(s) por não atingir(em) {jss.k_min}{' '}
                respondentes.
              </p>
            )}

            <button
              onClick={handleGerarJss}
              disabled={gerandoJss}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {gerandoJss ? 'Gerando...' : 'Gerar relatório JSS para PGR'}
            </button>
          </>
        )}

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Subsídio à gestão de riscos psicossociais (NR-1). Não substitui o PGR, o PCMSO nem as
            avaliações do SESMT/médico do trabalho. Índice = JSS (0–100, maior = mais exposição);
            recortes abaixo de {jss?.k_min ?? MIN_COORTE} respondentes são suprimidos (LGPD).
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
        <BarChart3 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Este painel subsidia a gestão de riscos psicossociais (NR-1). Não substitui o PGR, o
          PCMSO nem as avaliações do SESMT/médico do trabalho.
        </span>
      </div>
    </div>
  );
};
