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
  ArrowRight, CheckCircle2, Clock3,
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
import { JssDiagnosticoSetor } from '../../components/rh/JssDiagnosticoSetor';
import { JssIndicadores } from '../../components/rh/JssIndicadores';
import { JssTeiaTemas } from '../../components/rh/JssTeiaTemas';
import { Who5Indicadores } from '../../components/rh/Who5Indicadores';
import { RelatosSentinelaCard } from '../../components/rh/RelatosSentinelaCard';

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
  instrumentoInicial?: string | null;
  /** Total real de colaboradores ativos/convidados — ver `alvoCount`. */
  alvoTotal: number;
  onCriada: () => void;
  onCancelar: () => void;
}> = ({ instrumentos, setores, instrumentoInicial, alvoTotal, onCriada, onCancelar }) => {
  const disponiveis = instrumentos.filter(i => i.ativo);
  const codigoInicial = disponiveis.some(i => i.code === instrumentoInicial)
    ? instrumentoInicial as string
    : disponiveis[0]?.code ?? '';
  const [code, setCode] = useState(codigoInicial);
  const inicial = janelaSugerida(disponiveis.find(i => i.code === codigoInicial)?.cadencia_meses ?? null);
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

  useEffect(() => {
    if (!instrumentoInicial || !disponiveis.some(i => i.code === instrumentoInicial)) return;
    trocarInstrumento(instrumentoInicial);
  }, [instrumentoInicial]);

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
          {setores.length === 0 && ' Nenhum setor cadastrado — sem eles, o resultado não pode ser separado por setor.'}
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

const CicloAvaliacoes: React.FC<{
  campanhas: PsychosocialCampanha[];
  onNova: (instrumento: string) => void;
}> = ({ campanhas, onNova }) => {
  const hoje = new Date();

  const estado = (instrumento: 'who5' | 'jss', meses: number) => {
    const relacionadas = campanhas
      .filter(c => c.instrument === instrumento && c.status !== 'cancelada')
      .sort((a, b) => b.janela_fim.localeCompare(a.janela_fim));
    const aberta = relacionadas.find(c => c.status === 'aberta');
    if (aberta) return { aberto: true, destaque: 'Campanha em andamento', detalhe: `Fecha em ${fmtDate(aberta.janela_fim)}` };
    const ultima = relacionadas[0];
    if (!ultima) return { aberto: false, destaque: 'Primeira medição pendente', detalhe: 'Crie a linha de base da empresa.' };
    const referencia = ultima.encerrada_em?.slice(0, 10) ?? ultima.janela_fim;
    const base = new Date(`${referencia}T12:00:00`);
    base.setMonth(base.getMonth() + meses);
    const vencida = base <= hoje;
    return {
      aberto: false,
      destaque: vencida ? 'Nova medição recomendada' : `Próxima em ${base.toLocaleDateString('pt-BR')}`,
      detalhe: vencida ? `O último ciclo terminou em ${fmtDate(referencia)}.` : `Último ciclo encerrado em ${fmtDate(referencia)}.`,
    };
  };

  const itens = [
    { code: 'who5' as const, nome: 'WHO-5 mensal', descricao: 'Termômetro de bem-estar', icon: HeartPulse, estado: estado('who5', 1) },
    { code: 'jss' as const, nome: 'JSS trimestral', descricao: 'Condições de trabalho', icon: Activity, estado: estado('jss', 3) },
  ];

  return (
    <section className="rounded-xl border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 p-4" aria-labelledby="ciclo-avaliacoes-titulo">
      <div className="mb-3 flex items-start gap-3">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#7d4a3c]" />
        <div>
          <h2 id="ciclo-avaliacoes-titulo" className="text-sm font-semibold text-gray-800">Ciclo de cuidado da empresa</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">O WHO-5 acompanha o mês. O JSS orienta a conversa trimestral e as melhorias com cada liderança.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {itens.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.code} className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white p-3 shadow-sm">
              <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#7d4a3c]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{item.nome}</p>
                  <p className="text-xs text-gray-500">{item.descricao}</p>
                  <p className={`mt-1 text-xs font-medium ${item.estado.aberto ? 'text-green-700' : 'text-[#7d4a3c]'}`}>{item.estado.destaque}</p>
                  <p className="text-[11px] text-gray-400">{item.estado.detalhe}</p>
                </div>
              </div>
              {item.estado.aberto ? (
                <a href="#campanhas" className="shrink-0 text-xs font-semibold text-[#7d4a3c]">Acompanhar</a>
              ) : (
                <button type="button" onClick={() => onNova(item.code)} className="shrink-0 rounded-lg border border-[#7d4a3c]/30 px-3 py-2 text-xs font-semibold text-[#7d4a3c] transition hover:bg-[#7d4a3c]/5">Preparar</button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-gray-500">Relatos de assédio ou violência não aguardam esse calendário: seguem imediatamente para o fluxo restrito de apuração.</p>
    </section>
  );
};

// ─── Página ────────────────────────────────────────────
export const RhSaudeMental: React.FC = () => {
  const parametrosIniciais = new URLSearchParams(window.location.search);
  const instrumentoInicial = parametrosIniciais.get('instrumento');
  const [instrumentoSugerido, setInstrumentoSugerido] = useState<string | null>(instrumentoInicial);
  const [campanhas, setCampanhas] = useState<PsychosocialCampanha[]>([]);
  const [instrumentos, setInstrumentos] = useState<PsychosocialInstrumento[]>([]);
  const [setores, setSetores] = useState<SetorEmpresa[]>([]);
  const [alvoTotal, setAlvoTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(() => parametrosIniciais.get('nova') === '1');
  const [campanhaEncerrada, setCampanhaEncerrada] = useState<PsychosocialCampanha | null>(null);
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
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
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
      setLoadError('Não foi possível atualizar campanhas e instrumentos. Os dados anteriores foram mantidos.');
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
      .catch(() => { if (!cancelado) setLoadError('Não foi possível atualizar todos os resultados. Mantivemos os dados anteriores.'); })
      .finally(() => { if (!cancelado) setPsicoLoading(false); });

    rhService.getRelatorioJss(inicio, fim)
      .then(r => { if (!cancelado) setJss(r); })
      .catch(() => { if (!cancelado) setLoadError('Não foi possível atualizar todos os resultados. Mantivemos os dados anteriores.'); })
      .finally(() => { if (!cancelado) setJssLoading(false); });

    rhService.getMatrizPsicossocial(inicio, fim)
      .then(m => { if (!cancelado) setMatriz(m); })
      .catch(() => { if (!cancelado) setLoadError('Não foi possível atualizar todos os resultados. Mantivemos os dados anteriores.'); })
      .finally(() => { if (!cancelado) setMatrizLoading(false); });

    return () => { cancelado = true; };
  }, [periodo]);

  const encerrar = async (c: PsychosocialCampanha) => {
    if (!confirm(`Encerrar a campanha de ${c.instrument_nome}? Quem ainda não respondeu não poderá mais responder.`)) return;
    const res = await rhService.encerrarCampanha(c.id);
    if (!res.ok) { toast.error(res.error || 'Erro ao encerrar.'); return; }
    toast.success('Campanha encerrada. Os resultados já podem orientar o próximo passo.');
    setCampanhaEncerrada(c);
    await load();
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
      {loadError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3"><span>{loadError}</span><button onClick={load} className="font-semibold whitespace-nowrap">Tentar novamente</button></div>}
      <CicloAvaliacoes
        campanhas={campanhas}
        onNova={instrumento => {
          setInstrumentoSugerido(instrumento);
          setCriando(true);
          window.setTimeout(() => document.getElementById('campanhas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        }}
      />

      {campanhaEncerrada && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900">Pesquisa encerrada. Agora transforme o resultado em conversa.</p>
                <p className="mt-1 text-xs leading-relaxed text-green-800">Revise os dados agregados, reconheça o que está funcionando e escolha poucos pontos para melhorar.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodo(campanhaEncerrada.instrument === 'who5' ? 'mes' : 'tri');
                      window.setTimeout(() => document.getElementById(campanhaEncerrada.instrument === 'who5' ? 'resultado-who5' : 'resultado-jss')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Ver resultados <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  {campanhaEncerrada.instrument === 'jss' && (
                    <Link to="/rh/plano-acao?visao=lideranca&nova=1" className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-semibold text-green-800">Preparar conversa com a liderança</Link>
                  )}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setCampanhaEncerrada(null)} aria-label="Fechar orientação" className="text-green-700/60 hover:text-green-900"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <RelatosSentinelaCard />
      {/* ── Campanhas ── */}
      <div id="campanhas" className="scroll-mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Campanhas de avaliação</h2>
            <span className="text-xs text-gray-400">{campanhas.length}</span>
          </div>
          {!criando && (
            <button
              onClick={() => { setInstrumentoSugerido(null); setCriando(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Nova campanha
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-1">
          Aplique instrumentos validados aos colaboradores e acompanhe a adesão. As respostas são
          individuais e sigilosas — você vê quantos responderam, nunca quem respondeu o quê.
        </p>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          A barra mostra quantos responderam de quantos foram convidados. A cor tem significado:
          verde a partir de 60%, laranja entre 30% e 60%, vermelho abaixo de 30%. Pouca gente
          respondendo num setor já é, por si só, um sinal de alerta — e deixa o resultado daquele
          setor menos confiável.
        </p>

        {criando && (
          <div className="mb-4">
            <NovaCampanha
              instrumentos={instrumentos}
              setores={setores}
              instrumentoInicial={instrumentoSugerido}
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
      <div id="resultado-who5" className="scroll-mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <HeartPulse className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Índice de bem-estar (WHO-5)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Como o colaborador se sentiu nas últimas duas semanas — 5 perguntas, nota de 0 a 100
          em que <strong>quanto maior, melhor</strong>. Fala da pessoa, não do trabalho. Os
          resultados aparecem sempre somados e sem nome, e ajudam a empresa a cuidar dos riscos
          psicossociais que a NR-1 cobra.
        </p>

        {psicoLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7d4a3c]" />
          </div>
        ) : !psico || 'suprimido' in psico.geral ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Ainda não há respostas suficientes neste período.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              São necessárias pelo menos {psico?.k_min ?? MIN_COORTE} pessoas respondendo para o
              resultado aparecer — abaixo disso, ficaria fácil descobrir quem respondeu o quê.
            </p>
          </div>
        ) : (
          <>
            <Who5Indicadores geral={psico.geral} kMin={psico.k_min} />

            {psico.setores.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700">Bem-estar por setor</p>
                <p className="mt-0.5 mb-1 text-[11px] leading-relaxed text-gray-500">
                  “Índice” é a nota média do setor, de 0 a 100 (quanto maior, melhor). Já
                  “Reduzido” e “Atenção” são <strong>quantidades de pessoas</strong>: quem tirou
                  menos de 50 e quem tirou 28 ou menos. Quem está em atenção já está contado em
                  reduzido — não some os dois.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left font-medium py-2">Setor</th>
                        <th className="text-right font-medium py-2" title="Quantas pessoas responderam neste setor">
                          Resp.
                        </th>
                        <th className="text-right font-medium py-2" title="Nota média do setor, de 0 a 100. Quanto maior, melhor.">
                          Índice
                        </th>
                        <th className="text-right font-medium py-2" title="Quantas pessoas tiraram menos de 50">
                          Reduzido
                        </th>
                        <th className="text-right font-medium py-2" title="Quantas pessoas tiraram 28 ou menos. Já estão contadas em 'Reduzido'.">
                          Atenção
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {psico.setores.map(s => (
                        <tr key={s.setor}>
                          <td className="py-2 text-gray-700">{s.setor}</td>
                          <td className="py-2 text-right text-gray-500 tabular-nums">{s.n_respondentes}</td>
                          <td className={`py-2 text-right font-semibold tabular-nums ${
                            s.score_medio < 50 ? 'text-[#c2603f]' : 'text-[#7d4a3c]'
                          }`}>
                            {s.score_medio}
                          </td>
                          <td className="py-2 text-right text-gray-500 tabular-nums">
                            {s.faixa_reduzido}
                            <span className="ml-1 text-xs text-gray-400">
                              ({s.n_respondentes > 0
                                ? Math.round((s.faixa_reduzido / s.n_respondentes) * 100) : 0}%)
                            </span>
                          </td>
                          <td className={`py-2 text-right tabular-nums ${
                            s.faixa_risco > 0 ? 'text-[#d03b3b] font-semibold' : 'text-gray-500'
                          }`}>
                            {s.faixa_risco}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {psico.setores_suprimidos > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                {psico.setores_suprimidos} setor(es) fora da lista: tiveram menos de {psico.k_min}{' '}
                respostas.
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
            Ajuda a empresa a cuidar dos riscos psicossociais que a NR-1 cobra, mas não substitui o
            PGR, o PCMSO nem a avaliação do médico do trabalho. Grupos com menos de{' '}
            {psico?.k_min ?? MIN_COORTE} respostas não aparecem, para proteger quem respondeu (LGPD).
          </span>
        </div>
      </div>

      {/* ── Exposição ocupacional (resultado — dado de saúde) ── */}
      <div id="resultado-jss" className="scroll-mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Exposição ocupacional (JSS)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          O que no trabalho pesa sobre as pessoas: o quanto se cobra, a liberdade para decidir e
          o apoio que existe. São 17 perguntas respondidas a cada três meses, e todas as notas
          vão de 0 a 100. É separado do bem-estar de propósito: um mostra como a pessoa está, e
          este mostra o que no trabalho a pressiona.
        </p>

        {jssLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7d4a3c]" />
          </div>
        ) : !jss || 'suprimido' in jss.geral ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Ainda não há respostas suficientes neste período.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              São necessárias pelo menos {jss?.k_min ?? MIN_COORTE} pessoas respondendo para o
              resultado aparecer — abaixo disso, ficaria fácil descobrir quem respondeu o quê.
            </p>
          </div>
        ) : (
          <>
            <JssIndicadores geral={jss.geral} cortes={jss.cortes} kMin={jss.k_min} />

            <JssTeiaTemas inicio={jss.periodo_inicio} fim={jss.periodo_fim} />

            <JssDiagnosticoSetor relatorio={jss} />

            {jss.setores_suprimidos > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                {jss.setores_suprimidos} setor(es) fora da lista: tiveram menos de {jss.k_min}{' '}
                respostas.
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
            Ajuda a empresa a cuidar dos riscos psicossociais que a NR-1 cobra, mas não substitui o
            PGR, o PCMSO nem a avaliação do médico do trabalho. Grupos com menos de{' '}
            {jss?.k_min ?? MIN_COORTE} respostas não aparecem, para proteger quem respondeu (LGPD).
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
