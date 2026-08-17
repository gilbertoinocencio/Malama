// =====================================================
// Malama — QR do link de setor
//
// A landing de vendas promete "um link (ou QR impresso) por setor" e o
// painel nunca gerou o QR. Ele não é enfeite: em chão de fábrica, obra e
// cozinha ninguém digita URL — o cartaz com QR na parede é o único caminho
// até o questionário para quem não tem e-mail corporativo nem o app.
//
// Uma matriz, dois destinos: `caminhoSvg` desenha na tela, `desenharNoPdf`
// desenha no cartaz. Se cada um gerasse a sua, o QR do papel poderia
// divergir do QR da tela — e o do papel é o que fica meses na parede.
//
// Correção de erro 'Q' (recupera ~25%): o cartaz vive em ambiente com
// poeira, respingo e fita crepe por cima da borda. 'M' economizaria alguns
// módulos e não vale o risco de um cartaz ilegível que ninguém reporta.
// =====================================================

import qrcode from 'qrcode-generator';
import type jsPDF from 'jspdf';

export type MatrizQr = {
  /** Módulos por lado, sem contar a margem. */
  lado: number;
  /** `true` = módulo escuro. */
  escuro: (linha: number, coluna: number) => boolean;
};

/**
 * Margem obrigatória do padrão (quiet zone), em módulos. Abaixo de 4 muitos
 * leitores simplesmente não enxergam o código — e falham em silêncio, que é
 * o pior modo de falha possível num cartaz já impresso e pendurado.
 */
export const MARGEM_QR = 4;

export function gerarQr(texto: string): MatrizQr {
  // Tipo 0 = o menor tamanho que couber no conteúdo. As URLs aqui são
  // curtas (`https://host/q/<token>`), então sobra folga.
  const qr = qrcode(0, 'Q');
  qr.addData(texto);
  qr.make();
  return {
    lado: qr.getModuleCount(),
    escuro: (linha, coluna) => qr.isDark(linha, coluna),
  };
}

/**
 * Caminho SVG único com todos os módulos escuros, em coordenadas de módulo
 * (o `viewBox` cuida da escala). Um `<path>` só, e não um `<rect>` por
 * módulo: um QR de 33×33 chega a ~500 retângulos, e meia dúzia deles na
 * mesma tela trava a rolagem em máquina modesta.
 */
export function caminhoSvg(matriz: MatrizQr): string {
  const partes: string[] = [];
  for (let linha = 0; linha < matriz.lado; linha++) {
    for (let coluna = 0; coluna < matriz.lado; coluna++) {
      if (matriz.escuro(linha, coluna)) {
        partes.push(`M${coluna + MARGEM_QR} ${linha + MARGEM_QR}h1v1h-1z`);
      }
    }
  }
  return partes.join('');
}

/** Lado do `viewBox` correspondente ao caminho acima (matriz + as 2 margens). */
export const ladoViewBox = (matriz: MatrizQr): number => matriz.lado + MARGEM_QR * 2;

/**
 * Desenha o QR no PDF como vetor, um retângulo por módulo — nunca como
 * imagem rasterizada. Impressora doméstica a 600 dpi revela serrilhado de
 * PNG, e QR serrilhado é QR que o celular demora a ler (ou não lê).
 *
 * `lado` é a medida do QR em milímetros, margem inclusa, para o chamador
 * poder reservar o espaço no leiaute sem saber quantos módulos deu.
 */
export function desenharNoPdf(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  lado: number,
): void {
  const matriz = gerarQr(texto);
  const total = ladoViewBox(matriz);
  const modulo = lado / total;

  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, lado, lado, 'F');
  doc.setFillColor(0, 0, 0);

  // Um retângulo por módulo escuro. Emendar módulos vizinhos numa barra só
  // reduziria o tamanho do arquivo, mas alguns renderizadores deixam fresta
  // de subpixel entre retângulos adjacentes — e fresta no meio de um padrão
  // de alinhamento estraga a leitura.
  for (let linha = 0; linha < matriz.lado; linha++) {
    for (let coluna = 0; coluna < matriz.lado; coluna++) {
      if (!matriz.escuro(linha, coluna)) continue;
      doc.rect(
        x + (coluna + MARGEM_QR) * modulo,
        y + (linha + MARGEM_QR) * modulo,
        modulo,
        modulo,
        'F',
      );
    }
  }
}
