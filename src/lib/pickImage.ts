import { Capacitor } from '@capacitor/core';
import { GaleriaNativa } from './galeriaNativa';

/**
 * Abre a galeria e devolve a imagem como data URL (ou null se cancelou).
 *
 * Mesma divisão que o MealLogger usa: no iOS o `<input type="file">` sempre
 * passa pela folha "Fototeca / Tirar Foto / Escolher Arquivo" e não há atributo
 * HTML que a pule, então lá vai pelo plugin nativo que abre a biblioteca
 * direto. Nas outras plataformas o input já abre a galeria direto.
 */
export async function pickImageFromGallery(maxSide = 1600): Promise<string | null> {
  if (Capacitor.getPlatform() === 'ios') {
    try {
      const { dataUrl, cancelado } = await GaleriaNativa.escolherImagem({ ladoMaximo: maxSide });
      if (cancelado || !dataUrl) return null;
      return dataUrl;
    } catch (err) {
      console.error('[pickImage] galeria nativa indisponível, caindo no input:', err);
    }
  }
  return pickViaInput(maxSide);
}

function pickViaInput(maxSide: number): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    // O evento 'cancel' não é confiável em todo WebView: sem seleção, a promise
    // simplesmente nunca resolve e o input é descartado com o elemento.
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await fileToResizedDataUrl(file, maxSide));
      } catch {
        resolve(null);
      }
    };

    document.body.appendChild(input);
    input.click();
  });
}

/** Reduz antes de virar data URL: foto de celular crua estoura a memória no canvas. */
function fileToResizedDataUrl(file: Blob, maxSide: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas 2d indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagem inválida'));
    };
    img.src = url;
  });
}
