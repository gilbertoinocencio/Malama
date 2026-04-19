import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { getUserBadges, setFeaturedBadge, type UserBadge } from '../../../services/communityService';
import { BadgeChip } from './BadgeChip';
import toast from 'react-hot-toast';

interface BadgeSelectorProps {
  userId: string;
  onClose: () => void;
}

export const BadgeSelector: React.FC<BadgeSelectorProps> = ({ userId, onClose }) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserBadges(userId).then(b => { setBadges(b); setLoading(false); });
  }, [userId]);

  const handleSelect = async (badgeId: string) => {
    setSaving(true);
    const ok = await setFeaturedBadge(userId, badgeId);
    if (ok) {
      setBadges(prev => prev.map(b => ({ ...b, is_featured: b.badge_id === badgeId })));
      toast.success('Badge em destaque atualizado!');
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md bg-white dark:bg-surface-dark rounded-t-2xl p-6 pb-10"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Badge em Destaque</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Escolha qual badge aparece ao lado do seu nome nos posts.
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-Malama-dark rounded-xl animate-pulse" />
              ))}
            </div>
          ) : badges.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Você ainda não conquistou nenhum badge.
            </p>
          ) : (
            <div className="space-y-2">
              {badges.map(ub => (
                <button
                  key={ub.id}
                  onClick={() => handleSelect(ub.badge_id)}
                  disabled={saving}
                  className="w-full flex items-center justify-between p-3 rounded-xl border transition-all
                    border-gray-200 dark:border-white/10 hover:border-[#2ECC71] dark:hover:border-[#2ECC71]"
                >
                  <BadgeChip badge={{ ...ub.badge, is_featured: ub.is_featured }} size="md" />
                  {ub.is_featured && <CheckCircle size={18} className="text-[#2ECC71]" />}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
