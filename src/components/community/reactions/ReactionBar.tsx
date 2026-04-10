import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { ReactionPicker } from './ReactionPicker';
import type { ReactionSummary, ReactionType } from '../../../services/communityService';

const REACTION_EMOJI: Record<ReactionType, string> = {
  heart: '❤️', fire: '🔥', muscle: '💪', clap: '👏', hug: '🤗',
};

interface ReactionBarProps {
  postId: string;
  reactions: ReactionSummary;
  commentsCount: number;
  onReact: (type: ReactionType) => void;
  onUnreact: () => void;
  onOpenComments: () => void;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  postId: _postId,
  reactions,
  commentsCount,
  onReact,
  onUnreact,
  onOpenComments,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setPickerOpen(true), 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleTap = () => {
    if (pickerOpen) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
    if (reactions.user_reaction) {
      onUnreact();
    } else {
      onReact('heart');
    }
  };

  const handlePickerSelect = (type: ReactionType) => {
    onReact(type);
    setPickerOpen(false);
  };

  // Montar resumo das reações visíveis
  const activeReactions = (Object.keys(REACTION_EMOJI) as ReactionType[])
    .filter(t => reactions[t] > 0)
    .slice(0, 3);

  return (
    <div className="flex items-center gap-3 mt-2">
      {/* Botão de reação */}
      <div className="relative">
        <ReactionPicker open={pickerOpen} onSelect={handlePickerSelect} onClose={() => setPickerOpen(false)} />
        <button
          className="flex items-center gap-1.5 py-1 px-2 rounded-full transition-colors
            hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
          onClick={handleTap}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={e => { e.preventDefault(); setPickerOpen(true); }}
        >
          <AnimatePresence mode="wait">
            {animating ? (
              <motion.span
                key="anim"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.4, opacity: 1 }}
                exit={{ scale: 1, opacity: 0 }}
                className="text-base"
              >
                {reactions.user_reaction ? REACTION_EMOJI[reactions.user_reaction] : '❤️'}
              </motion.span>
            ) : (
              <motion.span key="idle" className="text-base">
                {reactions.user_reaction ? REACTION_EMOJI[reactions.user_reaction] : '🤍'}
              </motion.span>
            )}
          </AnimatePresence>

          {reactions.total > 0 && (
            <span className={`text-xs font-medium ${reactions.user_reaction ? 'text-[#2ECC71]' : 'text-gray-500 dark:text-gray-400'}`}>
              {reactions.total}
            </span>
          )}
        </button>
      </div>

      {/* Emojis das reações ativas */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1">
          {activeReactions.map(t => (
            <span key={t} className="text-sm" title={`${reactions[t]} ${t}`}>
              {REACTION_EMOJI[t]}
            </span>
          ))}
        </div>
      )}

      {/* Comentários */}
      <button
        onClick={onOpenComments}
        className="flex items-center gap-1.5 py-1 px-2 rounded-full transition-colors
          hover:bg-gray-100 dark:hover:bg-gray-800 ml-auto"
      >
        <MessageCircle size={16} className="text-gray-400" />
        {commentsCount > 0 && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{commentsCount}</span>
        )}
      </button>
    </div>
  );
};
