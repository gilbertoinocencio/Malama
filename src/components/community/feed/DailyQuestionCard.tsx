import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { EnrichedPost } from '../../../services/communityService';

interface DailyQuestionCardProps {
  post: EnrichedPost;
  onOpenComments: (postId: string) => void;
}

export const DailyQuestionCard: React.FC<DailyQuestionCardProps> = ({ post, onOpenComments }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-r from-[#2ECC71]/10 to-emerald-50 dark:from-[#2ECC71]/10 dark:to-emerald-950/20
      border border-[#2ECC71]/30 rounded-2xl p-4 mb-2"
  >
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-[#2ECC71]/20 flex items-center justify-center shrink-0">
        <span className="text-lg">📌</span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-[#2ECC71] mb-1 uppercase tracking-wide">Pergunta do dia</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">{post.caption}</p>
        <button
          onClick={() => onOpenComments(post.id)}
          className="flex items-center gap-1.5 mt-2 text-xs text-[#2ECC71] font-medium hover:underline"
        >
          <MessageCircle size={13} />
          Responder
          {post.comments_count > 0 && ` · ${post.comments_count} respostas`}
        </button>
      </div>
    </div>
  </motion.div>
);
