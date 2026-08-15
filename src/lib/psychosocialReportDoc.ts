// =====================================================
// Malama — Gerador do Relatório Psicossocial (WHO-5) para o PGR
// Evidência documental complementar de gestão de riscos psicossociais
// (NR-1). PDF client-side com jsPDF, a partir do agregado k-anônimo
// devolvido pela RPC rh_relatorio_psicossocial.
//
// O posicionamento é sempre COMPLEMENTAR — a Malama fornece subsídio,
// não assume a responsabilidade técnica do PGR/PCMSO (do SESMT/médico
// do trabalho da empresa).
//
// A emissão é registrada antes de o PDF sair (ver empresa_relatorios_emitidos):
// número sequencial do servidor, snapshot do conteúdo e selo de verificação.
// Relatório que não se reproduz não serve de prova.
// =====================================================

import jsPDF from 'jspdf';
import type { RhRelatorioPsicossocial, PlanoAcao } from '../services/empresaService';
import {
  MAIN, PETROL, MUTED, PRIVACIDADE, DISCLAIMER, NIVEL_LABEL, STATUS_LABEL,
  blocoIdentificacao, blocoSumario, fmtDate, type EmissaoMeta,
} from './relatorioBlocos';

const METODOLOGIA =
  'Os indicadores deste relatório derivam do Índice de Bem-Estar da Organização Mundial da ' +
  'Saúde (WHO-5), instrumento de rastreio de bem-estar de domínio público e validado, aplicado ' +
  'periodicamente e de forma voluntária aos colaboradores com acesso ao programa. O escore varia ' +
  'de 0 a 100 (quanto maior, melhor o bem-estar); escores abaixo de 50 sinalizam bem-estar ' +
  'reduzido e escores iguais ou inferiores a 28 sugerem a conveniência de rastreio aprofundado. ' +
  'O WHO-5 é um instrumento de triagem de bem-estar e NÃO constitui diagnóstico clínico.';

export interface PsychosocialReportMeta extends EmissaoMeta {
  /**
   * Itens do plano de ação. Diagnóstico sem medida de controle documenta
   * que a empresa sabia do risco e não agiu — por isso o plano entra no
   * mesmo documento, e a ausência dele é dita explicitamente.
   */
  planos?: PlanoAcao[];
}

/** Conclusões do período, em texto. Sem elas o documento entrega números
 *  crus e deixa a leitura por conta de quem o receber. */
function sintese(rel: RhRelatorioPsicossocial, planos: PlanoAcao[]): string[] {
  const linhas: string[] = [];
  const geral = rel.geral;

  if (!('score_medio' in geral)) {
    linhas.push(
      `Não houve respondentes suficientes no período para publicação agregada `
      + `(mínimo de ${rel.k_min}). O documento registra a aplicação do instrumento, não o resultado.`,
    );
  } else {
    linhas.push(
      `${geral.n_respondentes} pessoa(s) responderam no período, com nota média de bem-estar `
      + `${geral.score_medio} em 100.`,
    );
    linhas.push(
      `${geral.faixa_reduzido} pessoa(s) com bem-estar reduzido (abaixo de 50), das quais `
      + `${geral.faixa_risco} em faixa de atenção (28 ou menos). O WHO-5 é rastreio de bem-estar `
      + 'e não estabelece diagnóstico nem nexo com o trabalho.',
    );
  }

  if (rel.setores_suprimidos > 0) {
    linhas.push(
      `${rel.setores_suprimidos} setor(es) não aparecem por não atingirem o piso de anonimato `
      + `de ${rel.k_min} respondentes.`,
    );
  }

  // A conclusão que mais importa juridicamente: houve diagnóstico e houve
  // (ou não) resposta a ele.
  const abertas = planos.filter(p => p.status !== 'concluida' && p.status !== 'cancelada');
  const naFonte = planos.some(p => p.nivel_controle === 'fonte' || p.nivel_controle === 'organizacional');
  if (planos.length === 0) {
    linhas.push(
      'Não havia medida de prevenção ou controle registrada no plano de ação até a emissão '
      + 'deste documento.',
    );
  } else {
    linhas.push(
      `${planos.length} medida(s) registrada(s) no plano de ação, ${abertas.length} em aberto. `
      + (naFonte
        ? 'Há atuação sobre a fonte ou a organização do trabalho.'
        : 'Todas de nível individual — sem atuação sobre a fonte ou a organização do trabalho.'),
    );
  }
  return linhas;
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
  y += 6;
  doc.text(`Documento nº ${meta.numeroDoc} · emitido em ${fmtDate(meta.emitidoEm)}`, M, y);

  // ── Síntese: a conclusão vem antes dos números ──
  y += 12;
  y = blocoSumario(doc, y, pageW, M, sintese(rel, meta.planos ?? []));

  // ── Panorama geral ──
  y += 10;
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
    // Contagem sozinha não dimensiona: 9 pessoas em 12 e 9 em 300 são
    // relatórios diferentes. A proporção vai ao lado do número absoluto.
    const proporcao = (n: number) => geral.n_respondentes > 0
      ? ` (${Math.round((n / geral.n_respondentes) * 100)}% dos respondentes)` : '';
    const linhas: [string, string][] = [
      ['Respondentes no período', String(geral.n_respondentes)],
      ['Nota média de bem-estar (0 a 100; quanto maior, melhor)', String(geral.score_medio)],
      ['Pessoas com bem-estar reduzido (nota abaixo de 50)',
        `${geral.faixa_reduzido}${proporcao(geral.faixa_reduzido)}`],
      ['Pessoas em faixa de atenção (nota 28 ou menos)',
        `${geral.faixa_risco}${proporcao(geral.faixa_risco)}`],
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

    // As duas faixas se sobrepõem. Sem este aviso o leitor soma os números
    // e conta duas vezes as mesmas pessoas.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    const nota = doc.splitTextToSize(
      'Atenção ao ler: quem está na faixa de atenção (28 ou menos) também está contado em '
      + 'bem-estar reduzido (menos de 50). Os dois números não devem ser somados, senão as mesmas '
      + 'pessoas são contadas duas vezes. A nota média sozinha pode esconder grupos que estão '
      + 'muito mal — por isso as contagens de pessoas acompanham a média.',
      pageW - M * 2,
    );
    y = ensureSpace(nota.length * 4 + 4, y);
    doc.text(nota, M, y);
    y += nota.length * 4;
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
    // Legenda das colunas: "Reduzido" e "Atenção" são contagens de pessoas,
    // "Índice" é escore. Misturar as duas naturezas sem avisar é o erro de
    // leitura mais comum deste relatório.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    const legenda = doc.splitTextToSize(
      'Resp. = quantas pessoas responderam. Índice = nota média do setor, de 0 a 100 (quanto maior, '
      + 'melhor). Reduzido e Atenção = quantidade de pessoas com nota abaixo de 50 e com nota 28 ou '
      + 'menos, respectivamente.',
      pageW - M * 2,
    );
    doc.text(legenda, M, y);
    y += legenda.length * 4 + 4;

    // Cabeçalho da tabela
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('Setor', M, y);
    doc.text('Resp.', pageW - M - 96, y, { align: 'right' });
    doc.text('Índice', pageW - M - 68, y, { align: 'right' });
    doc.text('Reduzido', pageW - M - 38, y, { align: 'right' });
    doc.text('Atenção', pageW - M, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, pageW - M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    for (const s of rel.setores) {
      y = ensureSpace(8, y);
      doc.setTextColor(...MAIN);
      doc.text(doc.splitTextToSize(s.setor, pageW - M * 2 - 106)[0], M, y);
      doc.setTextColor(...MUTED);
      doc.text(String(s.n_respondentes), pageW - M - 96, y, { align: 'right' });
      doc.text(String(s.score_medio), pageW - M - 68, y, { align: 'right' });
      doc.text(String(s.faixa_reduzido), pageW - M - 38, y, { align: 'right' });
      doc.text(String(s.faixa_risco), pageW - M, y, { align: 'right' });
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

  // ── Plano de ação (medidas de controle) ──
  y = ensureSpace(30, y) + 10;
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MEDIDAS DE CONTROLE ADOTADAS', M, y);
  y += 7;

  const planos = meta.planos ?? [];
  if (planos.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const t = doc.splitTextToSize(
      'Nenhuma medida de controle foi registrada no plano de ação até a emissão deste ' +
      'documento. A NR-1 requer que os riscos identificados sejam objeto de medidas de ' +
      'prevenção e controle, com responsável e prazo definidos, priorizando a atuação sobre ' +
      'a fonte do risco.',
      pageW - M * 2,
    );
    doc.text(t, M, y);
    y += t.length * 4 + 2;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('Risco / medida', M, y);
    doc.text('Nível', pageW - M - 62, y, { align: 'right' });
    doc.text('Prazo', pageW - M - 30, y, { align: 'right' });
    doc.text('Situação', pageW - M, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, pageW - M, y);
    y += 6;

    for (const p of planos) {
      y = ensureSpace(20, y);
      const cabecalho = doc.splitTextToSize(
        `${p.setor ?? 'Toda a empresa'} — ${p.risco_descricao}`, pageW - M * 2 - 74,
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MAIN);
      doc.text(cabecalho, M, y);

      doc.setTextColor(...MUTED);
      doc.text(NIVEL_LABEL[p.nivel_controle] ?? p.nivel_controle, pageW - M - 62, y, { align: 'right' });
      doc.text(fmtDate(p.prazo), pageW - M - 30, y, { align: 'right' });
      doc.text(STATUS_LABEL[p.status] ?? p.status, pageW - M, y, { align: 'right' });

      y += cabecalho.length * 4 + 1;
      const detalhe = doc.splitTextToSize(
        `Medida: ${p.medida} · Responsável: ${p.responsavel}`
        + (p.evidencia ? ` · Evidência: ${p.evidencia}` : ''),
        pageW - M * 2 - 74,
      );
      y = ensureSpace(detalhe.length * 4 + 4, y);
      doc.setTextColor(120, 120, 120);
      doc.text(detalhe, M, y);
      y += detalhe.length * 4 + 5;
    }

    // Registro explícito da hierarquia de controle: risco tratado apenas
    // com medida individual não é omitido do documento.
    const soIndividual = planos.every(p => p.nivel_controle === 'individual');
    if (soIndividual) {
      y = ensureSpace(16, y) + 2;
      doc.setFontSize(8.5);
      doc.setTextColor(...PETROL);
      const aviso = doc.splitTextToSize(
        'Observação: todas as medidas registradas são de nível individual. Na hierarquia de '
        + 'controle da NR-1, o cuidado individual é a última camada e não substitui a atuação '
        + 'sobre a fonte ou a organização do trabalho.',
        pageW - M * 2,
      );
      doc.text(aviso, M, y);
      y += aviso.length * 4 + 2;
    }
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

  blocoIdentificacao(doc, y, pageW, pageH, M, meta);

  doc.save(`relatorio-psicossocial-malama-${meta.numeroDoc}.pdf`);
}
