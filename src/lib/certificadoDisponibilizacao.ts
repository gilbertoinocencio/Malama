// =====================================================
// Malama — Certificado de Disponibilização do Benefício
// Comprova que a empresa DISPONIBILIZOU o cuidado ao colaborador desde
// uma data — instrumento de defesa (diligência prévia) em eventual
// discussão de nexo causal/doença ocupacional. NÃO contém dados de uso.
//
// TEXTO JURÍDICO: rascunho padrão, sujeito a revisão pelo jurídico da
// empresa-cliente.
// =====================================================

import jsPDF from 'jspdf';
import type { CertificadoColaborador } from '../services/empresaService';

const MAIN: [number, number, number] = [28, 25, 23];
const PETROL: [number, number, number] = [140, 71, 62];
const MUTED: [number, number, number] = [87, 83, 78];

const CORPO =
  'A Malama declara, para os devidos fins, que o(a) colaborador(a) abaixo identificado(a) teve ' +
  'à sua disposição, por meio do programa de saúde corporativa contratado por sua empresa, os ' +
  'serviços de cuidado à saúde e bem-estar listados neste documento, desde a data de ativação ' +
  'indicada.';

const DISCLAIMER =
  'Este certificado atesta exclusivamente a DISPONIBILIZAÇÃO do benefício ao colaborador, como ' +
  'evidência de diligência da empresa na promoção de saúde e bem-estar (NR-1). Não reflete o uso ' +
  'efetivo dos serviços pelo colaborador, não contém dados de saúde e não substitui as obrigações ' +
  'legais da empresa quanto ao PGR, ao PCMSO ou às avaliações do SESMT/médico do trabalho.';

const fmtDate = (d: string | Date | null) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.length <= 10 ? d + 'T00:00:00' : d) : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export interface CertificadoMeta {
  empresaNome: string;
  empresaCnpj: string | null;
  servicos: string[];        // serviços disponíveis do plano da empresa
  emitidoEm: Date;
  numeroBase: string;        // ex.: MAL-CERT-20260723
}

// Desenha UM certificado na página atual, a partir do topo.
function drawCertificado(
  doc: jsPDF,
  colab: CertificadoColaborador,
  meta: CertificadoMeta,
  numeroDoc: string,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const M = 20;

  // Header
  doc.setFillColor(...MAIN);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Malama', M, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PETROL);
  doc.text('CERTIFICADO DE DISPONIBILIZAÇÃO DO BENEFÍCIO', M, 25);

  // Título
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Certificado de Disponibilização', M, 50);

  // Corpo
  let y = 62;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const corpo = doc.splitTextToSize(CORPO, pageW - M * 2);
  doc.text(corpo, M, y);
  y += corpo.length * 5 + 8;

  // Bloco colaborador
  doc.setFillColor(242, 235, 230);
  const linhas: [string, string][] = [
    ['Colaborador(a)', colab.nome],
    ...(colab.setor ? [['Setor', colab.setor] as [string, string]] : []),
    ...(colab.funcao ? [['Função', colab.funcao] as [string, string]] : []),
    ['Empresa', meta.empresaNome],
    ...(meta.empresaCnpj ? [['CNPJ', meta.empresaCnpj] as [string, string]] : []),
    ['Benefício disponível desde', fmtDate(colab.data_ativacao ?? colab.data_adicao)],
  ];
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
  y += 6;

  // Serviços disponíveis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...MAIN);
  doc.text('SERVIÇOS DISPONIBILIZADOS', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  for (const s of meta.servicos) {
    doc.text(`•  ${s}`, M + 2, y);
    y += 6;
  }
  y += 6;

  // Disclaimer
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, pageW - M, y);
  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const disc = doc.splitTextToSize(DISCLAIMER, pageW - M * 2);
  doc.text(disc, M, y);
  y += disc.length * 4 + 8;

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Documento nº ${numeroDoc}`, M, y);
  doc.text(`Emitido em ${fmtDate(meta.emitidoEm)}`, pageW - M, y, { align: 'right' });
}

// Certificado individual
export function generateCertificadoPDF(colab: CertificadoColaborador, meta: CertificadoMeta): void {
  const doc = new jsPDF();
  drawCertificado(doc, colab, meta, `${meta.numeroBase}-${colab.colaborador_id.slice(0, 6)}`);
  doc.save(`certificado-malama-${colab.nome.replace(/\s+/g, '_')}.pdf`);
}

// Emissão em lote: um certificado por página, mesmo PDF
export function generateCertificadosLotePDF(colabs: CertificadoColaborador[], meta: CertificadoMeta): void {
  if (colabs.length === 0) return;
  const doc = new jsPDF();
  colabs.forEach((colab, i) => {
    if (i > 0) doc.addPage();
    drawCertificado(doc, colab, meta, `${meta.numeroBase}-${colab.colaborador_id.slice(0, 6)}`);
  });
  doc.save(`certificados-malama-${meta.numeroBase}.pdf`);
}
