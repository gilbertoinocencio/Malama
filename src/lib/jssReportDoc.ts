// =====================================================
// Malama — Gerador do Relatório de Exposição Ocupacional (JSS) para o PGR
// Evidência documental complementar de gestão de riscos psicossociais
// (NR-1). PDF client-side com jsPDF, a partir do agregado k-anônimo
// devolvido pela RPC rh_relatorio_jss.
//
// Documento IRMÃO de psychosocialReportDoc.ts (WHO-5), não substituto: o
// WHO-5 documenta COMO o colaborador está, este documenta O QUE NO
// TRABALHO expõe a risco (demanda, controle, apoio — modelo Karasek/
// Theorell). Separados porque são evidências de natureza diferente e os
// períodos raramente coincidem (JSS é trimestral, WHO-5 é mensal).
//
// A emissão é sempre registrada antes de o PDF sair (ver
// empresa_relatorios_emitidos): número sequencial do servidor, snapshot do
// conteúdo e selo de verificação. Relatório que não se reproduz não serve
// de prova.
// =====================================================

import jsPDF from 'jspdf';
import type { RhRelatorioJss, PlanoAcao } from '../services/empresaService';
import {
  JSS_CLASSIFICACAO, JSS_METRICAS, JSS_PRIORIDADE, obterInsightJss,
  type JssMetricaKey,
} from './jssInsights';
import {
  MAIN, PETROL, MUTED, PRIVACIDADE, DISCLAIMER, NIVEL_LABEL, STATUS_LABEL,
  blocoIdentificacao, blocoSumario, fmtDate, type EmissaoMeta,
} from './relatorioBlocos';

const METODOLOGIA =
  'Os indicadores deste relatório derivam da Job Stress Scale (JSS), versão resumida do modelo ' +
  'demanda-controle-apoio de Karasek/Theorell, adaptada e validada no Brasil (Alves MGM, Chor D, ' +
  'Faerstein E, Lopes CS, Werneck GL. Rev Saúde Pública 2004;38(2):164-71), aplicada periodicamente ' +
  'e de forma voluntária aos colaboradores. A interpretação principal mantém separadas as dimensões ' +
  'demanda, controle e apoio. A matriz demanda-controle usa como referência a mediana dos respondentes ' +
  'do período; portanto, sua classificação é relativa à população avaliada, não um ponto de corte ' +
  'clínico. O índice de exposição de 0 a 100 é um resumo visual derivado que combina alta demanda ' +
  'com baixo controle e baixo apoio, e não substitui a leitura das dimensões. A JSS mede ' +
  'EXPOSIÇÃO OCUPACIONAL — o que no trabalho expõe a risco — e não é, isoladamente, medida de ' +
  'bem-estar nem constitui diagnóstico clínico. EQUIVALÊNCIA DE TERMOS: para leitura por gestores, ' +
  'este documento nomeia as dimensões da escala em linguagem corrente — "cobrança" corresponde à ' +
  'demanda psicológica, "autonomia" ao controle sobre o trabalho, "apoio" ao apoio social e ' +
  '"carga de trabalho" ao índice de exposição ocupacional. Os construtos e o cálculo permanecem ' +
  'os do instrumento original.';

export interface JssReportMeta extends EmissaoMeta {
  /** Ver PsychosocialReportMeta — mesmo motivo: diagnóstico sem medida de
   *  controle documenta que a empresa sabia do risco e não agiu. */
  planos?: PlanoAcao[];
}

/** Conclusões do período, em texto. Sem elas o documento entrega números
 *  crus e deixa a leitura por conta de quem o receber. */
function sintese(rel: RhRelatorioJss, planos: PlanoAcao[]): string[] {
  const linhas: string[] = [];
  const geral = rel.geral;

  if (!('indice_medio' in geral)) {
    linhas.push(
      `Não houve respondentes suficientes no período para publicação agregada `
      + `(mínimo de ${rel.k_min}). O documento registra a aplicação do instrumento, não o resultado.`,
    );
  } else {
    linhas.push(
      `${geral.n_respondentes} pessoa(s) responderam no período. Carga de trabalho média de `
      + `${geral.indice_medio} em 100 — composta por cobrança ${geral.demanda_medio}, `
      + `autonomia ${geral.controle_medio} e apoio ${geral.apoio_medio}.`,
    );
  }

  const prioritarios = rel.setores
    .map(s => ({ setor: s.setor, insight: obterInsightJss(s, rel.cortes) }))
    .filter(x => x.insight.prioridade === 'critica' || x.insight.prioridade === 'alta');
  linhas.push(
    prioritarios.length > 0
      ? `Setor(es) apontado(s) para investigação prioritária: ${prioritarios.map(p => p.setor).join(', ')}.`
      : 'Nenhum setor foi classificado em prioridade alta ou crítica em relação ao meio da empresa neste período.',
  );

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

export function generateJssReportPDF(
  rel: RhRelatorioJss,
  meta: JssReportMeta,
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
  doc.text('RELATÓRIO DE CARGA DE TRABALHO — SUBSÍDIO AO PGR', M, 25);

  // ── Título ──
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  // O termo técnico fica no subtítulo do título: o RH lê "carga de trabalho",
  // o auditor rastreia até a exposição ocupacional sem precisar da metodologia.
  const titulo = doc.splitTextToSize(
    'Relatório Agregado de Carga de Trabalho (JSS — exposição ocupacional)', pageW - M * 2,
  );
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
  if (!('indice_medio' in geral)) {
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
      ['Carga de trabalho — média (0–100)', String(geral.indice_medio)],
      ['Cobrança — média (0–100)', String(geral.demanda_medio)],
      ['Autonomia — média (0–100)', String(geral.controle_medio)],
      ['Apoio — média (0–100)', String(geral.apoio_medio)],
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

  // ── Glossário: o documento é lido por RH, SESMT e auditoria, e nenhum
  //    deles é obrigado a conhecer a JSS. Sem isto, "Controle 50" não diz
  //    nada — e pior, é lido como se maior fosse pior, que é o inverso. ──
  y += 10;
  y = ensureSpace(46, y);
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('COMO LER OS INDICADORES', M, y);
  y += 6;

  doc.setFontSize(8.5);
  for (const chave of ['demanda', 'controle', 'apoio', 'indice'] as JssMetricaKey[]) {
    const m = JSS_METRICAS[chave];
    const linhas = doc.splitTextToSize(
      `${m.label} (nota de 0 a 100; ${m.sentidoLabel.toLowerCase()}): ${m.resumo} `
      + m.composicao.replace(/−/g, '-'),
      pageW - M * 2,
    );
    y = ensureSpace(linhas.length * 4 + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(linhas, M, y);
    y += linhas.length * 4 + 2;
  }

  // ── Quebra por setor ──
  y += 8;
  y = ensureSpace(30, y);
  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('POR SETOR', M, y);
  y += 8;

  if (rel.cortes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const referencia = doc.splitTextToSize(
      'A comparação é feita com o meio da própria empresa neste período (metade dos respondentes '
      + `acima, metade abaixo): cobrança ${rel.cortes.demanda}; autonomia ${rel.cortes.controle}; `
      + `apoio ${rel.cortes.apoio}. Apoio baixo aumenta a prioridade do setor, mas não confirma `
      + 'violência ou assédio.',
      pageW - M * 2,
    );
    doc.text(referencia, M, y);
    y += referencia.length * 4 + 3;

    const quadrantes = doc.splitTextToSize(
      'Classificação de cada setor: '
      + (Object.values(JSS_CLASSIFICACAO)
        .map(c => `${c.label} = ${c.descricao.replace(/\.$/, '')}`)
        .join('; '))
      + '. A ordem de prioridade indicada serve para escolher por onde a empresa começa a olhar; '
      + 'não é a classificação formal de risco do GRO/PGR.',
      pageW - M * 2,
    );
    y = ensureSpace(quadrantes.length * 4 + 5, y);
    doc.text(quadrantes, M, y);
    y += quadrantes.length * 4 + 5;
  }

  if (rel.setores.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text('Nenhum setor atingiu o mínimo de respondentes para exibição.', M, y);
    y += 8;
  } else {
    // Cabeçalho da tabela — 5 colunas numéricas, setor trunca no espaço restante.
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('Setor', M, y);
    doc.text('Resp.', pageW - M - 96, y, { align: 'right' });
    doc.text('Carga', pageW - M - 72, y, { align: 'right' });
    doc.text('Cobrança', pageW - M - 48, y, { align: 'right' });
    doc.text('Autonomia', pageW - M - 24, y, { align: 'right' });
    doc.text('Apoio', pageW - M, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, pageW - M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const s of rel.setores) {
      const insight = obterInsightJss(s, rel.cortes);
      y = ensureSpace(19, y);
      doc.setTextColor(...MAIN);
      doc.text(doc.splitTextToSize(s.setor, pageW - M * 2 - 106)[0], M, y);
      doc.setTextColor(...MUTED);
      doc.text(String(s.n_respondentes), pageW - M - 96, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PETROL);
      doc.text(String(s.indice), pageW - M - 72, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(String(s.demanda), pageW - M - 48, y, { align: 'right' });
      doc.text(String(s.controle), pageW - M - 24, y, { align: 'right' });
      doc.text(String(s.apoio), pageW - M, y, { align: 'right' });
      y += 4;

      const classificacao = insight.classificacao
        ? JSS_CLASSIFICACAO[insight.classificacao].label : 'Sem classificação';
      const leitura = [
        `${JSS_PRIORIDADE[insight.prioridade].label} — ${classificacao}`,
        insight.fatores.length ? `Fatores: ${insight.fatores.join('; ')}` : null,
        insight.sinais.length ? `Sinais predominantes: ${insight.sinais.join('; ')}` : null,
      ].filter(Boolean).join('. ');
      const detalhe = doc.splitTextToSize(leitura, pageW - M * 2 - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(detalhe, M + 2, y);
      y += detalhe.length * 3.6 + 4;
      doc.setFontSize(9);
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
        + 'sobre a fonte ou a organização do trabalho — e é justamente a fonte que este '
        + 'relatório de carga de trabalho aponta.',
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

  doc.save(`relatorio-jss-malama-${meta.numeroDoc}.pdf`);
}
