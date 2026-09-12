// =====================================================
// Malama — Portal do RH · Aba Compliance (NR-1 / Selo Malama)
// Gera, sob demanda, um PDF de evidência documental para o PGR da empresa.
// Métricas sempre AGREGADAS (nunca dado individual). Histórico re-baixável.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileDown, AlertCircle, Info, ArrowRight,
  Droplet, Beef, Activity, Sparkles, Flame, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  rhService,
  type RhComplianceMetricas,
  type RhMetricasBemestar,
  type RhEvolucaoBemestar,
} from '../../services/empresaService';
import { DossieNr1Card } from '../../components/rh/DossieNr1Card';
import { LinkSuporte } from '../../components/rh/LinkSuporte';
import { useScrollParaHash } from '../../hooks/useScrollParaHash';
import { useRhJornada } from '../../contexts/RhJornadaContext';

const MIN_COORTE = 5; // piso de privacidade: oculta % abaixo de 5 colaboradores com dados

export const RhCompliance: React.FC = () => {
  const { dados, empresa } = useRhJornada();
  const [metricas, setMetricas] = useState<RhComplianceMetricas | null>(null);
  const [bemestar, setBemestar] = useState<RhMetricasBemestar | null>(null);
  const [evolucao, setEvolucao] = useState<RhEvolucaoBemestar[]>([]);
  const [loading, setLoading] = useState(true);

  // Hábitos (água, proteína, atividade, flow) só existem para quem usa o
  // app de nutrição. Sem o modo metabólico o card ficaria eternamente em
  // "dados insuficientes" — e nem vale a consulta.
  const metabolico = !!empresa?.modo_metabolico;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // O histórico de documentos e a lista de certificados saíram daqui
      // junto com a emissão: quem carrega isso agora é a aba Documentos.
      const [m, be, ev] = await Promise.all([
        rhService.getComplianceMetricas(),
        metabolico ? rhService.getMetricasBemestar() : null,
        metabolico ? rhService.getEvolucaoBemestar() : [],
      ]);
      setMetricas(m);
      setBemestar(be);
      setEvolucao(ev);
    } catch (err) {
      console.error('Erro ao carregar compliance:', err);
      toast.error('Erro ao carregar dados de compliance.');
    } finally {
      setLoading(false);
    }
  }, [metabolico]);

  useEffect(() => { load(); }, [load]);

  // Destino de "#relatorio-evidencia", vindo do marco de ciclo completo.
  useScrollParaHash(!loading);

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
        <p className="text-gray-400 text-sm mt-1">
          Não é algo que se resolva daqui — o suporte consegue ver o que travou a leitura.
        </p>
        <LinkSuporte
          assunto="Dados de compliance indisponíveis"
          detalhe="A aba Compliance não consegue carregar os dados da empresa."
        />
      </div>
    );
  }

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
      {/* Primeiro de tudo: é a pergunta que traz o RH a esta aba. */}
      <DossieNr1Card dados={dados} />

      {/* Resultados do plano metabólico — só quando contratado. */}
      {metabolico && bemestar && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Resultados do plano metabólico</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Evolução dos hábitos dos colaboradores que usam o app nos últimos 30 dias
            (comparado aos 30 anteriores).
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

      {/* O índice de bem-estar (WHO-5) e as campanhas ficam na aba
          Saúde Mental — esta aba trata só de documentos e evidências. */}

      {/* Certificados, relatório de evidência e histórico saíram desta aba:
          vivem na aba Documentos, junto com os relatórios do diagnóstico.
          Compliance ficou com o que é LEITURA do estado — o dossiê e os
          indicadores — e a emissão passou a ter um endereço só. */}
      <Link
        to="/rh/documentos"
        className="flex items-center justify-between gap-3 rounded-xl border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 p-5 transition hover:bg-[#7d4a3c]/10"
      >
        <span className="flex min-w-0 items-start gap-3">
          <FileDown className="mt-0.5 h-5 w-5 shrink-0 text-[#7d4a3c]" />
          <span className="min-w-0">
            <span className="block font-semibold text-gray-800">Emitir documentos</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">
              Relatório de evidência para o PGR, relatórios do diagnóstico, certificados de
              disponibilização e o histórico do que já foi emitido.
            </span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#7d4a3c]" />
      </Link>
    </div>
  );
};
