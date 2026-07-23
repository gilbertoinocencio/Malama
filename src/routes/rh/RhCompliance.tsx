// =====================================================
// Malama — Portal do RH · Aba Compliance (NR-1 / Selo Malama)
// Gera, sob demanda, um PDF de evidência documental para o PGR da empresa.
// Métricas sempre AGREGADAS (nunca dado individual). Histórico re-baixável.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, FileDown, Download, AlertCircle, Info,
  Droplet, Beef, Activity, Sparkles, Flame, TrendingUp, HeartPulse, Award,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  rhService,
  type RhComplianceMetricas,
  type ComplianceDoc,
  type RhMetricasBemestar,
  type RhEvolucaoBemestar,
  type RhRelatorioPsicossocial,
  type CertificadoColaborador,
} from '../../services/empresaService';
import { generateCompliancePDF } from '../../lib/complianceDoc';
import { generatePsychosocialReportPDF } from '../../lib/psychosocialReportDoc';
import {
  generateCertificadoPDF, generateCertificadosLotePDF, type CertificadoMeta,
} from '../../lib/certificadoDisponibilizacao';

// Serviços do plano base disponibilizados a todo colaborador com assento.
// (O plano psicológico, quando ativado por empresa, entra aqui no passo 4.)
const SERVICOS_BASE = [
  'Acompanhamento nutricional contínuo com IA',
  'Telemedicina com endocrinologistas e nutrólogos',
  'Monitoramento metabólico e de composição corporal',
  'Rastreio periódico de bem-estar (WHO-5)',
];

const MIN_COORTE = 5; // piso de privacidade: oculta % abaixo de 5 colaboradores com dados

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Presets de período do relatório psicossocial (fim = hoje)
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

export const RhCompliance: React.FC = () => {
  const [metricas, setMetricas] = useState<RhComplianceMetricas | null>(null);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [bemestar, setBemestar] = useState<RhMetricasBemestar | null>(null);
  const [evolucao, setEvolucao] = useState<RhEvolucaoBemestar[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  // Relatório psicossocial WHO-5
  const [periodo, setPeriodo] = useState<PeriodoPreset>('tri');
  const [psico, setPsico] = useState<RhRelatorioPsicossocial | null>(null);
  const [psicoLoading, setPsicoLoading] = useState(false);
  const [gerandoPsico, setGerandoPsico] = useState(false);

  // Certificados de disponibilização
  const [colabsCert, setColabsCert] = useState<CertificadoColaborador[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d, be, ev, cc] = await Promise.all([
        rhService.getComplianceMetricas(),
        rhService.getComplianceDocs(),
        rhService.getMetricasBemestar(),
        rhService.getEvolucaoBemestar(),
        rhService.getCertificadoColaboradores(),
      ]);
      setMetricas(m);
      setDocs(d);
      setColabsCert(cc);
      setBemestar(be);
      setEvolucao(ev);
    } catch (err) {
      console.error('Erro ao carregar compliance:', err);
      toast.error('Erro ao carregar dados de compliance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recarrega o relatório psicossocial quando o período muda
  useEffect(() => {
    let cancelled = false;
    setPsicoLoading(true);
    const { inicio, fim } = periodoRange(periodo);
    rhService.getRelatorioPsicossocial(inicio, fim)
      .then(r => { if (!cancelled) setPsico(r); })
      .catch(() => { if (!cancelled) setPsico(null); })
      .finally(() => { if (!cancelled) setPsicoLoading(false); });
    return () => { cancelled = true; };
  }, [periodo]);

  const handleGerarPsico = () => {
    if (!psico) return;
    setGerandoPsico(true);
    try {
      const emitidoEm = new Date();
      const ymd = `${emitidoEm.getFullYear()}${String(emitidoEm.getMonth() + 1).padStart(2, '0')}${String(emitidoEm.getDate()).padStart(2, '0')}`;
      const numero = `MAL-PSICO-${ymd}-${PERIODO_LABEL[periodo].slice(0, 3).toUpperCase()}`;
      generatePsychosocialReportPDF(psico, { numeroDoc: numero, emitidoEm });
      toast.success('Relatório psicossocial gerado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar relatório.');
    } finally {
      setGerandoPsico(false);
    }
  };

  const certMeta = (): CertificadoMeta => {
    const emitidoEm = new Date();
    const ymd = `${emitidoEm.getFullYear()}${String(emitidoEm.getMonth() + 1).padStart(2, '0')}${String(emitidoEm.getDate()).padStart(2, '0')}`;
    return {
      empresaNome: metricas?.nome ?? '',
      empresaCnpj: metricas?.cnpj ?? null,
      servicos: SERVICOS_BASE,
      emitidoEm,
      numeroBase: `MAL-CERT-${ymd}`,
    };
  };

  const handleCertIndividual = (colab: CertificadoColaborador) => {
    try {
      generateCertificadoPDF(colab, certMeta());
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar certificado.');
    }
  };

  const handleCertLote = () => {
    const emitiveis = colabsCert.filter(c => c.status !== 'removido');
    if (emitiveis.length === 0) { toast.error('Nenhum colaborador para emitir.'); return; }
    try {
      generateCertificadosLotePDF(emitiveis, certMeta());
      toast.success(`${emitiveis.length} certificado(s) gerado(s).`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar certificados.');
    }
  };

  const gerarNumero = () => {
    const hoje = new Date();
    const ymd = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;
    const seq = String(docs.length + 1).padStart(3, '0');
    return `MAL-PGR-${ymd}-${seq}`;
  };

  const handleGerar = async () => {
    if (!metricas) return;
    setGerando(true);
    try {
      const numero = gerarNumero();
      const emitidoEm = new Date();
      const hoje = emitidoEm.toISOString().slice(0, 10);

      generateCompliancePDF({
        empresaNome: metricas.nome,
        empresaCnpj: metricas.cnpj,
        dataInicio: metricas.data_inicio,
        colaboradoresElegiveis: metricas.colaboradores_elegiveis,
        colaboradoresAtivos: metricas.colaboradores_ativos,
        consultasRealizadas: metricas.consultas_realizadas,
        numeroDoc: numero,
        emitidoEm,
      });

      await rhService.saveComplianceDoc({
        empresa_id: metricas.empresa_id,
        periodo_inicio: metricas.data_inicio,
        periodo_fim: hoje,
        colaboradores_elegiveis: metricas.colaboradores_elegiveis,
        colaboradores_ativos: metricas.colaboradores_ativos,
        consultas_realizadas: metricas.consultas_realizadas,
        numero_doc: numero,
      });
      toast.success('Documento gerado e registrado.');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar documento.');
    } finally {
      setGerando(false);
    }
  };

  const rebaixar = (d: ComplianceDoc) => {
    if (!metricas) return;
    generateCompliancePDF({
      empresaNome: metricas.nome,
      empresaCnpj: metricas.cnpj,
      dataInicio: d.periodo_inicio,
      colaboradoresElegiveis: d.colaboradores_elegiveis,
      colaboradoresAtivos: d.colaboradores_ativos,
      consultasRealizadas: d.consultas_realizadas,
      numeroDoc: d.numero_doc,
      emitidoEm: new Date(d.emitido_em),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Dados de compliance indisponíveis.</p>
        <p className="text-gray-400 text-sm mt-1">Entre em contato com a Malama.</p>
      </div>
    );
  }

  const taxa = metricas.colaboradores_elegiveis > 0
    ? Math.round((metricas.colaboradores_ativos / metricas.colaboradores_elegiveis) * 100)
    : 0;

  const pctOuNull = (num: number, den: number): number | null =>
    den < MIN_COORTE ? null : Math.round((num / den) * 100);

  const cardsBemestar = bemestar ? [
    { icon: <Droplet className="w-4 h-4" />,  label: 'Hidratação ↑',  pct: pctOuNull(bemestar.agua_melhoraram, bemestar.agua_com_dados) },
    { icon: <Beef className="w-4 h-4" />,     label: 'Proteína ↑',    pct: pctOuNull(bemestar.proteina_melhoraram, bemestar.proteina_com_dados) },
    { icon: <Activity className="w-4 h-4" />, label: 'Atividade ↑',   pct: pctOuNull(bemestar.atividade_melhoraram, bemestar.atividade_com_dados) },
    { icon: <Sparkles className="w-4 h-4" />, label: 'Engajamento',   pct: pctOuNull(bemestar.ativos_engajados, bemestar.ativos_total) },
  ] : [];

  const evolucaoValida = evolucao.filter(e => e.n_contribuintes >= MIN_COORTE);
  const chartData = evolucaoValida.map(e => ({
    mes: new Date(e.mes).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    'Água (ml)': e.media_agua ?? 0,
    'Proteína (g)': e.media_proteina ?? 0,
    'Min. ativos': e.media_minutos ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Resultados de bem-estar */}
      {bemestar && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Resultados de bem-estar</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Evolução dos hábitos dos colaboradores nos últimos 30 dias (comparado aos 30 anteriores).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
            {cardsBemestar.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">{c.icon}</div>
                {c.pct === null ? (
                  <>
                    <p className="text-lg font-bold text-gray-300">—</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Dados insuficientes</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-[#7d4a3c]">{c.pct}%</p>
                    <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                  </>
                )}
              </div>
            ))}
            {/* Dias em Flow — número absoluto, sempre visível */}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                <Flame className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{bemestar.dias_em_flow}</p>
              <p className="text-xs text-gray-500 mt-1">Dias em Flow</p>
            </div>
          </div>

          {/* Gráfico de evolução mensal */}
          {chartData.length > 0 ? (
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #eee' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Água (ml)"    stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Proteína (g)" stroke="#7d4a3c" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Min. ativos"  stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-400">
              Sem histórico suficiente ainda para exibir a evolução.
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Indicadores agregados e anonimizados. Percentuais são ocultados abaixo de {MIN_COORTE}{' '}
              colaboradores com dados, para preservar a privacidade individual (LGPD).
            </span>
          </div>
        </div>
      )}

      {/* ── Relatório psicossocial WHO-5 ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Bem-estar psicossocial (WHO-5)</h2>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.keys(PERIODO_LABEL) as PeriodoPreset[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  periodo === p ? 'bg-white text-[#7d4a3c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {PERIODO_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Índice de bem-estar dos colaboradores no período, como subsídio à gestão de riscos
          psicossociais (NR-1). Instrumento validado (WHO-5); dados agregados e anônimos.
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

            {/* Quebra por setor */}
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

      {/* ── Certificados de disponibilização ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Certificados de disponibilização</h2>
            <span className="text-xs text-gray-400">{colabsCert.length}</span>
          </div>
          <button
            onClick={handleCertLote}
            disabled={colabsCert.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-40"
          >
            <FileDown className="w-4 h-4" />
            Emitir todos (PDF)
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Comprovam que cada colaborador teve o benefício <strong>disponível</strong> desde a
          ativação — evidência de diligência da empresa. Não contêm dados de uso nem de saúde.
        </p>

        {colabsCert.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-400">
            Nenhum colaborador para emitir certificado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Colaborador</th>
                  <th className="text-left font-medium py-2 hidden sm:table-cell">Setor</th>
                  <th className="text-left font-medium py-2 hidden md:table-cell">Desde</th>
                  <th className="text-right font-medium py-2">Certificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {colabsCert.map(c => (
                  <tr key={c.colaborador_id} className="hover:bg-gray-50 transition">
                    <td className="py-2 text-gray-700">{c.nome}</td>
                    <td className="py-2 text-gray-500 hidden sm:table-cell">
                      {c.setor || '—'}{c.funcao ? ` · ${c.funcao}` : ''}
                    </td>
                    <td className="py-2 text-gray-500 hidden md:table-cell">
                      {c.data_ativacao || c.data_adicao
                        ? new Date(c.data_ativacao ?? c.data_adicao).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleCertIndividual(c)}
                        className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Atestam apenas a disponibilização do benefício, não o uso efetivo. Não substituem o
            PGR/PCMSO nem as avaliações do SESMT/médico do trabalho.
          </span>
        </div>
      </div>

      {/* Cabeçalho + gerar */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Selo Malama — Compliance NR-1</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Gere um documento com os indicadores atuais do programa, como evidência documental
          complementar para o PGR da sua empresa.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{metricas.colaboradores_elegiveis}</p>
            <p className="text-xs text-gray-500 mt-1">Elegíveis</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{metricas.colaboradores_ativos}</p>
            <p className="text-xs text-gray-500 mt-1">Ativos</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-[#7d4a3c]">{taxa}%</p>
            <p className="text-xs text-gray-500 mt-1">Adesão</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{metricas.consultas_realizadas}</p>
            <p className="text-xs text-gray-500 mt-1">Consultas</p>
          </div>
        </div>

        <button
          onClick={handleGerar}
          disabled={gerando}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {gerando ? 'Gerando...' : 'Gerar documento para PGR'}
        </button>

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Documento é evidência documental complementar de programa de promoção de saúde — não
            substitui as obrigações legais de NR-1 nem o PGR da empresa.
          </span>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Documentos gerados</h2>
          <span className="text-xs text-gray-400">{docs.length}</span>
        </div>
        {docs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum documento gerado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Emitido em</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Adesão</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Baixar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800">{d.numero_doc}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtDateTime(d.emitido_em)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 hidden md:table-cell">
                      {d.colaboradores_ativos}/{d.colaboradores_elegiveis}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => rebaixar(d)} className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
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
