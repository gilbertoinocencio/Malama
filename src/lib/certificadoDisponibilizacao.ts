// =====================================================
// Malama — Certificado de Disponibilização do Benefício
// Comprova que a empresa DISPONIBILIZOU o cuidado ao colaborador em um
// período — instrumento de defesa (diligência prévia) em eventual discussão
// de nexo causal/doença ocupacional. NÃO contém dados de uso.
//
// Duas decisões com razão jurídica:
//
//  · O período é FECHADO quando o vínculo terminou. Dizer só "disponível
//    desde" para quem já saiu declara disponibilidade que não existe mais.
//  · Emite também para ex-colaborador. Quem alega adoecimento costuma ser
//    justamente quem saiu; esconder essas linhas apagava a prova no momento
//    em que ela é necessária.
// =====================================================

import jsPDF from 'jspdf';
import type { CertificadoColaborador } from '../services/empresaService';
import { MAIN, PETROL, MUTED, fmtDate } from './relatorioBlocos';
import { formatarHash } from './hashDocumento';

const CORPO =
  'A Malama declara, para os devidos fins, que o(a) colaborador(a) abaixo identificado(a) teve ' +
  'à sua disposição, por meio do programa de saúde corporativa contratado por sua empresa, os ' +
  'serviços de cuidado à saúde e bem-estar listados neste documento, durante o período indicado.';

const DISCLAIMER =
  'Este certificado atesta exclusivamente a DISPONIBILIZAÇÃO do benefício ao colaborador no ' +
  'período indicado, como evidência de diligência da empresa na promoção de saúde e bem-estar ' +
  '(NR-1). Não reflete o uso efetivo dos serviços pelo colaborador, não contém dados de saúde, ' +
  'não atesta ausência de risco ou de agravo e não substitui as obrigações legais da empresa ' +
  'quanto ao PGR, ao PCMSO ou às avaliações do SESMT/médico do trabalho.';

export interface CertificadoMeta {
  empresaNome: string;
  empresaCnpj: string | null;
  servicos: string[];        // serviços efetivamente contratados pela empresa
  emitidoEm: Date;
  numeroBase: string;        // ex.: MAL-CERT-20260723
  emitidoPorNome: string | null;
  emitidoPorEmail: string | null;
}

// Desenha UM certificado na página atual, a partir do topo.
function drawCertificado(
  doc: jsPDF,
  colab: CertificadoColaborador,
  meta: CertificadoMeta,
  numeroDoc: string,
  selo: string,
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
  const inicio = fmtDate(colab.data_ativacao ?? colab.data_adicao);
  // Vínculo encerrado fecha o período. "Disponível desde X" sem fim afirmaria
  // disponibilidade que já não existe — imprecisão em documento de defesa.
  const periodo = colab.data_saida
    ? `${inicio} a ${fmtDate(colab.data_saida)}`
    : `${inicio} até a presente data`;
  const linhas: [string, string][] = [
    ['Colaborador(a)', colab.nome],
    ...(colab.setor ? [['Setor', colab.setor] as [string, string]] : []),
    ...(colab.funcao ? [['Função', colab.funcao] as [string, string]] : []),
    ['Empresa', meta.empresaNome],
    ...(meta.empresaCnpj ? [['CNPJ', meta.empresaCnpj] as [string, string]] : []),
    ['Benefício disponível', periodo],
    ['Situação do vínculo', colab.data_saida ? 'Encerrado' : 'Vigente'],
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

  // Rodapé: identificação de quem emitiu e selo do conteúdo. Sem isso o
  // papel não se liga a ninguém e qualquer editor recria um idêntico.
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Documento nº ${numeroDoc}  ·  Emitido em ${fmtDate(meta.emitidoEm)}`, M, y);
  y += 4;
  const emissor = meta.emitidoPorNome || meta.emitidoPorEmail || 'não identificado';
  const complemento = meta.emitidoPorNome && meta.emitidoPorEmail ? ` (${meta.emitidoPorEmail})` : '';
  doc.text(`Emitido por ${emissor}${complemento}, usuário do portal do RH da empresa.`, M, y);
  y += 4;
  doc.text(`Selo de verificação: ${formatarHash(selo)}`, M, y);
}

/** Selo do conteúdo do certificado. Determinístico: o mesmo vínculo, na
 *  mesma emissão, gera sempre o mesmo selo. */
function seloDe(colab: CertificadoColaborador, meta: CertificadoMeta): string {
  const base = [
    colab.colaborador_id, colab.nome, colab.data_ativacao ?? colab.data_adicao,
    colab.data_saida ?? '', meta.empresaCnpj ?? meta.empresaNome,
    meta.emitidoEm.toISOString().slice(0, 10), meta.servicos.join('|'),
  ].join('~');
  // Hash curto e síncrono: crypto.subtle é assíncrono e o lote emite dezenas
  // de páginas numa passada. FNV-1a de 32 bits, repetido para 16 dígitos.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < base.length; i++) {
    h1 = Math.imul(h1 ^ base.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + base.charCodeAt(i) * (i + 1), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).toUpperCase();
}

// Certificado individual
export function generateCertificadoPDF(colab: CertificadoColaborador, meta: CertificadoMeta): void {
  const doc = new jsPDF();
  drawCertificado(doc, colab, meta, `${meta.numeroBase}-${colab.colaborador_id.slice(0, 6)}`, seloDe(colab, meta));
  doc.save(`certificado-malama-${colab.nome.replace(/\s+/g, '_')}.pdf`);
}

// Emissão em lote: um certificado por página, mesmo PDF
export function generateCertificadosLotePDF(colabs: CertificadoColaborador[], meta: CertificadoMeta): void {
  if (colabs.length === 0) return;
  const doc = new jsPDF();
  colabs.forEach((colab, i) => {
    if (i > 0) doc.addPage();
    drawCertificado(doc, colab, meta, `${meta.numeroBase}-${colab.colaborador_id.slice(0, 6)}`, seloDe(colab, meta));
  });
  doc.save(`certificados-malama-${meta.numeroBase}.pdf`);
}
