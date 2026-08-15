// =====================================================
// Malama — Blocos comuns dos relatórios de evidência (WHO-5 e JSS)
//
// Os dois documentos repetiam rodapé, disclaimer e identificação. Repetidos,
// divergiam: um ganhava uma ressalva que o outro não tinha. Aqui ficam as
// partes que precisam ser idênticas entre eles — inclusive o que dá valor
// probatório ao papel: quem emitiu, quando, sob qual versão de documento
// aceito e com qual selo de conferência.
// =====================================================

import type jsPDF from 'jspdf';
import type { AceiteVigente } from '../services/empresaService';
import { formatarHash } from './hashDocumento';

export const MAIN: [number, number, number] = [28, 25, 23];
export const PETROL: [number, number, number] = [140, 71, 62];
export const MUTED: [number, number, number] = [87, 83, 78];

export const PRIVACIDADE =
  'Todos os dados são agregados e anonimizados. Nenhum resultado individual é acessível à ' +
  'empresa. Recortes com menos respondentes do que o piso de anonimato (k) são suprimidos e ' +
  'exibidos como "dados insuficientes", em conformidade com a Lei Geral de Proteção de Dados ' +
  '(LGPD), que classifica dados de saúde como dados pessoais sensíveis.';

export const DISCLAIMER =
  'Este relatório é material de apoio à gestão de riscos psicossociais da empresa e constitui ' +
  'evidência documental complementar para composição do Programa de Gerenciamento de Riscos ' +
  '(PGR), no contexto da NR-1 — em especial para a identificação da FONTE do risco (organização ' +
  'do trabalho), que a hierarquia de controle da norma exige priorizar. NÃO substitui as ' +
  'avaliações e obrigações legais a cargo do SESMT, do PCMSO, do médico do trabalho ou dos demais ' +
  'responsáveis técnicos da empresa, nem configura ato médico ou laudo pericial. As decisões de ' +
  'gestão de risco permanecem de responsabilidade exclusiva da empresa-cliente e de seus ' +
  'profissionais habilitados.';

export const AUTENTICIDADE =
  'Este documento foi registrado no sistema no momento da emissão, com número sequencial e selo ' +
  'de verificação do conteúdo. A reemissão a partir do registro reproduz exatamente o mesmo ' +
  'conteúdo. Divergência entre o selo impresso e o registrado indica arquivo adulterado.';

/** Identificação da emissão — comum aos dois relatórios. */
export type EmissaoMeta = {
  numeroDoc: string;
  emitidoEm: Date;
  hash: string;
  emitidoPorNome: string | null;
  emitidoPorEmail: string | null;
  aceite: AceiteVigente | null;
};

export const fmtDate = (d: string | Date | null): string => {
  if (!d) return '—';
  const date = typeof d === 'string'
    ? new Date(d.length <= 10 ? `${d}T00:00:00` : d)
    : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtDateTime = (d: string | Date): string =>
  (typeof d === 'string' ? new Date(d) : d)
    .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const NIVEL_LABEL: Record<string, string> = {
  fonte: 'Na fonte',
  organizacional: 'Organizacional',
  individual: 'Individual',
};

export const STATUS_LABEL: Record<string, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

/**
 * Sumário executivo. Existe por razão jurídica, não estética: documento de
 * evidência sem conclusão obriga o leitor a interpretar os números — e a
 * interpretação de terceiro é exatamente o que não se quer num litígio.
 */
export function blocoSumario(
  doc: jsPDF, y: number, pageW: number, M: number,
  linhas: string[],
): number {
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SÍNTESE DO PERÍODO', M, y);
  y += 6;

  doc.setFillColor(248, 246, 244);
  const texto = linhas.map(l => doc.splitTextToSize(`•  ${l}`, pageW - M * 2 - 8)).flat();
  doc.roundedRect(M - 2, y - 4, pageW - M * 2 + 4, texto.length * 4.6 + 8, 3, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(texto, M + 2, y + 1);
  return y + texto.length * 4.6 + 8;
}

/**
 * Rodapé de identificação: número, emissor, selo e versão do documento
 * aceito. Sem emissor identificado o papel não se liga a ninguém, e sem
 * selo qualquer editor de PDF recria um idêntico.
 */
export function blocoIdentificacao(
  doc: jsPDF, y: number, pageW: number, pageH: number, M: number,
  meta: EmissaoMeta,
): void {
  const necessario = 34;
  if (y + necessario > pageH - 14) { doc.addPage(); y = 24; }

  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, pageW - M, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...MAIN);
  doc.text('IDENTIFICAÇÃO E AUTENTICIDADE', M, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);

  const emissor = meta.emitidoPorNome || meta.emitidoPorEmail || 'não identificado';
  const complemento = meta.emitidoPorNome && meta.emitidoPorEmail ? ` (${meta.emitidoPorEmail})` : '';
  doc.text(`Documento nº ${meta.numeroDoc}  ·  Emitido em ${fmtDateTime(meta.emitidoEm)}`, M, y);
  y += 4;
  doc.text(`Emitido por ${emissor}${complemento}, usuário do portal do RH da empresa.`, M, y);
  y += 4;
  doc.text(`Selo de verificação: ${formatarHash(meta.hash)}`, M, y);
  y += 4;

  if (meta.aceite) {
    const aceiteTexto = meta.aceite.aceito_em
      ? `${meta.aceite.titulo}, versão ${meta.aceite.versao}, aceita em ${fmtDate(meta.aceite.aceito_em)}.`
      : `${meta.aceite.titulo}, versão ${meta.aceite.versao} — aceite não registrado até esta emissão.`;
    const linhas = doc.splitTextToSize(`Base do tratamento de dados: ${aceiteTexto}`, pageW - M * 2);
    doc.text(linhas, M, y);
    y += linhas.length * 4;
  }

  const aut = doc.splitTextToSize(AUTENTICIDADE, pageW - M * 2);
  doc.text(aut, M, y);
}
