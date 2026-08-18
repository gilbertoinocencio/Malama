// =====================================================
// Malama — Portal do RH · Aba Compliance (NR-1 / Selo Malama)
// Gera, sob demanda, um PDF de evidência documental para o PGR da empresa.
// Métricas sempre AGREGADAS (nunca dado individual). Histórico re-baixável.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, FileDown, Download, AlertCircle, Info,
  Droplet, Beef, Activity, Sparkles, Flame, TrendingUp, Award,
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
  type CertificadoColaborador,
  type RhEmpresa,
} from '../../services/empresaService';
import { emitirRelatorioEvidencia, reemitirRelatorioEvidencia } from '../../lib/emissaoDocumentos';
import {
  generateCertificadoPDF, generateCertificadosLotePDF, type CertificadoMeta,
} from '../../lib/certificadoDisponibilizacao';
import { DossieNr1Card } from '../../components/rh/DossieNr1Card';
import { LinkSuporte } from '../../components/rh/LinkSuporte';
import { CabecalhoColapsavel, ResumoRecolhido } from '../../components/rh/SecaoColapsavel';
import { useScrollParaHash } from '../../hooks/useScrollParaHash';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { hashDocumento } from '../../lib/hashDocumento';

// Serviços disponibilizados a todo colaborador com assento, por modo
// contratado. O certificado é documento de evidência — precisa listar o
// que a empresa de fato contratou, nem a mais nem a menos.
const SERVICOS_MENTAL = [
  'Acompanhamento psicológico mensal por telemedicina (psicólogo com CRP e e-Psi ativo)',
  'Rastreio periódico de bem-estar (WHO-5)',
  'Avaliação de fatores de risco psicossocial no trabalho, com relatório agregado para o PGR',
];

const SERVICOS_METABOLICO = [
  'Acompanhamento nutricional contínuo com IA',
  'Telemedicina com endocrinologistas e nutrólogos',
  'Monitoramento metabólico e de composição corporal',
];

/**
 * Serviços a declarar no certificado — só os efetivamente contratados.
 *
 * Havia um fallback para a lista metabólica quando nenhum modo estava
 * marcado. O certificado começa com "A Malama declara, para os devidos
 * fins", então esse palpite virava declaração de serviço que a empresa podia
 * não ter contratado. Lista vazia agora BLOQUEIA a emissão: a migração
 * 20260727 já nasceu com modo_metabolico = true para todo contrato antigo,
 * então cair aqui significa dado inconsistente, não contrato legado.
 */
function servicosDoContrato(empresa: RhEmpresa | null): string[] {
  return [
    ...(empresa?.modo_mental ? SERVICOS_MENTAL : []),
    ...(empresa?.modo_metabolico ? SERVICOS_METABOLICO : []),
  ];
}

const MIN_COORTE = 5; // piso de privacidade: oculta % abaixo de 5 colaboradores com dados

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const RhCompliance: React.FC = () => {
  const { dados } = useRhJornada();
  const { acesso } = useRhAccess();
  const [metricas, setMetricas] = useState<RhComplianceMetricas | null>(null);
  const [empresa, setEmpresa] = useState<RhEmpresa | null>(null);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [bemestar, setBemestar] = useState<RhMetricasBemestar | null>(null);
  const [evolucao, setEvolucao] = useState<RhEvolucaoBemestar[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  // Certificados de disponibilização
  const [colabsCert, setColabsCert] = useState<CertificadoColaborador[]>([]);
  // Recolhido por padrão: a lista tem uma linha por colaborador e empurra o
  // relatório de evidência para fora da tela numa empresa grande.
  const [certAberto, setCertAberto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d, be, ev, cc, emp] = await Promise.all([
        rhService.getComplianceMetricas(),
        rhService.getComplianceDocs(),
        rhService.getMetricasBemestar(),
        rhService.getEvolucaoBemestar(),
        rhService.getCertificadoColaboradores(),
        rhService.getMyEmpresa(),
      ]);
      setMetricas(m);
      setEmpresa(emp);
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

  // Destino de "#relatorio-evidencia", vindo do marco de ciclo completo.
  useScrollParaHash(!loading);

  const servicos = servicosDoContrato(empresa);
  const podeEmitirCert = servicos.length > 0;

  const certMeta = (): CertificadoMeta => {
    const emitidoEm = new Date();
    const ymd = `${emitidoEm.getFullYear()}${String(emitidoEm.getMonth() + 1).padStart(2, '0')}${String(emitidoEm.getDate()).padStart(2, '0')}`;
    return {
      empresaNome: metricas?.nome ?? '',
      empresaCnpj: metricas?.cnpj ?? null,
      servicos,
      emitidoEm,
      numeroBase: `MAL-CERT-${ymd}`,
      emitidoPorNome: acesso.nome,
      emitidoPorEmail: acesso.email,
    };
  };

  const bloqueioServicos = () => {
    toast.error('O contrato desta empresa não tem serviços registrados. Fale com a Malama antes de emitir — o certificado declararia algo não contratado.');
  };

  const handleCertIndividual = (colab: CertificadoColaborador) => {
    if (!podeEmitirCert) { bloqueioServicos(); return; }
    try {
      generateCertificadoPDF(colab, certMeta());
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar certificado.');
    }
  };

  const handleCertLote = () => {
    if (!podeEmitirCert) { bloqueioServicos(); return; }
    // Ex-colaborador ENTRA no lote: é dele a alegação que o certificado
    // costuma responder. O documento fecha o período em vez de omiti-lo.
    if (colabsCert.length === 0) { toast.error('Nenhum colaborador para emitir.'); return; }
    try {
      generateCertificadosLotePDF(colabsCert, certMeta());
      toast.success(`${colabsCert.length} certificado(s) gerado(s).`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar certificados.');
    }
  };

  // A orquestração vive em `lib/emissaoDocumentos`, compartilhada com a aba
  // Documentos: é ela que registra antes de gerar, sela o snapshot e numera.
  // Duas cópias divergiriam e produziriam documentos com o mesmo número.
  const handleGerar = async () => {
    if (!metricas) return;
    setGerando(true);
    try {
      const ok = await emitirRelatorioEvidencia({
        metricas, modulos, jaEmitidos: docs.length,
        emissor: { nome: acesso.nome, email: acesso.email },
      });
      if (ok) load();
    } finally {
      setGerando(false);
    }
  };

  /** Reemissão a partir do registro — nunca dos números de hoje. */
  const rebaixar = (d: ComplianceDoc) => {
    if (!metricas) return;
    reemitirRelatorioEvidencia(d, metricas);
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

  const taxa = metricas.colaboradores_elegiveis > 0
    ? Math.round((metricas.colaboradores_ativos / metricas.colaboradores_elegiveis) * 100)
    : 0;

  // Os módulos vêm de `empresa`, a mesma fonte que o certificado já usa em
  // `servicosDoContrato` — e que não depende da migration 20260845. Assim a
  // descrição do documento fica correta assim que este código sobe.
  //
  // A SEPARAÇÃO das consultas por tipo de profissional é que depende da
  // migração. Sem ela os campos vêm `undefined`, e mostrar 0 seria afirmar
  // que ninguém foi atendido: nesse caso o documento volta ao número único,
  // como era antes.
  const modulos = { mental: !!empresa?.modo_mental, metabolico: !!empresa?.modo_metabolico };
  const temQuebraDeConsultas =
    metricas.consultas_psicologo != null && metricas.consultas_medico != null;

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

      {/* O índice de bem-estar (WHO-5) e as campanhas ficam na aba
          Saúde Mental — esta aba trata só de documentos e evidências. */}

      {/* ── Certificados de disponibilização ──
          Nasce recolhido: a tabela tem uma linha por colaborador (inclusive
          quem já saiu, de propósito), então numa empresa grande ela empurra
          o resto da aba — inclusive o relatório de evidência — para fora da
          tela. Quem precisa de certificado vem atrás dele; quem não precisa
          não deveria rolar centenas de linhas para chegar no que interessa. */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <CabecalhoColapsavel
            icone={<Award className="w-5 h-5 text-[#7d4a3c]" />}
            titulo="Certificados de disponibilização"
            contagem={colabsCert.length}
            aberto={certAberto}
            onToggle={() => setCertAberto(v => !v)}
            desabilitado={colabsCert.length === 0}
          />
          {certAberto && (
            <button
              onClick={handleCertLote}
              disabled={colabsCert.length === 0 || !podeEmitirCert}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-40"
            >
              <FileDown className="w-4 h-4" />
              Emitir todos (PDF)
            </button>
          )}
        </div>

        {!certAberto ? (
          <ResumoRecolhido onAbrir={() => setCertAberto(true)}>
            {colabsCert.length === 0
              ? 'Nenhum colaborador para emitir certificado ainda.'
              : `Emitir certificado de ${colabsCert.length} colaborador(es) — comprova que o benefício esteve disponível num período.`}
          </ResumoRecolhido>
        ) : (
        <>
        <p className="text-sm text-gray-500 mb-4">
          Comprovam que cada colaborador teve o benefício <strong>disponível</strong> em um período
          — evidência de diligência da empresa. Não contêm dados de uso nem de saúde. Quem já saiu
          continua na lista de propósito: é a alegação de ex-colaborador que este documento costuma
          responder, e nesse caso o certificado declara um período encerrado.
        </p>

        {!podeEmitirCert && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              A emissão está bloqueada: o contrato desta empresa não tem serviços registrados. O
              certificado é uma declaração formal, e sem essa informação ele listaria serviços que
              a empresa pode não ter contratado.
              <LinkSuporte
                assunto="Contrato sem serviços registrados"
                detalhe="A emissão do certificado está bloqueada por falta de serviços no contrato."
                rotulo="Pedir a regularização do cadastro"
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900 underline underline-offset-2"
              />
            </span>
          </div>
        )}

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
                  <th className="text-left font-medium py-2 hidden md:table-cell">Período coberto</th>
                  <th className="text-right font-medium py-2">Certificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {colabsCert.map(c => (
                  <tr key={c.colaborador_id} className="hover:bg-gray-50 transition">
                    <td className="py-2 text-gray-700">
                      {c.nome}
                      {c.data_saida && (
                        <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          vínculo encerrado
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-500 hidden sm:table-cell">
                      {c.setor || '—'}{c.funcao ? ` · ${c.funcao}` : ''}
                    </td>
                    <td className="py-2 text-gray-500 hidden md:table-cell">
                      {c.data_ativacao || c.data_adicao
                        ? new Date(c.data_ativacao ?? c.data_adicao).toLocaleDateString('pt-BR')
                        : '—'}
                      {c.data_saida
                        ? ` a ${new Date(c.data_saida).toLocaleDateString('pt-BR')}`
                        : ' até hoje'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleCertIndividual(c)}
                        disabled={!podeEmitirCert}
                        className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline disabled:opacity-40 disabled:no-underline"
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
        </>
        )}
      </div>

      {/* Cabeçalho + gerar.
          A âncora é o destino do marco de ciclo completo, no dashboard: sem
          ela o botão levava ao topo desta aba e o RH tinha que caçar, lá
          embaixo, o que ele acabou de pedir. */}
      <div id="relatorio-evidencia" className="scroll-mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Relatório de evidência do programa</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Gere um documento com os indicadores atuais do programa, como evidência documental
          complementar para o <strong>PGR</strong> da sua empresa. Ele não é o PGR e não substitui
          o seu: é uma peça que entra nele. Também não é certificado de conformidade — a
          responsabilidade técnica pela NR-1 continua sendo da empresa.
        </p>

        {/* Os mesmos indicadores que vão para o PDF, e pela mesma regra: só
            aparece consulta do módulo que a empresa contratou. Um card
            "Consultas concluídas: 0" numa empresa sem módulo de atendimento
            parece serviço contratado e não usado. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{metricas.colaboradores_elegiveis}</p>
            <p className="text-xs text-gray-500 mt-1">Com benefício disponível</p>
          </div>
          {/* "Ativado" e não "ativo": o número conta quem entrou ao menos uma
              vez, e chamar isso de adesão afirmaria uso que não foi medido. */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{metricas.colaboradores_ativos}</p>
            <p className="text-xs text-gray-500 mt-1">Acesso ativado</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-[#7d4a3c]">{taxa}%</p>
            <p className="text-xs text-gray-500 mt-1">Taxa de ativação</p>
          </div>
          {(!temQuebraDeConsultas || modulos.mental) && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{metricas.consultas_psicologo}</p>
              <p className="text-xs text-gray-500 mt-1">Consultas com psicólogo</p>
            </div>
          )}
          {temQuebraDeConsultas && modulos.metabolico && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{metricas.consultas_medico}</p>
              <p className="text-xs text-gray-500 mt-1">Consultas médicas</p>
            </div>
          )}
        </div>

        {/* O leitor precisa saber o escopo do que acabou de ler. */}
        <p className="mb-3 text-xs text-gray-500">
          Módulos contratados: <strong className="text-gray-700">
            {[
              'gestão de risco psicossocial',
              metricas.modo_mental ? 'saúde mental' : null,
              metricas.modo_metabolico ? 'saúde metabólica' : null,
            ].filter(Boolean).join(' · ')}
          </strong>. O documento descreve apenas estes — e é isso que ele declara formalmente.
        </p>
        <p className="mb-5 text-xs leading-relaxed text-gray-400">
          Acesso ativado significa que a pessoa entrou ao menos uma vez na plataforma — não mede
          frequência de uso nem resultado clínico. As contagens são de pessoas distintas: quem foi
          desligado e readmitido conta uma vez só.
        </p>

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
