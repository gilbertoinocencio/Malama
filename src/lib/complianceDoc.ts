// =====================================================
// Malama — Gerador do Documento de Compliance NR-1 (Selo Malama)
// Evidência documental complementar para o PGR da empresa-cliente.
// PDF client-side com jsPDF, a partir de um snapshot de métricas AGREGADAS.
// =====================================================

import jsPDF from 'jspdf';

// Paleta Malama
const MAIN: [number, number, number] = [28, 25, 23];     // #1C1917
const PETROL: [number, number, number] = [140, 71, 62];  // #8c473e
const MUTED: [number, number, number] = [87, 83, 78];    // #57534E

const PROGRAMA = 'Programa Malama de Gestão de Risco Psicossocial e Saúde Metabólica';

const DESCRICAO =
  'A Malama oferece aos colaboradores acompanhamento nutricional contínuo, telemedicina ' +
  'com profissionais habilitados e monitoramento metabólico (incluindo terapias GLP-1 quando ' +
  'indicadas clinicamente), atuando na promoção de saúde e na redução de fatores de risco ' +
  'psicossocial relacionados ao bem-estar e à qualidade de vida no trabalho.';

const DISCLAIMER =
  'Este documento é uma evidência documental complementar de programa de promoção de saúde e ' +
  'gestão de risco psicossocial. Não substitui as obrigações legais da empresa quanto à NR-1 ' +
  'nem o Programa de Gerenciamento de Riscos (PGR), servindo como material de apoio à sua composição.';

export interface ComplianceDocData {
  empresaNome: string;
  empresaCnpj: string | null;
  dataInicio: string | null;            // adesão (YYYY-MM-DD)
  colaboradoresElegiveis: number;
  colaboradoresAtivos: number;
  consultasRealizadas: number;
  numeroDoc: string;
  emitidoEm: Date;
}

const fmtDate = (d: string | Date | null) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function generateCompliancePDF(data: ComplianceDocData): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
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
  doc.text('SELO DE COMPLIANCE — SAÚDE CORPORATIVA', M, 25);

  // ── Título ──
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titulo = doc.splitTextToSize(PROGRAMA, pageW - M * 2);
  doc.text(titulo, M, 48);

  let y = 48 + titulo.length * 7 + 6;

  // ── Empresa ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  y += 7;
  doc.text(data.empresaNome, M, y);
  if (data.empresaCnpj) { y += 6; doc.text(`CNPJ: ${data.empresaCnpj}`, M, y); }
  y += 6;
  doc.text(`Período de adesão: desde ${fmtDate(data.dataInicio)}`, M, y);

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
    ['Colaboradores elegíveis', String(data.colaboradoresElegiveis)],
    ['Colaboradores ativos no programa', String(data.colaboradoresAtivos)],
    ['Taxa de adesão', `${taxa}%`],
    ['Consultas de telemedicina realizadas', String(data.consultasRealizadas)],
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

  // ── Descrição do programa ──
  y += 8;
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

  // ── Disclaimer ──
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, pageW - M, y);
  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const disc = doc.splitTextToSize(DISCLAIMER, pageW - M * 2);
  doc.text(disc, M, y);
  y += disc.length * 4 + 8;

  // ── Rodapé: número e emissão ──
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Documento nº ${data.numeroDoc}`, M, y);
  doc.text(`Emitido em ${fmtDate(data.emitidoEm)}`, pageW - M, y, { align: 'right' });

  doc.save(`compliance-malama-${data.numeroDoc}.pdf`);
}
