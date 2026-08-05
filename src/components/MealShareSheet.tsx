import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Meal } from '../types';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useShareCard } from '../hooks/useShareCard';
import { renderCardToFile } from '../services/shareService';
import { createCommunityPost } from '../services/communityService';
import { getLocalDateString } from '../utils/dateUtils';
import { MealShareCard } from './MealShareCard';

interface MealShareSheetProps {
  meal: Meal;
  onClose: () => void;
}

export const MealShareSheet: React.FC<MealShareSheetProps> = ({ meal, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { share, sharing } = useShareCard();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMacros, setShowMacros] = useState(true);
  const [posting, setPosting] = useState(false);

  const ms = t.mealShare;

  const filename = `Malama-${(meal.name || 'refeicao').replace(/\s+/g, '-').toLowerCase()}-${getLocalDateString()}`;

  const handleShare = () =>
    share(cardRef.current, {
      filename,
      title: ms.title,
      text: `${meal.name} — ${Math.round(meal.calories)} kcal`,
      backgroundColor: '#221910',
    });

  const handlePost = async () => {
    if (!user) return;
    setPosting(true);
    try {
      const file = await renderCardToFile(cardRef.current, {
        filename,
        backgroundColor: '#221910',
      });
      if (!file) {
        toast.error(t.social.shareError);
        return;
      }
      const postId = await createCommunityPost(user.id, {
        caption: `${meal.name} — ${Math.round(meal.calories)} kcal`,
        files: [file],
        type: 'meal',
      });
      if (postId) {
        toast.success(ms.posted);
        onClose();
      } else {
        toast.error(ms.postError);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'daily_limit_reached') toast.error(ms.dailyLimit);
      else if (code === 'upload_failed') toast.error(ms.uploadError);
      else toast.error(ms.postError);
    } finally {
      setPosting(false);
    }
  };

  const busy = sharing || posting;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col animate-fade-in">
      <header className="flex items-center justify-between px-4 pt-safe-header pb-3 shrink-0">
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-white text-base font-bold flex-1 text-center pr-10">{ms.title}</h2>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 flex flex-col items-center">
        <div className="w-full max-w-[300px] rounded-2xl overflow-hidden shadow-2xl">
          <MealShareCard ref={cardRef} meal={meal} showMacros={showMacros} />
        </div>

        {/* Os números do prato são dado de saúde: dá para postar só a foto. */}
        <button
          onClick={() => setShowMacros(v => !v)}
          className="mt-5 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showMacros ? 'visibility_off' : 'visibility'}
          </span>
          {showMacros ? ms.hideNumbers : ms.showNumbers}
        </button>
      </main>

      <footer className="shrink-0 px-6 pb-safe-bottom pb-6 flex flex-col gap-3">
        <button
          onClick={handleShare}
          disabled={busy}
          className="w-full bg-white text-[#221910] font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          <span className="material-symbols-outlined">ios_share</span>
          {sharing ? t.social.sharing : ms.share}
        </button>

        <button
          onClick={handlePost}
          disabled={busy}
          className="w-full bg-white/10 text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px]">groups</span>
          {posting ? ms.posting : ms.postToCommunity}
        </button>
      </footer>
    </div>
  );
};
