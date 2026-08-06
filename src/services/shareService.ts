/**
 * Ponto único de compartilhamento do app.
 *
 * O motivo de existir: o app roda dentro de uma WebView (Capacitor) e lá
 * `<a download>` simplesmente não faz nada — nem no WKWebView (iOS não suporta
 * download por âncora) nem na WebView do Android (o atributo é ignorado e não há
 * DownloadListener registrado). Os cards de compartilhamento eram gerados e
 * descartados em silêncio no app empacotado.
 *
 * Aqui o caminho nativo passa por arquivo em cache + share sheet do sistema, e a
 * web mantém Web Share API com fallback para download.
 */
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Elementos marcados com este atributo somem da imagem exportada.
 * Serve para botões de navegação que ficam por cima do card.
 */
export const SHARE_HIDE_ATTR = 'data-share-hide';

/** Largura do PNG exportado. 1080px é o padrão de stories/feed. */
const DEFAULT_TARGET_WIDTH = 1080;

const CACHE_PREFIX = 'malama-share-';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export interface ShareCardOptions {
  /** Nome do arquivo, sem extensão. */
  filename: string;
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  /** Cor de fundo do PNG. `null` gera fundo transparente. */
  backgroundColor?: string | null;
  /** Largura final em px. O nó é escalado para bater com ela. */
  targetWidth?: number;
  /**
   * Entrega só a imagem, sem texto nem link.
   *
   * O card sem fundo é um adesivo para o usuário compor por cima da foto dele,
   * não um post. Mandar texto junto faz o Instagram transformá-lo em adesivo de
   * texto — foi exatamente isso que apareceu no lugar do card.
   */
  imageOnly?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Captura o nó em PNG. Escala é derivada da largura alvo em vez de fixa: o card
 * sai sempre no mesmo tamanho, independente do tamanho da tela do aparelho.
 */
async function renderNodeToCanvas(
  node: HTMLElement,
  backgroundColor: string | null,
  targetWidth: number
): Promise<HTMLCanvasElement> {
  // Dá tempo de fontes e imagens assentarem antes do snapshot.
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)));

  const width = node.getBoundingClientRect().width || node.offsetWidth || targetWidth;
  // O teto precisa acomodar a pré-visualização pequena da tela de personalizar
  // (~224px): com teto 4 o PNG saía 896px em vez dos 1080 pedidos.
  const scale = clamp(targetWidth / width, 1, 8);

  return html2canvas(node, {
    scale,
    useCORS: true,
    backgroundColor,
    logging: false,
    imageTimeout: 8000,
    ignoreElements: el => el instanceof HTMLElement && el.hasAttribute(SHARE_HIDE_ATTR),
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('canvas.toBlob devolveu null'))),
      'image/png'
    );
  });
}

/**
 * Remove PNGs de compartilhamentos anteriores do cache.
 * O arquivo não pode ser apagado logo após o share — o app que recebe lê de
 * forma assíncrona — então a limpeza acontece na chamada seguinte.
 */
async function sweepCache(currentFile: string) {
  try {
    const { files } = await Filesystem.readdir({ path: '', directory: Directory.Cache });
    await Promise.all(
      files
        .filter(f => f.name.startsWith(CACHE_PREFIX) && f.name !== currentFile)
        .map(f =>
          Filesystem.deleteFile({ path: f.name, directory: Directory.Cache }).catch(() => undefined)
        )
    );
  } catch {
    /* cache indisponível não é motivo para abortar o compartilhamento */
  }
}

const isCancellation = (err: unknown) => {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /abort|cancel/i.test(msg);
};

async function shareNative(canvas: HTMLCanvasElement, o: ShareCardOptions): Promise<ShareResult> {
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const name = `${CACHE_PREFIX}${o.filename}-${Date.now()}.png`;

  void sweepCache(name);

  const { uri } = await Filesystem.writeFile({
    path: name,
    data: base64,
    directory: Directory.Cache,
  });

  try {
    await Share.share({
      title: o.title,
      // `url` fica de fora sempre: o link já viaja dentro de `text`, e mandar os
      // dois virava DOIS adesivos de texto no Instagram Stories.
      text: o.imageOnly ? undefined : o.text,
      files: [uri],
      dialogTitle: o.dialogTitle ?? o.title,
    });
  } catch (err) {
    // O iOS rejeita a promise quando o usuário fecha a folha de compartilhamento.
    if (isCancellation(err)) return 'cancelled';
    throw err;
  }

  await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  return 'shared';
}

async function shareWeb(canvas: HTMLCanvasElement, o: ShareCardOptions): Promise<ShareResult> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `${o.filename}.png`, { type: 'image/png' });

  // Adesivo é para salvar e compor depois, não para postar: vai direto ao
  // download em vez de abrir a folha de compartilhamento.
  if (!o.imageOnly && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: o.title, text: o.text });
      return 'shared';
    } catch (err) {
      if (isCancellation(err)) return 'cancelled';
      // Navegador com Web Share instável: cai para download em vez de falhar.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${o.filename}.png`;
  link.href = objectUrl;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  return 'downloaded';
}

/**
 * Renderiza o card e devolve o canvas. Exportado para que o mesmo desenho sirva
 * ao arquivo publicado e ao compartilhamento, sem renderizar duas vezes — o
 * html2canvas é a parte cara do fluxo.
 */
export async function renderCard(
  node: HTMLElement | null,
  options: Pick<ShareCardOptions, 'backgroundColor' | 'targetWidth'> = {}
): Promise<HTMLCanvasElement | null> {
  if (!node) return null;
  try {
    return await renderNodeToCanvas(
      node,
      options.backgroundColor ?? null,
      options.targetWidth ?? DEFAULT_TARGET_WIDTH
    );
  } catch (err) {
    console.error('[shareService] falha ao renderizar o card:', err);
    return null;
  }
}

export async function canvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  const blob = await canvasToBlob(canvas);
  return new File([blob], `${filename}.png`, { type: 'image/png' });
}

/**
 * Gera o PNG do card como arquivo, sem abrir compartilhamento nenhum.
 * Usado para publicar o card direto na comunidade.
 */
export async function renderCardToFile(
  node: HTMLElement | null,
  options: Pick<ShareCardOptions, 'filename' | 'backgroundColor' | 'targetWidth'>
): Promise<File | null> {
  const canvas = await renderCard(node, options);
  if (!canvas) return null;
  try {
    return await canvasToFile(canvas, options.filename);
  } catch (err) {
    console.error('[shareService] falha ao gerar arquivo do card:', err);
    return null;
  }
}

/**
 * Abre o compartilhamento a partir de um card já renderizado.
 * Nunca lança: devolve 'failed' para quem chamou decidir a mensagem.
 */
export async function shareRenderedCard(
  canvas: HTMLCanvasElement,
  options: ShareCardOptions
): Promise<ShareResult> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    return Capacitor.isNativePlatform()
      ? await shareNative(canvas, options)
      : await shareWeb(canvas, options);
  } catch (err) {
    console.error('[shareService] falha ao compartilhar:', err);
    return 'failed';
  }
}

/** Renderiza e compartilha em uma chamada só. */
export async function shareCard(
  node: HTMLElement | null,
  options: ShareCardOptions
): Promise<ShareResult> {
  const canvas = await renderCard(node, options);
  if (!canvas) return 'failed';
  return shareRenderedCard(canvas, options);
}
