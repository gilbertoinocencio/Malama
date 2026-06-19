// =====================================================
// Malama — Certificado de Impacto (ESG)
// Doação 1:1 (kg perdido pelos colaboradores → kg doado a banco de alimentos).
// PDF client-side com jsPDF, a partir do snapshot travado no banco.
// Sempre AGREGADO — nenhum dado individual de colaborador.
// =====================================================

import jsPDF from 'jspdf';

const MAIN: [number, number, number] = [28, 25, 23];     // #1C1917
const PETROL: [number, number, number] = [140, 71, 62];  // #8c473e
const MUTED: [number, number, number] = [87, 83, 78];    // #57534E

export interface CertificadoEsgData {
  empresaNome: string;
  empresaCnpj: string | null;
  competencia: string;        // YYYY-MM-01
  colaboradoresAtivos: number;
  kgPerdido: number;
  kgDoado: number;
  bancoNome: string | null;
  bancoCnpj: string | null;
  dataRepasse: string;        // YYYY-MM-DD
  numeroSequencial: string;
  hashVerificacao: string;
}

const fmtMes = (comp: string) => {
  const d = new Date(comp + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const fmtData = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function generateCertificadoPDF(c: CertificadoEsgData): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const cx = pageW / 2;
  const M = 20;

  // ── Moldura ──
  doc.setDrawColor(...PETROL);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageW - 20, doc.internal.pageSize.getHeight() - 20);

  // ── Header escuro ──
  doc.setFillColor(...MAIN);
  doc.rect(10, 10, pageW - 20, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Malama', cx, 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PETROL);
  doc.text('CERTIFICADO DE IMPACTO SOCIAL', cx, 33, { align: 'center' });

  // ── Título ──
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Certificado de Doação de Alimentos', cx, 58, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const intro = doc.splitTextToSize(
    `Certificamos que, no período de referência de ${fmtMes(c.competencia)}, a empresa abaixo ` +
    `contribuiu para a doação de alimentos a um banco de alimentos parceiro, em proporção de 1:1 ` +
    `com o total de peso perdido por seus colaboradores no programa de saúde Malama.`,
    pageW - M * 2 - 10
  );
  doc.text(intro, cx, 72, { align: 'center' });

  // ── Empresa ──
  let y = 72 + intro.length * 6 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...MAIN);
  doc.text(c.empresaNome, cx, y, { align: 'center' });
  if (c.empresaCnpj) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`CNPJ: ${c.empresaCnpj}`, cx, y, { align: 'center' });
  }

  // ── Destaque kg doado ──
  y += 16;
  doc.setFillColor(242, 235, 230);
  doc.roundedRect(cx - 55, y - 8, 110, 26, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...PETROL);
  doc.text(`${c.kgDoado.toLocaleString('pt-BR')} kg`, cx, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('de alimentos doados', cx, y + 14, { align: 'center' });

  // ── Detalhes ──
  y += 32;
  doc.setFontSize(10);
  const detalhes: [string, string][] = [
    ['Período de referência', fmtMes(c.competencia)],
    ['Colaboradores ativos no período', String(c.colaboradoresAtivos)],
    ['Peso total perdido (agregado)', `${c.kgPerdido.toLocaleString('pt-BR')} kg`],
    ['Alimento doado (1:1)', `${c.kgDoado.toLocaleString('pt-BR')} kg`],
    ['Banco de alimentos parceiro', c.bancoNome ?? '—'],
    ['CNPJ do parceiro', c.bancoCnpj ?? '—'],
    ['Data do repasse', fmtData(c.dataRepasse)],
  ];
  for (const [label, valor] of detalhes) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label, M + 6, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MAIN);
    doc.text(valor, pageW - M - 6, y, { align: 'right' });
    y += 8;
  }

  // ── Selo de autenticidade ──
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(M + 6, y, pageW - M - 6, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MAIN);
  doc.text(`Certificado nº ${c.numeroSequencial}`, M + 6, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`Selo de autenticidade (SHA/MD5): ${c.hashVerificacao}`, M + 6, y);
  y += 5;
  doc.text('A autenticidade pode ser verificada junto à Malama informando o número e o selo acima.', M + 6, y);

  doc.save(`certificado-impacto-${c.numeroSequencial}.pdf`);
}
