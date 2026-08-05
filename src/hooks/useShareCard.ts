import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n';
import { shareCard, ShareCardOptions, ShareResult } from '../services/shareService';

/**
 * Envolve `shareCard` com estado de carregamento e retorno visível ao usuário.
 * Antes, quando o compartilhamento falhava, nada acontecia na tela — o usuário
 * tocava no botão e ficava sem saber se algo tinha sido gerado.
 */
export function useShareCard() {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async (node: HTMLElement | null, options: ShareCardOptions): Promise<ShareResult> => {
      if (sharing) return 'cancelled';
      setSharing(true);
      try {
        const result = await shareCard(node, options);
        if (result === 'downloaded') toast.success(t.social.imageSaved);
        if (result === 'failed') toast.error(t.social.shareError);
        return result;
      } finally {
        setSharing(false);
      }
    },
    [sharing, t]
  );

  return { share, sharing };
}
