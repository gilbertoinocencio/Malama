import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n';
import { useShareCard } from '../hooks/useShareCard';
import {
  ShareMoment,
  markMomentOffered,
  disableMoments,
} from '../services/shareMomentsService';
import { getLocalDateString } from '../utils/dateUtils';
import { MomentShareCard } from './MomentShareCard';

interface ShareMomentSheetProps {
  userId: string;
  moment: ShareMoment;
  onClose: () => void;
}

/**
 * Oferta de compartilhamento no pico da emoção. Aparece sozinha, com o card
 * pronto — o usuário não precisa procurar nada.
 *
 * "Agora não" tem o mesmo peso visual do compartilhar de propósito: uma oferta
 * que constrange é uma oferta que faz desinstalar.
 */
export const ShareMomentSheet: React.FC<ShareMomentSheetProps> = ({ userId, moment, onClose }) => {
  const { t } = useLanguage();
  const { share, sharing } = useShareCard();
  const cardRef = useRef<HTMLDivElement>(null);
  const sm = t.shareMoments;

  // Consome a oferta assim que ela aparece. Recusar também gasta a do dia —
  // senão a mesma coisa voltaria a cada recarga da tela.
  useEffect(() => {
    markMomentOffered(userId, moment);
  }, [userId, moment]);

  const handleShare = async () => {
    const result = await share(
      cardRef.current,
      {
        filename: `Malama-${moment.type}-${getLocalDateString()}`,
        title: sm.offerTitle,
        text: sm.offerTitle,
      },
      {
        type: 'moment',
        headline: sm.offerTitle,
        subline: moment.label ?? (moment.value ? String(moment.value) : undefined),
      }
    );
    if (result === 'shared' || result === 'downloaded') onClose();
  };

  const handleNeverAgain = () => {
    disableMoments(userId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
      <div className="w-full max-w-md mx-auto flex flex-col items-center px-6 pt-8 pb-safe-bottom">
        <h2 className="text-white text-xl font-bold text-center mb-1">{sm.offerTitle}</h2>
        <p className="text-white/60 text-sm text-center mb-5">{sm.offerSubtitle}</p>

        <div className="w-full max-w-[260px] rounded-2xl overflow-hidden shadow-2xl">
          <MomentShareCard ref={cardRef} moment={moment} />
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-6 pb-6">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full bg-white text-[#221910] font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <span className="material-symbols-outlined">ios_share</span>
            {sharing ? t.social.sharing : sm.cta}
          </button>

          <button
            onClick={onClose}
            className="w-full text-white/85 font-semibold text-sm py-3.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            {sm.notNow}
          </button>

          <button
            onClick={handleNeverAgain}
            className="w-full text-white/40 text-xs py-2 hover:text-white/60 transition-colors"
          >
            {sm.dontShowAgain}
          </button>
        </div>
      </div>
    </div>
  );
};
