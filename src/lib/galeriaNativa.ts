import { registerPlugin } from '@capacitor/core';

/**
 * Ponte para o GaleriaPlugin (ios/App/App/GaleriaPlugin.swift).
 *
 * Existe porque nenhum plugin de prateleira abre a biblioteca de fotos direto:
 * todos usam `PHPickerConfiguration(photoLibrary:)`, que amarra o picker à
 * autorização do app e abre vazio em modo "Limited". Ver o comentário no Swift.
 *
 * Implementado só em iOS — nas outras plataformas o `<input type="file">` já
 * abre a galeria direto, sem folha de opções no meio.
 */
export interface GaleriaNativaPlugin {
  escolherImagem(options?: { ladoMaximo?: number }): Promise<{
    /** JPEG em data URL, já reduzido. Ausente quando o usuário cancelou. */
    dataUrl?: string;
    cancelado?: boolean;
  }>;
}

export const GaleriaNativa = registerPlugin<GaleriaNativaPlugin>('Galeria');
