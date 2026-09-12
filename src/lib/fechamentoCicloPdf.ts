// =====================================================
// Malama — Registro de fechamento de ciclo (PDF)
//
// Imprime o MESMO objeto que a tela de fechamento mostra e que o copiloto
// lê (calculado na Edge Function — supabase/functions/_shared/
// fechamento-ciclo.ts). Três blocos, na ordem em que devem ser lidos: o
// que mudou (com a comparabilidade sazonal antes das setas), o que foi
// feito no meio, e o resultado observado das medidas com linha de base.
//
// Sem nota, sem pontuação, sem ranking de setor.
// =====================================================

import jsPDF from 'jspdf';
import type { RhFechamentoCiclo } from '../services/rhAgentService';
import { RESULTADO_LABEL } from './planoAcaoLabels';
import {
  MAIN, PETROL, MUTED, PRIVACIDADE, NIVEL_LABEL, STATUS_LABEL,
  blocoIdentificacao, blocoSumario, fmtDate, type EmissaoMeta,
} from './relatorioBlocos';

const DIRECAO_LABEL: Record<string, string> = {
  melhorou: 'melhorou', piorou: 'piorou', estavel: 'sem variação relevante', sem_par: 'sem par para comparar',
};

const NOTA_CICLO =
  'Este registro documenta a leitura de um ciclo de medição encerrado, comparado ao ciclo anterior do ' +
  'mesmo instrumento. As variações descrevem o movimento de indicadores agregados entre dois períodos; ' +
  'a comparabilidade sazonal é nomeada antes de qualquer leitura de melhora ou piora. Medidas listadas ' +
  'no intervalo são o que a empresa registrou entre os dois ciclos; nenhuma variação é atribuída a ' +
  'uma medida específica.';

export type FechamentoCicloMeta = EmissaoMeta & { empresaNome: string; empresaCnpj: string | null };

export function gerarFechamentoCicloPDF(f: RhFechamentoCiclo, meta: FechamentoCicloMeta): void {
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
  const lista = (itens: string[], y: number): number => {
    for (const item of itens) y = paragrafo(`•  ${item}`, y);
    return y;
  };
  const valor = (v: number | null) => v === null ? 'abaixo do piso' : String(v);

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
  doc.text('REGISTRO DE FECHAMENTO DE CICLO — SUBSÍDIO AO PGR', M, 25);

  doc.setTextColor(...MAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const tituloDoc = doc.splitTextToSize(`Fechamento do ciclo de ${f.campanha.instrumento_nome}`, largura) as string[];
  doc.text(tituloDoc, M, 48);
  let y = 48 + tituloDoc.length * 7 + 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  y += 7;
  doc.text(meta.empresaNome, M, y);
  if (meta.empresaCnpj) { y += 6; doc.text(`CNPJ: ${meta.empresaCnpj}`, M, y); }
  y += 6;
  doc.text(`Ciclo: ${fmtDate(f.campanha.janela_inicio)} a ${fmtDate(f.campanha.janela_fim)} · ${f.campanha.n_respondentes} de ${f.campanha.n_convidados} respostas`, M, y);
  y += 6;
  doc.text(f.anterior
    ? `Ciclo anterior: ${fmtDate(f.anterior.janela_inicio)} a ${fmtDate(f.anterior.janela_fim)} · ${f.anterior.n_respondentes} de ${f.anterior.n_convidados} respostas`
    : 'Ciclo anterior: nenhum — este é a linha de base.', M, y);
  y += 6;
  doc.text(`Documento nº ${meta.numeroDoc} · emitido em ${fmtDate(meta.emitidoEm)}`, M, y);

  y += 12;
  y = blocoSumario(doc, y, pageW, M, [f.resumo]);

  // ── 1. O que mudou ──
  y += 8;
  y = titulo('1. O QUE MUDOU', y);
  if (f.anterior) y = paragrafo(`Antes de ler as variações: ${f.comparabilidade_texto}.`, y, MAIN);
  y = lista(f.indicadores.map(i => i.direcao === 'sem_par'
    ? `${i.label}: ${valor(i.atual)} (sem par comparável no ciclo anterior)`
    : `${i.label}: ${valor(i.anterior)} → ${valor(i.atual)} (${i.delta! > 0 ? '+' : ''}${i.delta}) — ${DIRECAO_LABEL[i.direcao]} · n ${i.n_anterior} → ${i.n_atual}`), y);
  if (f.setores.length > 0) {
    y = paragrafo(f.campanha.instrumento === 'who5' ? 'Por setor (bem-estar médio):' : 'Por setor (índice de carga de trabalho):', y, MAIN);
    y = lista(f.setores.map(s => s.suprimido
      ? `${s.setor}: abaixo do piso de anonimato`
      : s.direcao === 'sem_par'
        ? `${s.setor}: ${valor(s.atual)} (sem par no ciclo anterior)`
        : `${s.setor}: ${valor(s.anterior)} → ${valor(s.atual)} — ${DIRECAO_LABEL[s.direcao]}`), y);
  }
  if (f.setores_suprimidos > 0) {
    y = paragrafo(`${f.setores_suprimidos} setor(es) não aparecem por estarem abaixo do piso de anonimato.`, y);
  }

  // ── 2. O que foi feito no meio ──
  y += 4;
  y = titulo('2. O QUE FOI FEITO NO INTERVALO', y);
  if (f.medidas_no_intervalo.length === 0) {
    y = paragrafo('Nenhuma medida registrada no intervalo entre os dois ciclos.', y);
  } else {
    y = lista(f.medidas_no_intervalo.map(m =>
      `${m.medida} — ${m.setor ?? 'toda a empresa'} · ${NIVEL_LABEL[m.nivel_controle] ?? m.nivel_controle} · ${STATUS_LABEL[m.status] ?? m.status}${m.concluida_em ? ` em ${fmtDate(m.concluida_em)}` : ''}`), y);
  }

  // ── 3. Resultado observado ──
  y += 4;
  y = titulo('3. RESULTADO OBSERVADO DAS MEDIDAS COM LINHA DE BASE', y);
  if (f.resultados.length === 0) {
    y = paragrafo('Nenhuma medida com linha de base neste ciclo.', y);
  } else {
    y = lista(f.resultados.map(r =>
      `${r.medida ?? r.plano_acao_id} (${r.setor ?? 'toda a empresa'}): ${RESULTADO_LABEL[r.classificacao]}. ${r.narrativa}`), y);
  }
  if (f.proximo_pico) {
    y += 2;
    y = paragrafo(`Próximo pico previsto: ${f.proximo_pico}. A próxima medição fora do pico serve de linha de base; dentro e fora, mostra a diferença.`, y);
  }

  y += 4;
  y = titulo('NOTAS', y);
  y = paragrafo(NOTA_CICLO, y, [120, 120, 120], 7.5);
  y = paragrafo(PRIVACIDADE, y, [120, 120, 120], 7.5);

  y += 4;
  blocoIdentificacao(doc, y, pageW, pageH, M, meta);

  doc.save(`fechamento-ciclo-malama-${meta.numeroDoc}.pdf`);
}
