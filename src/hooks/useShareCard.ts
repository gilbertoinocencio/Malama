import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import {
  ShareCardOptions,
  ShareResult,
  renderCard,
  canvasToFile,
  shareRenderedCard,
} from '../services/shareService';
import { publishShare, ShareLinkType } from '../services/shareLinkService';

/** Publicar o card gera o link público que acompanha o compartilhamento. */
export interface PublishOptions {
  type: ShareLinkType;
  headline?: string;
  subline?: string;
}

/**
 * Envolve o compartilhamento com estado de carregamento e retorno visível.
 * Antes, quando falhava, nada acontecia na tela — o usuário tocava no botão e
 * ficava sem saber se algo tinha sido gerado.
 */
export function useShareCard() {
  const { t } = useLanguage();
  const { user, influencerRecord } = useAuth();
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async (
      node: HTMLElement | null,
      options: ShareCardOptions,
      publish?: PublishOptions
    ): Promise<ShareResult> => {
      if (sharing) return 'cancelled';
      setSharing(true);
      try {
        const canvas = await renderCard(node, options);
        if (!canvas) {
          toast.error(t.social.shareError);
          return 'failed';
        }

        let url = options.url;
        let text = options.text;

        // O link é opcional de propósito: se a publicação falhar, o
        // compartilhamento acontece mesmo assim. Perder o link é ruim; perder o
        // compartilhamento é pior.
        if (publish && user) {
          const file = await canvasToFile(canvas, options.filename);
          const published = await publishShare({
            userId: user.id,
            type: publish.type,
            image: file,
            headline: publish.headline,
            subline: publish.subline,
            referralToken: influencerRecord?.referral_token,
          });
          if (published) {
            url = published.url;
            // Android ignora `url` e só manda `text`; iOS trata os dois. Juntar
            // aqui garante que o link viaja nas duas plataformas.
            text = text ? `${text}\n\n${published.url}` : published.url;
          }
        }

        const result = await shareRenderedCard(canvas, { ...options, url, text });
        if (result === 'downloaded') toast.success(t.social.imageSaved);
        if (result === 'failed') toast.error(t.social.shareError);
        return result;
      } finally {
        setSharing(false);
      }
    },
    [sharing, t, user, influencerRecord]
  );

  return { share, sharing };
}
