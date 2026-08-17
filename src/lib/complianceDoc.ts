// =====================================================
// Malama — Relatório de Evidência do Programa (subsídio ao PGR)
//
// Chamava-se "Selo de Compliance". O nome foi trocado por risco jurídico: a
// Malama não é organismo certificador, e um cabeçalho que sugere atestado de
// conformidade brigando com um rodapé que o nega enfraquece os dois. Pior,
// cria no cliente a impressão de estar coberto.
//
// As métricas também foram renomeadas para o que de fato medem. "Adesão"
// dava a entender uso do programa, quando o número conta quem ATIVOU o
// acesso. Documento que afirma mais do que o dado sustenta é atacável — e a
// contestação de um número derruba a credibilidade do documento inteiro.
// =====================================================

import jsPDF from 'jspdf';
import {
  MAIN, PETROL, MUTED, blocoIdentificacao, fmtDate, type EmissaoMeta,
} from './relatorioBlocos';

/**
 * Módulos contratados. O documento é uma declaração formal: descrever
 * telemedicina e acompanhamento metabólico para uma empresa que só
 * contratou o módulo psicossocial afirma serviço que ela não tem — e uma
 * afirmação falsa derruba a credibilidade do documento inteiro, inclusive
 * das partes verdadeiras. Todo mundo tem a base de compliance; mental e
 * metabólico são camadas por cima dela.
 */
export type ModulosContratados = {
  mental: boolean;
  metabolico: boolean;
};

const NOME_BASE = 'Programa Malama de Gestão de Risco Psicossocial';

function nomeDoPrograma(m: ModulosContratados): string {
  if (m.mental && m.metabolico) return `${NOME_BASE}, Saúde Mental e Saúde Metabólica`;
  if (m.mental) return `${NOME_BASE} e Saúde Mental`;
  if (m.metabolico) return `${NOME_BASE} e Saúde Metabólica`;
  return NOME_BASE;
}

// A base é o que TODA empresa cliente tem: o ciclo de identificação,
// avaliação e controle de risco psicossocial que a NR-1 pede.
const BASE =
  'A Malama fornece à empresa instrumentos validados de avaliação de fatores psicossociais '
  + 'aplicados por setor, cálculo de risco por método rastreável, plano de ação com '
  + 'responsável, prazo e nível na hierarquia de controle, e o registro documental de cada '
  + 'etapa do ciclo.';

const MENTAL =
  'A empresa contratou o módulo de saúde mental: os colaboradores têm acesso a atendimento '
  + 'psicológico com profissionais habilitados, por telessaúde, como medida de cuidado '
  + 'individual complementar às medidas de controle na fonte.';

// Sem citar classe de medicamento. A conduta é decisão clínica de cada
// pessoa com o seu médico, e nomeá-la aqui daria a entender que a EMPRESA
// contratou um tratamento farmacológico para o quadro — num documento que
// circula no RH e vai para o PGR. O que a empresa contratou é o acesso ao
// cuidado; o que é prescrito dentro dele não é assunto dela.
const METABOLICO =
  'A empresa contratou o módulo de saúde metabólica: os colaboradores têm acompanhamento '
  + 'nutricional contínuo, telemedicina com profissionais habilitados e monitoramento de '
  + 'indicadores metabólicos, com conduta clínica definida individualmente entre o '
  + 'colaborador e o profissional que o atende.';

const SEM_CUIDADO =
  'A empresa não contratou módulos de atendimento individual (saúde mental ou saúde '
  + 'metabólica). Este documento cobre exclusivamente a gestão do risco psicossocial.';

function descricaoDoPrograma(m: ModulosContratados): string {
  const partes = [BASE];
  if (m.mental) partes.push(MENTAL);
  if (m.metabolico) partes.push(METABOLICO);
  if (!m.mental && !m.metabolico) partes.push(SEM_CUIDADO);
  return partes.join(' ');
}

// O que os números medem, dito no próprio documento. Sem esta nota, "acesso
// ativado" é lido como "colaborador usa o programa".
const NOTA_BASE =
  'Sobre os indicadores: "acesso ativado" significa que o colaborador entrou ao menos uma vez ' +
  'na plataforma, e não mede a frequência de uso nem o resultado clínico de ninguém. As ' +
  'contagens são de pessoas distintas, não de vínculos: quem foi desligado e readmitido conta ' +
  'uma vez.';

const NOTA_CONSULTAS =
  ' As consultas são atendimentos concluídos por telessaúde no período, separados por tipo de ' +
  'profissional, em número absoluto e sem qualquer identificação de paciente.';

/** A nota não pode explicar um indicador que não está na tabela: numa
 *  empresa sem módulo de atendimento, falar de consultas sugere um serviço
 *  que o documento não reporta. */
function notaDeMetricas(data: ComplianceDocData): string {
  const temConsultas = linhasDeAtendimento(data).length > 0;
  return temConsultas ? NOTA_BASE + NOTA_CONSULTAS : NOTA_BASE;
}

const DISCLAIMER =
  'Este documento é evidência documental complementar de programa de promoção de saúde e ' +
  'gestão de risco psicossocial, para composição do Programa de Gerenciamento de Riscos (PGR) ' +
  'no contexto da NR-1. NÃO é certificado de conformidade, não é emitido por organismo ' +
  'certificador e não atesta que a empresa cumpre a norma. Não substitui as obrigações legais ' +
  'da empresa quanto à NR-1, ao PGR, ao PCMSO ou às avaliações do SESMT e do médico do ' +
  'trabalho, cuja responsabilidade técnica permanece integralmente com a empresa-cliente.';

export interface ComplianceDocData extends EmissaoMeta {
  empresaNome: string;
  empresaCnpj: string | null;
  dataInicio: string | null;            // adesão (YYYY-MM-DD)
  periodoFim: string;                   // fecha o intervalo do documento
  colaboradoresElegiveis: number;
  colaboradoresAtivos: number;
  consultasRealizadas: number;
  /** Módulos vigentes na emissão. Ausente = documento antigo, emitido antes
   *  de o programa ser desmembrado; nesse caso o texto descreve o programa
   *  completo, como estava no original, e o PDF diz isso. */
  modulos?: ModulosContratados;
  /** Quebra por tipo de profissional. Ausente nos documentos antigos. */
  consultasPsicologo?: number | null;
  consultasMedico?: number | null;
}

/** Indicadores de atendimento, só dos módulos que a empresa contratou.
 *  Sem isto o documento listava "consultas de telemedicina" mesmo para quem
 *  não contratou atendimento nenhum — uma linha com zero que dá a entender
 *  um serviço inexistente e ninguém usou. */
function linhasDeAtendimento(data: ComplianceDocData): [string, string][] {
  const m = data.modulos;
  const agregado: [string, string][] =
    [['Consultas de telessaúde concluídas', String(data.consultasRealizadas)]];

  // Documento antigo: sem os módulos gravados, reproduz o número único.
  if (!m) return agregado;
  // Contratou só a gestão de risco: não há atendimento a reportar, e uma
  // linha zerada sugeriria serviço contratado e não usado.
  if (!m.mental && !m.metabolico) return [];

  // Módulos conhecidos, mas a quebra por profissional ainda não (a RPC só a
  // devolve a partir da migration 20260845). Zerar as duas linhas afirmaria
  // que ninguém foi atendido — o total agregado é o que se pode sustentar.
  const temQuebra = data.consultasPsicologo != null && data.consultasMedico != null;
  if (!temQuebra) return agregado;

  const linhas: [string, string][] = [];
  if (m.mental) linhas.push(['Consultas com psicólogo concluídas', String(data.consultasPsicologo)]);
  if (m.metabolico) linhas.push(['Consultas médicas concluídas', String(data.consultasMedico)]);
  return linhas;
}

export function generateCompliancePDF(data: ComplianceDocData): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20; // margem

  // ── Header escuro ──
  doc.setFillColor(...MAIN);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Malama', M, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PETROL);
  doc.text('RELATÓRIO DE EVIDÊNCIA DO PROGRAMA — SUBSÍDIO AO PGR', M, 25);

  // ── Título ──
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titulo = doc.splitTextToSize(nomeDoPrograma(data.modulos ?? { mental: true, metabolico: true }), pageW - M * 2);
  doc.text(titulo, M, 48);

  let y = 48 + titulo.length * 7 + 6;

  // ── Empresa + período fechado ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  y += 7;
  doc.text(data.empresaNome, M, y);
  if (data.empresaCnpj) { y += 6; doc.text(`CNPJ: ${data.empresaCnpj}`, M, y); }
  y += 6;
  // Intervalo, não "desde": evidência sem data final não delimita o que
  // está sendo afirmado.
  doc.text(
    `Período coberto: ${fmtDate(data.dataInicio)} a ${fmtDate(data.periodoFim)}`,
    M, y,
  );
  y += 6;
  doc.text(`Documento nº ${data.numeroDoc} · emitido em ${fmtDate(data.emitidoEm)}`, M, y);

  // ── Indicadores ──
  y += 12;
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INDICADORES DO PROGRAMA', M, y);

  const taxa = data.colaboradoresElegiveis > 0
    ? Math.round((data.colaboradoresAtivos / data.colaboradoresElegiveis) * 100)
    : 0;

  const linhas: [string, string][] = [
    ['Colaboradores com benefício disponível', String(data.colaboradoresElegiveis)],
    ['Colaboradores com acesso ativado', String(data.colaboradoresAtivos)],
    ['Taxa de ativação de acesso', `${taxa}%`],
    ...linhasDeAtendimento(data),
  ];

  y += 4;
  doc.setFillColor(242, 235, 230); // petrol-light
  doc.roundedRect(M - 2, y, pageW - M * 2 + 4, linhas.length * 9 + 6, 3, 3, 'F');
  y += 9;
  doc.setFontSize(10);
  for (const [label, valor] of linhas) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label, M + 2, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MAIN);
    doc.text(valor, pageW - M - 2, y, { align: 'right' });
    y += 9;
  }

  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const nota = doc.splitTextToSize(notaDeMetricas(data), pageW - M * 2);
  doc.text(nota, M, y);
  y += nota.length * 4 + 6;

  // ── Descrição do programa ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...MAIN);
  doc.text('SOBRE O PROGRAMA', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const desc = doc.splitTextToSize(descricaoDoPrograma(data.modulos ?? { mental: true, metabolico: true }), pageW - M * 2);
  doc.text(desc, M, y);
  y += desc.length * 5 + 8;

  // ── Natureza do documento ──
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, pageW - M, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PETROL);
  doc.text('NATUREZA COMPLEMENTAR DESTE DOCUMENTO', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const disc = doc.splitTextToSize(DISCLAIMER, pageW - M * 2);
  doc.text(disc, M, y);
  y += disc.length * 4 + 8;

  blocoIdentificacao(doc, y, pageW, pageH, M, data);

  doc.save(`relatorio-evidencia-malama-${data.numeroDoc}.pdf`);
}
