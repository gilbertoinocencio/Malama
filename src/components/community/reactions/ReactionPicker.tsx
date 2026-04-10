import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactionType } from '../../../services/communityService';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'heart',  emoji: '❤️', label: 'Amei' },
  { type: 'fire',   emoji: '🔥', label: 'Incrível' },
  { type: 'muscle', emoji: '💪', label: 'Força' },
  { type: 'clap',   emoji: '👏', label: 'Parabéns' },
  { type: 'hug',    emoji: '🤗', label: 'Abraço' },
];

interface ReactionPickerProps {
  open: boolean;
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ open, onSelect, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            className="absolute bottom-10 left-0 z-50 flex items-center gap-1 bg-white dark:bg-gray-800
              rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-2 py-1.5"
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 8 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
          >
            {REACTIONS.map((r, i) => (
              <motion.button
                key={r.type}
                onClick={() => { onSelect(r.type); onClose(); }}
                className="flex flex-col items-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                title={r.label}
              >
                <motion.span
                  className="text-xl"
                  whileHover={{ scale: 1.4 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {r.emoji}
                </motion.span>
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
