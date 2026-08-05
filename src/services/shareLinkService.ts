/**
 * Publica o card compartilhado como link público (/s/<id>).
 *
 * Sem isso o compartilhamento é um beco sem saída: quem recebe a imagem vê um
 * card bonito e não tem como chegar no app. É o link que transforma volume de
 * compartilhamento em usuário.
 *
 * Nada aqui é gerado no servidor: o PNG que sobe é exatamente o que o usuário
 * viu na tela, então o preview do WhatsApp mostra o card real sem depender de
 * renderização server-side.
 */
import { supabase } from './supabase';

export type ShareLinkType = 'meal' | 'moment' | 'day' | 'hydration' | 'plan';

export interface PublishShareInput {
  userId: string;
  type: ShareLinkType;
  /** PNG do card, já renderizado no cliente. */
  image: File;
  /** Título do preview. Nunca inclui nome de pessoa ou de empresa. */
  headline?: string;
  subline?: string;
  /** Código de indicação de quem compartilha, quando for influencer. */
  referralToken?: string;
}

export interface PublishedShare {
  id: string;
  url: string;
}

/** Origem pública do link. Dentro do app nativo `location.origin` não serve. */
const PUBLIC_ORIGIN = 'https://malama.app';

export function shareUrlFor(id: string): string {
  return `${PUBLIC_ORIGIN}/s/${id}`;
}

/**
 * Sobe o card e cria a linha em `shares`. Devolve null em qualquer falha — o
 * compartilhamento em si nunca pode ficar refém disso: perder o link é ruim,
 * perder o compartilhamento é pior.
 */
export async function publishShare(input: PublishShareInput): Promise<PublishedShare | null> {
  const { userId, type, image, headline, subline, referralToken } = input;

  try {
    const path = `shares/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from('share-cards')
      .upload(path, image, { contentType: 'image/png' });

    if (uploadError) {
      console.error('[shareLinkService] falha no upload do card:', uploadError);
      return null;
    }

    const { data: publicUrl } = supabase.storage.from('share-cards').getPublicUrl(path);

    const { data, error } = await supabase
      .from('shares')
      .insert({
        user_id: userId,
        type,
        image_url: publicUrl.publicUrl,
        headline,
        subline,
        referral_token: referralToken ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[shareLinkService] falha ao registrar o compartilhamento:', error);
      return null;
    }

    return { id: data.id as string, url: shareUrlFor(data.id as string) };
  } catch (err) {
    console.error('[shareLinkService] erro inesperado:', err);
    return null;
  }
}
