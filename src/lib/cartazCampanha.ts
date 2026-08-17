// =====================================================
// Malama — Cartaz A4 da campanha, um por setor
//
// Para uma parte grande do público-alvo este papel é o produto inteiro:
// quem trabalha em produção, obra ou cozinha não tem e-mail corporativo,
// muitas vezes não tem o app, e não vai digitar uma URL. O cartaz com QR
// no mural é o único caminho até o questionário.
//
// Por isso o leiaute é quase vazio. Ele é lido de relance, a dois metros,
// por alguém passando com as mãos ocupadas: uma frase, um código grande, a
// data. Todo elemento a mais disputa com o QR e reduz a chance de alguém
// parar. O texto de sigilo é a única exceção — sem ele o cartaz parece
// vigilância e produz o efeito contrário.
// =====================================================

import jsPDF from 'jspdf';
import { desenharNoPdf } from './qrSetor';
import { perfilDe } from './kitComunicacao';

const LARGURA = 210;
const ALTURA = 297;
const MARGEM = 20;

// Mesma paleta dos relatórios (`relatorioBlocos`), para o cartaz no mural e
// o PDF que vai para a diretoria parecerem a mesma empresa.
const TINTA: [number, number, number] = [28, 25, 23];
const MARCA: [number, number, number] = [140, 71, 62];
const SUAVE: [number, number, number] = [110, 105, 100];

export type CartazSetor = {
  setor: string;
  url: string;
};

export type DadosCartaz = {
  empresa: string;
  instrumento: string;
  /** Fim da janela, já formatado em pt-BR. */
  prazo: string;
};

/** Texto centrado na página, devolvendo o Y depois da última linha. */
function centrado(
  doc: jsPDF,
  texto: string,
  y: number,
  tamanho: number,
  estilo: 'normal' | 'bold',
  cor: [number, number, number],
  entrelinha = 1.25,
): number {
  doc.setFont('helvetica', estilo);
  doc.setFontSize(tamanho);
  doc.setTextColor(...cor);
  const linhas = doc.splitTextToSize(texto, LARGURA - MARGEM * 2) as string[];
  const alturaLinha = (tamanho * entrelinha) / 2.83; // pt → mm
  linhas.forEach((linha, i) => {
    doc.text(linha, LARGURA / 2, y + i * alturaLinha, { align: 'center' });
  });
  return y + linhas.length * alturaLinha;
}

function desenharPagina(doc: jsPDF, d: DadosCartaz, item: CartazSetor): void {
  const p = perfilDe(d.instrumento);

  // ── Topo: de quem é o cartaz ──
  let y = MARGEM + 4;
  y = centrado(doc, d.empresa.toUpperCase(), y, 11, 'bold', MARCA);

  // ── Chamada ──
  y += 12;
  y = centrado(doc, p.chamada[0], y, 30, 'normal', TINTA, 1.15);
  y = centrado(doc, p.chamada[1], y + 1, 30, 'bold', TINTA, 1.15);

  y += 9;
  y = centrado(
    doc,
    `Uma pesquisa anônima sobre ${p.sobre}.`,
    y, 13, 'normal', SUAVE, 1.35,
  );

  // ── QR: o elemento principal, e por isso o maior ──
  const ladoQr = 88;
  const yQr = Math.max(y + 12, 118);
  desenharNoPdf(doc, item.url, (LARGURA - ladoQr) / 2, yQr, ladoQr);

  let yPos = yQr + ladoQr + 11;
  yPos = centrado(doc, 'Aponte a câmera do celular para o código', yPos, 14, 'bold', TINTA);
  yPos = centrado(
    doc,
    `${p.perguntas} perguntas · cerca de ${p.minutos} minutos · sem instalar aplicativo`,
    yPos + 3, 11, 'normal', SUAVE,
  );

  // ── Prazo: a informação que faz alguém agir hoje ──
  yPos += 9;
  doc.setFillColor(...MARCA);
  doc.roundedRect(LARGURA / 2 - 46, yPos - 5.5, 92, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Aberta até ${d.prazo}`, LARGURA / 2, yPos + 2.5, { align: 'center' });

  // ── Rodapé: sigilo e setor ──
  // Encostado na base para não competir com o QR, mas em corpo legível: é o
  // que decide se a pessoa responde com sinceridade ou não responde.
  const yRodape = ALTURA - MARGEM - 26;
  doc.setDrawColor(225, 222, 219);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, yRodape, LARGURA - MARGEM, yRodape);

  centrado(
    doc,
    'Não pede login e não pergunta seu nome. Nem a chefia nem o RH conseguem ver a '
    + 'resposta de uma pessoa — só o resultado do setor inteiro, somado. Responder é '
    + 'voluntário.',
    yRodape + 7, 9.5, 'normal', SUAVE, 1.45,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SUAVE);
  doc.text(`Setor: ${item.setor}`, MARGEM, ALTURA - MARGEM + 2);
  // A URL escrita existe para o caso do celular sem leitor de QR — e para o
  // RH conferir, ao pendurar, que pegou o cartaz do setor certo.
  doc.text(item.url, LARGURA - MARGEM, ALTURA - MARGEM + 2, { align: 'right' });
}

/**
 * Gera o PDF dos cartazes — uma página por setor, na ordem recebida.
 *
 * Um arquivo só, e não um por setor: o RH manda tudo para a impressora de
 * uma vez, e as páginas saem na mesma ordem da lista que ele acabou de ver
 * na tela, o que torna difícil pendurar o cartaz errado no mural errado.
 */
export function gerarCartazesPDF(d: DadosCartaz, setores: CartazSetor[]): void {
  if (setores.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  setores.forEach((item, i) => {
    if (i > 0) doc.addPage();
    desenharPagina(doc, d, item);
  });

  const nome = setores.length === 1
    ? `cartaz-${setores[0].setor.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.pdf`
    : `cartazes-${setores.length}-setores.pdf`;
  doc.save(nome);
}
