// =====================================================
// Malama — Gerador do Relatório Psicossocial (WHO-5) para o PGR
// Evidência documental complementar de gestão de riscos psicossociais
// (NR-1). PDF client-side com jsPDF, a partir do agregado k-anônimo
// devolvido pela RPC rh_relatorio_psicossocial.
//
// TEXTO JURÍDICO: os blocos METODOLOGIA e DISCLAIMER abaixo são um
// rascunho padrão, sujeito a revisão pelo jurídico da empresa-cliente.
// O posicionamento é sempre COMPLEMENTAR — a Malama fornece subsídio,
// não assume a responsabilidade técnica do PGR/PCMSO (do SESMT/médico
// do trabalho da empresa).
// =====================================================

import jsPDF from 'jspdf';
import type { RhRelatorioPsicossocial } from '../services/empresaService';

const MAIN: [number, number, number] = [28, 25, 23];
const PETROL: [number, number, number] = [140, 71, 62];
const MUTED: [number, number, number] = [87, 83, 78];

const METODOLOGIA =
  'Os indicadores deste relatório derivam do Índice de Bem-Estar da Organização Mundial da ' +
  'Saúde (WHO-5), instrumento de rastreio de bem-estar de domínio público e validado, aplicado ' +
  'periodicamente e de forma voluntária aos colaboradores com acesso ao programa. O escore varia ' +
  'de 0 a 100 (quanto maior, melhor o bem-estar); escores abaixo de 50 sinalizam bem-estar ' +
  'reduzido e escores iguais ou inferiores a 28 sugerem a conveniência de rastreio aprofundado. ' +
  'O WHO-5 é um instrumento de triagem de bem-estar e NÃO constitui diagnóstico clínico.';

const PRIVACIDADE =
  'Todos os dados são agregados e anonimizados. Nenhum resultado individual é acessível à ' +
  'empresa. Recortes com menos respondentes do que o piso de anonimato (k) são suprimidos e ' +
  'exibidos como "dados insuficientes", em conformidade com a Lei Geral de Proteção de Dados ' +
  '(LGPD), que classifica dados de saúde como dados pessoais sensíveis.';

const DISCLAIMER =
  'Este relatório é material de apoio à gestão de riscos psicossociais da empresa e constitui ' +
  'evidência documental complementar para composição do Programa de Gerenciamento de Riscos ' +
  '(PGR), no contexto da NR-1. NÃO substitui as avaliações e obrigações legais a cargo do SESMT, ' +
  'do PCMSO, do médico do trabalho ou dos demais responsáveis técnicos da empresa, nem configura ' +
  'ato médico ou laudo pericial. As decisões de gestão de risco permanecem de responsabilidade ' +
  'exclusiva da empresa-cliente e de seus profissionais habilitados.';

const fmtDate = (d: string | Date | null) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export interface PsychosocialReportMeta {
  numeroDoc: string;
  emitidoEm: Date;
}

export function generatePsychosocialReportPDF(
  rel: RhRelatorioPsicossocial,
  meta: PsychosocialReportMeta,
): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20;

  const ensureSpace = (needed: number, y: number): number => {
    if (y + needed > pageH - 20) { doc.addPage(); return 24; }
    return y;
  };

  // ── Header ──
  doc.setFillColor(...MAIN);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Malama', M, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PETROL);
  doc.text('RELATÓRIO DE RISCO PSICOSSOCIAL — SUBSÍDIO AO PGR', M, 25);

  // ── Título ──
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titulo = doc.splitTextToSize('Relatório Agregado de Bem-Estar Psicossocial (WHO-5)', pageW - M * 2);
  doc.text(titulo, M, 48);
  let y = 48 + titulo.length * 7 + 6;

  // ── Empresa + período ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  y += 7;
  doc.text(rel.empresa_nome, M, y);
  if (rel.empresa_cnpj) { y += 6; doc.text(`CNPJ: ${rel.empresa_cnpj}`, M, y); }
  y += 6;
  doc.text(`Período: ${fmtDate(rel.periodo_inicio)} a ${fmtDate(rel.periodo_fim)}`, M, y);

  // ── Panorama geral ──
  y += 12;
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PANORAMA GERAL', M, y);
  y += 4;

  const geral = rel.geral;
  if (!('score_medio' in geral)) {
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const t = doc.splitTextToSize(
      `Dados insuficientes para publicação (${geral.n_respondentes} respondente(s); ` +
      `mínimo de ${rel.k_min} para preservar o anonimato).`,
      pageW - M * 2,
    );
    doc.text(t, M, y);
    y += t.length * 5 + 4;
  } else {
    const linhas: [string, string][] = [
      ['Respondentes no período', String(geral.n_respondentes)],
      ['Índice médio de bem-estar (0–100)', String(geral.score_medio)],
      ['Colaboradores com bem-estar reduzido (< 50)', String(geral.faixa_reduzido)],
      ['Colaboradores em faixa de atenção (≤ 28)', String(geral.faixa_risco)],
    ];
    doc.setFillColor(242, 235, 230);
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
  }

  // ── Quebra por setor ──
  y += 8;
  y = ensureSpace(30, y);
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('POR SETOR', M, y);
  y += 8;

  if (rel.setores.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text('Nenhum setor atingiu o mínimo de respondentes para exibição.', M, y);
    y += 8;
  } else {
    // Cabeçalho da tabela
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('Setor', M, y);
    doc.text('Resp.', pageW - M - 78, y, { align: 'right' });
    doc.text('Índice', pageW - M - 48, y, { align: 'right' });
    doc.text('Reduzido', pageW - M - 18, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, pageW - M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    for (const s of rel.setores) {
      y = ensureSpace(8, y);
      doc.setTextColor(...MAIN);
      doc.text(doc.splitTextToSize(s.setor, pageW - M * 2 - 90)[0], M, y);
      doc.setTextColor(...MUTED);
      doc.text(String(s.n_respondentes), pageW - M - 78, y, { align: 'right' });
      doc.text(String(s.score_medio), pageW - M - 48, y, { align: 'right' });
      doc.text(String(s.faixa_reduzido), pageW - M - 18, y, { align: 'right' });
      y += 7;
    }
  }

  if (rel.setores_suprimidos > 0) {
    y += 2;
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    const t = doc.splitTextToSize(
      `${rel.setores_suprimidos} setor(es) omitido(s) por não atingir(em) o mínimo de ` +
      `${rel.k_min} respondentes (proteção de anonimato).`,
      pageW - M * 2,
    );
    doc.text(t, M, y);
    y += t.length * 4 + 4;
  }

  // ── Blocos de texto jurídico ──
  const bloco = (titulo: string, texto: string, yy: number): number => {
    yy = ensureSpace(30, yy) + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...MAIN);
    doc.text(titulo, M, yy);
    yy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const linhas = doc.splitTextToSize(texto, pageW - M * 2);
    yy = ensureSpace(linhas.length * 4 + 4, yy);
    doc.text(linhas, M, yy);
    return yy + linhas.length * 4;
  };

  y += 6;
  y = bloco('METODOLOGIA', METODOLOGIA, y);
  y = bloco('PRIVACIDADE E LGPD', PRIVACIDADE, y);

  // Disclaimer com destaque
  y = ensureSpace(40, y) + 6;
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
  y = ensureSpace(disc.length * 4 + 4, y);
  doc.text(disc, M, y);
  y += disc.length * 4 + 8;

  // ── Rodapé ──
  y = ensureSpace(12, y);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Documento nº ${meta.numeroDoc}`, M, y);
  doc.text(`Emitido em ${fmtDate(meta.emitidoEm)}`, pageW - M, y, { align: 'right' });

  doc.save(`relatorio-psicossocial-malama-${meta.numeroDoc}.pdf`);
}
