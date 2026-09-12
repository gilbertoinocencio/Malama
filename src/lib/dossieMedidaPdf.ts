// =====================================================
// Malama — Dossiê da medida (PDF)
//
// A trilha de UMA medida, em UMA via: a leitura que a originou, a medida
// como foi registrada, os combinados com a liderança, a execução e o
// resultado observado no ciclo seguinte. Antes isso estava em quatro telas
// e o RH montava o dossiê colando prints.
//
// Mesmo regime probatório dos relatórios WHO-5/JSS: registrado antes de
// sair (número do servidor, snapshot, selo). Vocabulário: "resultado
// observado" descreve o movimento do indicador no período — nunca
// "eficácia" ou "impacto" da medida (ver memória memoria-do-ciclo).
// =====================================================

import jsPDF from 'jspdf';
import type { DossieMedida } from '../services/empresaService';
import { FATOR_LABEL, FORCA_LABEL, RESULTADO_LABEL } from './planoAcaoLabels';
import {
  MAIN, PETROL, MUTED, PRIVACIDADE, NIVEL_LABEL, STATUS_LABEL,
  blocoIdentificacao, blocoSumario, fmtDate, type EmissaoMeta,
} from './relatorioBlocos';

const COMPARABILIDADE_LABEL: Record<string, string> = {
  comparavel: 'comparável',
  dado_suprimido: 'recorte abaixo do piso de anonimato',
  amostra_insuficiente: 'amostra insuficiente',
  participacao_divergente: 'participação muito diferente entre os ciclos',
  intervalo_insuficiente: 'intervalo curto demais entre os ciclos',
  sem_linha_de_base: 'sem linha de base',
};

const EXECUCAO_LABEL: Record<string, string> = {
  executada: 'executada', em_andamento: 'em andamento', nao_executada: 'não executada', cancelada: 'cancelada',
};

const NOTA_DOSSIE =
  'Este dossiê reúne, para uma única medida de controle, a leitura agregada que a motivou, o registro ' +
  'da medida, os combinados com a liderança, a execução e o resultado observado no ciclo de medição ' +
  'seguinte. "Resultado observado" descreve o movimento de um indicador agregado entre dois ciclos ' +
  'comparáveis; não afirma relação de causa entre a medida e esse movimento, e a ausência de movimento ' +
  'não caracteriza falha da medida. Hipóteses são hipóteses: descrevem com o que o padrão observado é ' +
  'compatível, não diagnóstico.';

function sintese(d: DossieMedida): string[] {
  const m = d.medida;
  const linhas: string[] = [];
  linhas.push(
    `Medida "${m.medida}" (${NIVEL_LABEL[m.nivel_controle] ?? m.nivel_controle}, fator ${FATOR_LABEL[m.fator] ?? m.fator}) `
    + `em ${m.setor ?? 'toda a empresa'}, sob responsabilidade de ${m.responsavel}, prazo ${fmtDate(m.prazo)}. `
    + `Situação: ${STATUS_LABEL[m.status] ?? m.status}${m.concluida_em ? ` em ${fmtDate(m.concluida_em)}` : ''}${m.atrasada ? ' (fora do prazo)' : ''}.`,
  );
  if (d.hipotese) {
    linhas.push(
      `Origem: leitura de ${d.hipotese.campanha.instrumento_nome} (${fmtDate(d.hipotese.campanha.janela_inicio)} a ${fmtDate(d.hipotese.campanha.janela_fim)}), `
      + `hipótese com ${FORCA_LABEL[d.hipotese.forca_evidencia].toLowerCase()}.`,
    );
  } else {
    linhas.push('Medida registrada sem leitura de origem vinculada: não há linha de base para reavaliação automática.');
  }
  if (d.resultados.length > 0) {
    const r = d.resultados[0];
    linhas.push(`Resultado observado: ${RESULTADO_LABEL[r.classificacao]} (${COMPARABILIDADE_LABEL[r.comparabilidade] ?? r.comparabilidade}).`);
  } else if (d.baseline) {
    linhas.push('Ainda não há ciclo de medição posterior para observar o indicador.');
  }
  return linhas;
}

export function gerarDossieMedidaPDF(d: DossieMedida, meta: EmissaoMeta): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20;
  const largura = pageW - M * 2;

  const ensureSpace = (needed: number, y: number): number => {
    if (y + needed > pageH - 20) { doc.addPage(); return 24; }
    return y;
  };
  const titulo = (t: string, y: number): number => {
    y = ensureSpace(14, y);
    doc.setTextColor(...MAIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(t, M, y);
    return y + 6;
  };
  const paragrafo = (t: string, y: number, cor: [number, number, number] = MUTED, tamanho = 8.5): number => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(t, largura) as string[];
    y = ensureSpace(linhas.length * 4.4 + 2, y);
    doc.text(linhas, M, y);
    return y + linhas.length * 4.4 + 2;
  };
  const campo = (rotulo: string, valor: string, y: number): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MAIN);
    y = ensureSpace(8, y);
    doc.text(rotulo, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const linhas = doc.splitTextToSize(valor, largura - 34) as string[];
    doc.text(linhas, M + 34, y);
    return y + Math.max(1, linhas.length) * 4.4 + 1.5;
  };
  const lista = (itens: string[], y: number): number => {
    for (const item of itens) y = paragrafo(`•  ${item}`, y);
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
  doc.text('DOSSIÊ DA MEDIDA DE CONTROLE — SUBSÍDIO AO PGR', M, 25);

  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const tituloDoc = doc.splitTextToSize('Dossiê da medida: leitura, decisão, execução e resultado observado', largura) as string[];
  doc.text(tituloDoc, M, 48);
  let y = 48 + tituloDoc.length * 7 + 6;

  // ── Empresa ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  y += 7;
  doc.text(d.empresa?.nome ?? '—', M, y);
  if (d.empresa?.cnpj) { y += 6; doc.text(`CNPJ: ${d.empresa.cnpj}`, M, y); }
  y += 6;
  doc.text(`Documento nº ${meta.numeroDoc} · emitido em ${fmtDate(meta.emitidoEm)} · estado da medida em ${fmtDate(d.gerado_em)}`, M, y);

  y += 12;
  y = blocoSumario(doc, y, pageW, M, sintese(d));

  // ── 1. Leitura que originou ──
  y += 8;
  y = titulo('1. LEITURA QUE ORIGINOU A MEDIDA', y);
  if (d.hipotese) {
    const h = d.hipotese;
    y = campo('Ciclo de origem', `${h.campanha.instrumento_nome}, ${fmtDate(h.campanha.janela_inicio)} a ${fmtDate(h.campanha.janela_fim)}`, y);
    y = campo('Recorte', h.setor ?? 'Toda a empresa', y);
    y = campo('Hipótese', h.descricao, y);
    y = campo('Por que apareceu', h.por_que_foi_sugerida, y);
    y = campo('Força da evidência', FORCA_LABEL[h.forca_evidencia], y);
    if (h.ressalvas.length > 0) {
      y = paragrafo('Antes de interpretar (confundidores nomeados na leitura):', y, MAIN);
      y = lista(h.ressalvas, y);
    }
    if (h.convergencias.length > 0) {
      y = paragrafo('Outros dados da empresa na mesma direção (convergência, não causa):', y, MAIN);
      y = lista(h.convergencias, y);
    }
    if (h.contexto_setor) y = campo('Como o setor trabalha', h.contexto_setor, y);
    if (h.perguntas_validacao.length > 0) {
      y = paragrafo('Perguntas de validação levadas às equipes:', y, MAIN);
      y = lista(h.perguntas_validacao, y);
    }
  } else {
    y = paragrafo('Sem leitura de origem vinculada. A medida foi registrada manualmente; a rastreabilidade até um ciclo de medição não é possível.', y);
  }

  // ── 2. Medida ──
  y += 4;
  y = titulo('2. MEDIDA REGISTRADA', y);
  const m = d.medida;
  y = campo('Risco', m.risco_descricao, y);
  y = campo('Medida', m.medida, y);
  y = campo('Fator', FATOR_LABEL[m.fator] ?? m.fator, y);
  y = campo('Nível de controle', `${NIVEL_LABEL[m.nivel_controle] ?? m.nivel_controle}`, y);
  y = campo('Setor', m.setor ?? 'Toda a empresa', y);
  y = campo('Responsável', m.responsavel, y);
  y = campo('Prazo', fmtDate(m.prazo), y);
  y = campo('Registrada em', fmtDate(m.created_at), y);
  if (m.nivel_controle === 'individual') {
    y = paragrafo('Nota: medida de nível individual cuida de quem já foi afetado e, sozinha, não encerra risco de fonte (hierarquia de controle da NR-1).', y);
  }

  // ── 3. Combinados com a liderança ──
  y += 4;
  y = titulo('3. COMBINADOS COM A LIDERANÇA', y);
  if (d.lideranca) {
    const l = d.lideranca;
    y = campo('Ciclo', `${l.setor}, ${fmtDate(l.inicio)} a ${fmtDate(l.fim)} · etapa ${l.etapa.replace(/_/g, ' ')} · ${l.status}`, y);
    y = campo('Responsável RH', l.responsavel_rh, y);
    if (l.pontos_fortes.length > 0) y = campo('Pontos fortes', l.pontos_fortes.join('; '), y);
    if (l.pontos_atencao.length > 0) y = campo('Pontos de atenção', l.pontos_atencao.join('; '), y);
    if (l.nota_evolucao) y = campo('Nota de evolução', l.nota_evolucao, y);
    if (d.combinados.length > 0) {
      y = paragrafo('Outros combinados do mesmo ciclo:', y, MAIN);
      y = lista(d.combinados.map(c =>
        `${c.medida} — ${c.responsavel}, até ${fmtDate(c.prazo)} · ${STATUS_LABEL[c.status] ?? c.status}${c.evidencia ? ` · evidência: ${c.evidencia}` : ''}`), y);
    }
  } else {
    y = paragrafo('Esta medida não nasceu de um ciclo de evolução da liderança.', y);
  }

  // ── 4. Execução ──
  y += 4;
  y = titulo('4. EXECUÇÃO', y);
  y = campo('Situação', `${STATUS_LABEL[m.status] ?? m.status}${m.atrasada ? ' — fora do prazo' : ''}`, y);
  if (m.concluida_em) y = campo('Concluída em', fmtDate(m.concluida_em), y);
  y = campo('Evidência', m.evidencia?.trim() ? m.evidencia : 'Nenhuma evidência registrada até esta emissão.', y);
  if (d.historico.length > 0) {
    y = paragrafo('Trilha registrada:', y, MAIN);
    y = lista(d.historico.map(h => `${fmtDate(h.quando)} · ${h.acao}`), y);
  }

  // ── 5. Resultado observado ──
  y += 4;
  y = titulo('5. RESULTADO OBSERVADO', y);
  if (d.resultados.length === 0) {
    y = paragrafo(d.baseline
      ? `Linha de base: ${d.baseline.instrumento_nome}, ${fmtDate(d.baseline.janela_inicio)} a ${fmtDate(d.baseline.janela_fim)}. Ainda não há ciclo posterior encerrado para comparar.`
      : 'Sem linha de base vinculada: a reavaliação automática não se aplica a esta medida.', y);
  }
  for (const r of d.resultados) {
    const valor = (v: number | null) => v === null ? 'abaixo do piso de anonimato' : String(v);
    y = campo('Ciclo seguinte', `${fmtDate(r.followup.janela_inicio)} a ${fmtDate(r.followup.janela_fim)}${r.intervalo_dias !== null ? ` (${r.intervalo_dias} dias após a linha de base)` : ''}`, y);
    y = campo('Indicador', r.indicador, y);
    y = campo('Antes → depois', `${valor(r.valor_baseline)} → ${valor(r.valor_followup)}${r.delta !== null ? ` (${r.delta > 0 ? '+' : ''}${r.delta})` : ''} · n ${r.n_baseline ?? '—'} → ${r.n_followup ?? '—'}`, y);
    y = campo('Medida no cálculo', EXECUCAO_LABEL[r.execucao] ?? r.execucao, y);
    y = campo('Comparabilidade', COMPARABILIDADE_LABEL[r.comparabilidade] ?? r.comparabilidade, y);
    y = campo('Leitura', `${RESULTADO_LABEL[r.classificacao]}. ${r.narrativa}`, y);
    y += 2;
  }

  // ── Notas ──
  y += 4;
  y = titulo('NOTAS', y);
  y = paragrafo(NOTA_DOSSIE, y, [120, 120, 120], 7.5);
  y = paragrafo(PRIVACIDADE, y, [120, 120, 120], 7.5);

  y += 4;
  blocoIdentificacao(doc, y, pageW, pageH, M, meta);

  doc.save(`dossie-medida-malama-${meta.numeroDoc}.pdf`);
}
