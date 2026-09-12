// =====================================================
// Malama — Portal do RH · Aba Documentos
//
// Os documentos nasciam onde o dado deles estava: o relatório de evidência
// no fim da aba Compliance, o WHO-5 e o JSS no fim da Saúde Mental, os
// certificados no meio do Compliance. Quem precisava "dos papéis" — porque
// chegou fiscalização, porque o jurídico pediu, porque o cliente quer
// mostrar à diretoria — tinha que saber de cor onde cada um morava.
//
// Aqui eles ficam juntos, com o histórico do que já foi emitido. A regra de
// emissão não vive nesta tela: está em `lib/emissaoDocumentos`, para a aba
// e as telas de origem nunca divergirem sobre numeração e selo.
//
// A aba só aparece quando o ciclo fecha (ver RhLayout): antes disso não há
// o que documentar, e uma aba vazia no dia 1 é mais uma decisão para quem
// já está perdido.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Download, FileDown, FileText, HeartPulse, Activity, ShieldCheck,
  History, AlertCircle, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, modulosDaEmpresa, RELATORIO_TIPO_LABEL,
  type CertificadoColaborador, type ComplianceDoc, type RelatorioEmitido,
  type RhComplianceMetricas, type RhRelatorioJss, type RhRelatorioPsicossocial,
} from '../../services/empresaService';
import {
  generateCertificadoPDF, generateCertificadosLotePDF, type CertificadoMeta,
} from '../../lib/certificadoDisponibilizacao';
import {
  emitirRelatorioEvidencia, emitirRelatorioPsicossocial,
  reemitirRelatorioEvidencia, reemitirRelatorioPsicossocial,
} from '../../lib/emissaoDocumentos';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { useRhJornada } from '../../contexts/RhJornadaContext';

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

const fmtDataHora = (d: string) =>
  new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

/** Período do relatório psicossocial. Trimestre cobre a cadência do JSS e é
 *  o recorte que o RH leva para a reunião; os outros ficam disponíveis para
 *  quem precisa fechar um período específico. */
type Periodo = 'mes' | 'tri' | 'semestre' | 'ano';
const PERIODO_MESES: Record<Periodo, number> = { mes: 1, tri: 3, semestre: 6, ano: 12 };
const PERIODO_LABEL: Record<Periodo, string> = {
  mes: 'Último mês', tri: 'Último trimestre', semestre: 'Último semestre', ano: 'Último ano',
};

function intervalo(p: Periodo) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - PERIODO_MESES[p]);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

/** Moldura comum de cada documento: o que é, quando serve, e a ação. */
const CartaoDocumento: React.FC<{
  icone: React.ReactNode;
  titulo: string;
  paraQue: string;
  detalhe?: React.ReactNode;
  acao: React.ReactNode;
}> = ({ icone, titulo, paraQue, detalhe, acao }) => (
  <section className="rounded-xl bg-white p-5 shadow">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7d4a3c]/10 text-[#7d4a3c]">
          {icone}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-800">{titulo}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">{paraQue}</p>
          {detalhe}
        </div>
      </div>
      <div className="shrink-0">{acao}</div>
    </div>
  </section>
);

const botao = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#623a2f] disabled:opacity-40';

export const RhDocumentos: React.FC = () => {
  const { acesso } = useRhAccess();
  const { empresa } = useRhJornada();
  const emissor = { nome: acesso.nome, email: acesso.email };

  const [metricas, setMetricas] = useState<RhComplianceMetricas | null>(null);
  const [docsEvidencia, setDocsEvidencia] = useState<ComplianceDoc[]>([]);
  const [emitidos, setEmitidos] = useState<RelatorioEmitido[]>([]);
  const [colabsCert, setColabsCert] = useState<CertificadoColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>('tri');
  const [jss, setJss] = useState<RhRelatorioJss | null>(null);
  const [who5, setWho5] = useState<RhRelatorioPsicossocial | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d, e, cc] = await Promise.all([
        rhService.getComplianceMetricas(),
        rhService.getComplianceDocs(),
        rhService.getRelatoriosEmitidos(),
        rhService.getCertificadoColaboradores(),
      ]);
      setMetricas(m); setDocsEvidencia(d); setEmitidos(e); setColabsCert(cc);
    } catch (err) {
      console.error('[documentos] carga:', err);
      toast.error('Não foi possível carregar os documentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  // Os relatórios psicossociais dependem do período escolhido, então são
  // recarregados à parte — trocar o período não deve recarregar a aba toda.
  useEffect(() => {
    let cancelado = false;
    const { inicio, fim } = intervalo(periodo);
    void Promise.all([
      rhService.getRelatorioJss(inicio, fim).catch(() => null),
      rhService.getRelatorioPsicossocial(inicio, fim).catch(() => null),
    ]).then(([j, w]) => { if (!cancelado) { setJss(j); setWho5(w); } });
    return () => { cancelado = true; };
  }, [periodo]);

  const modulos = { mental: !!empresa?.modo_mental, metabolico: !!empresa?.modo_metabolico };
  const servicos = [
    ...(modulos.mental ? SERVICOS_MENTAL : []),
    ...(modulos.metabolico ? SERVICOS_METABOLICO : []),
  ];

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

  const comAcao = async (chave: string, fn: () => Promise<unknown>) => {
    setGerando(chave);
    try { await fn(); } finally { setGerando(null); }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium text-gray-600">Não foi possível carregar os dados da empresa.</p>
      </div>
    );
  }

  // Relatório psicossocial só sai com respondentes suficientes: abaixo do
  // piso o agregado é suprimido e o documento não teria resultado a mostrar.
  const jssPronto = !!jss && 'indice_medio' in (jss.geral as object);
  const who5Pronto = !!who5 && 'score_medio' in (who5.geral as object);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Documentos da empresa</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500">
          Tudo que a sua empresa consegue emitir sobre o programa, num lugar só. Cada documento sai
          com número, data e selo de verificação, e fica registrado — reemitir depois reproduz o
          mesmo conteúdo, e não os números de hoje.
        </p>
      </div>

      {/* ── Relatório de evidência (subsídio ao PGR) ── */}
      <CartaoDocumento
        icone={<ShieldCheck className="h-5 w-5" />}
        titulo="Relatório de evidência do programa"
        paraQue="A peça que entra no PGR da sua empresa: indicadores do programa no período, com os módulos contratados declarados. Não é o PGR nem substitui o seu."
        detalhe={
          <p className="mt-2 text-xs text-gray-500">
            Módulos declarados: <strong className="text-gray-700">{modulosDaEmpresa(empresa).join(' · ') || '—'}</strong>
            {docsEvidencia[0] && (
              <> · último emitido <strong className="text-gray-700">{docsEvidencia[0].numero_doc}</strong> em {fmtDataHora(docsEvidencia[0].emitido_em)}</>
            )}
          </p>
        }
        acao={
          <button
            type="button"
            className={botao}
            disabled={gerando === 'evidencia'}
            onClick={() => comAcao('evidencia', async () => {
              const ok = await emitirRelatorioEvidencia({
                metricas, modulos, jaEmitidos: docsEvidencia.length, emissor,
              });
              if (ok) await carregar();
            })}
          >
            <FileDown className="h-4 w-4" />
            {gerando === 'evidencia' ? 'Gerando...' : 'Gerar'}
          </button>
        }
      />

      {/* ── Relatórios psicossociais ── */}
      <section className="rounded-xl bg-white p-5 shadow">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Relatórios do diagnóstico</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            Período
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value as Periodo)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[#7d4a3c]"
            >
              {(Object.keys(PERIODO_LABEL) as Periodo[]).map(p => (
                <option key={p} value={p}>{PERIODO_LABEL[p]}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-500">
          O resultado agregado do período, com o plano de ação anexado — diagnóstico sem medida
          registrada documenta que a empresa sabia do risco e não agiu.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#7d4a3c]" />
              <span className="font-semibold text-gray-800">Carga de trabalho (JSS)</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Separa cobrança, autonomia e apoio por setor. É o que aponta a FONTE do risco.
            </p>
            <button
              type="button"
              className={`${botao} mt-3`}
              disabled={!jssPronto || gerando === 'jss'}
              onClick={() => comAcao('jss', async () => {
                if (!jss) return;
                const ok = await emitirRelatorioPsicossocial('jss', jss, emissor);
                if (ok) setEmitidos(await rhService.getRelatoriosEmitidos());
              })}
            >
              <FileDown className="h-4 w-4" />
              {gerando === 'jss' ? 'Gerando...' : 'Gerar relatório JSS'}
            </button>
            {!jssPronto && (
              <p className="mt-2 text-xs text-gray-400">
                Sem respondentes suficientes no período para publicar o agregado.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-[#7d4a3c]" />
              <span className="font-semibold text-gray-800">Bem-estar (WHO-5)</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Mostra como as pessoas estão. Documenta o sintoma, não a causa.
            </p>
            <button
              type="button"
              className={`${botao} mt-3`}
              disabled={!who5Pronto || gerando === 'who5'}
              onClick={() => comAcao('who5', async () => {
                if (!who5) return;
                const ok = await emitirRelatorioPsicossocial('who5', who5, emissor);
                if (ok) setEmitidos(await rhService.getRelatoriosEmitidos());
              })}
            >
              <FileDown className="h-4 w-4" />
              {gerando === 'who5' ? 'Gerando...' : 'Gerar relatório WHO-5'}
            </button>
            {!who5Pronto && (
              <p className="mt-2 text-xs text-gray-400">
                Sem respondentes suficientes no período para publicar o agregado.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Certificados de disponibilização ── */}
      <CartaoDocumento
        icone={<Award className="h-5 w-5" />}
        titulo="Certificados de disponibilização"
        paraQue="Comprovam que cada colaborador teve o benefício disponível num período — evidência de diligência. Não contêm dados de uso nem de saúde, e quem já saiu continua na lista de propósito: é a alegação de ex-colaborador que este documento costuma responder."
        detalhe={
          servicos.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              A emissão está bloqueada: o contrato não tem serviços registrados, e o certificado
              declararia algo não contratado.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">{colabsCert.length} colaborador(es) na lista.</p>
          )
        }
        acao={
          <button
            type="button"
            className={botao}
            disabled={colabsCert.length === 0 || servicos.length === 0 || gerando === 'cert'}
            onClick={() => comAcao('cert', async () => {
              try {
                generateCertificadosLotePDF(colabsCert, certMeta());
                toast.success(`${colabsCert.length} certificado(s) gerado(s).`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Erro ao gerar certificados.');
              }
            })}
          >
            <FileDown className="h-4 w-4" />
            Emitir todos
          </button>
        }
      />

      {/* ── Histórico ──
          Duas origens (empresa_compliance_docs e empresa_relatorios_emitidos)
          numa lista só: para quem procura "o documento que emiti mês passado",
          a tabela em que ele foi gravado é irrelevante. */}
      <section className="rounded-xl bg-white p-5 shadow">
        <div className="mb-1 flex items-center gap-2">
          <History className="h-5 w-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Documentos já emitidos</h2>
          <span className="text-xs text-gray-400">{docsEvidencia.length + emitidos.length}</span>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Reemitir reproduz o conteúdo arquivado, com o número e a data originais — é o que permite
          provar quando a empresa tomou ciência de cada resultado.
        </p>

        {docsEvidencia.length + emitidos.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-400">
            Nenhum documento emitido ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="py-2 text-left font-medium">Documento</th>
                  <th className="py-2 text-left font-medium">Número</th>
                  <th className="hidden py-2 text-left font-medium sm:table-cell">Emitido em</th>
                  <th className="py-2 text-right font-medium">Reemitir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docsEvidencia.map(d => (
                  <tr key={d.id}>
                    <td className="py-2 text-gray-700">Relatório de evidência</td>
                    <td className="py-2 font-mono text-xs text-gray-600">{d.numero_doc}</td>
                    <td className="hidden py-2 text-xs text-gray-500 sm:table-cell">{fmtDataHora(d.emitido_em)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => reemitirRelatorioEvidencia(d, metricas)}
                        className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {emitidos.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 text-gray-700">{RELATORIO_TIPO_LABEL[r.tipo]}</td>
                    <td className="py-2 font-mono text-xs text-gray-600">{r.numero_doc}</td>
                    <td className="hidden py-2 text-xs text-gray-500 sm:table-cell">{fmtDataHora(r.emitido_em)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void reemitirRelatorioPsicossocial(r)}
                        className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
        O estado das evidências — o que já fecha e o que falta — fica no dossiê.
        <Link to="/rh/compliance" className="inline-flex items-center gap-1 font-medium text-[#7d4a3c] hover:underline">
          Abrir o dossiê NR-1 <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
};
