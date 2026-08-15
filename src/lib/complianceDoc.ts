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

const PROGRAMA = 'Programa Malama de Gestão de Risco Psicossocial e Saúde Metabólica';

const DESCRICAO =
  'A Malama oferece aos colaboradores acompanhamento nutricional contínuo, telemedicina ' +
  'com profissionais habilitados e monitoramento metabólico (incluindo terapias GLP-1 quando ' +
  'indicadas clinicamente), atuando na promoção de saúde e na redução de fatores de risco ' +
  'psicossocial relacionados ao bem-estar e à qualidade de vida no trabalho.';

// O que os números medem, dito no próprio documento. Sem esta nota, "acesso
// ativado" é lido como "colaborador usa o programa".
const NOTA_METRICAS =
  'Sobre os indicadores: "acesso ativado" significa que o colaborador entrou ao menos uma vez ' +
  'na plataforma, e não mede a frequência de uso nem o resultado clínico de ninguém. As ' +
  'contagens são de pessoas distintas, não de vínculos: quem foi desligado e readmitido conta ' +
  'uma vez. Consultas realizadas são atendimentos concluídos por telemedicina no período, em ' +
  'número absoluto e sem qualquer identificação de paciente.';

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
  const titulo = doc.splitTextToSize(PROGRAMA, pageW - M * 2);
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
    ['Consultas de telemedicina concluídas', String(data.consultasRealizadas)],
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
  const nota = doc.splitTextToSize(NOTA_METRICAS, pageW - M * 2);
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
  const desc = doc.splitTextToSize(DESCRICAO, pageW - M * 2);
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
