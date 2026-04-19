import React from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { BadgeChip } from '../badges/BadgeChip';
import type { EnrichedPost } from '../../../services/communityService';
import { formatDistanceToNow } from '../../../utils/dateUtils';

interface SpotlightCardProps {
  post: EnrichedPost;
  onOpenComments: (postId: string) => void;
  onNavigateToProfile: (userId: string) => void;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({ post, onOpenComments, onNavigateToProfile }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 rounded-2xl p-px overflow-hidden mb-2"
  >
    <div className="bg-white dark:bg-surface-dark rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Crown size={16} className="text-yellow-500" />
        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
          Destaque da semana
        </span>
      </div>
      <button className="flex items-center gap-2.5 mb-2" onClick={() => onNavigateToProfile(post.user_id)}>
        {post.author.avatar_url ? (
          <img src={post.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold text-sm">
            {post.author.display_name[0]?.toUpperCase()}
          </div>
        )}
        <div className="text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{post.author.display_name}</span>
            {post.author.featured_badge && <BadgeChip badge={post.author.featured_badge} size="sm" />}
          </div>
          <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(post.created_at))}</span>
        </div>
      </button>
      {post.caption && (
        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed mb-3 line-clamp-4">{post.caption}</p>
      )}
      {(post.media_urls?.[0] ?? post.image_url) && (
        <img src={post.media_urls?.[0] ?? post.image_url!} alt="" className="w-full max-h-52 object-cover rounded-xl mb-3" />
      )}
      <button
        onClick={() => onOpenComments(post.id)}
        className="text-xs text-[#2ECC71] font-medium hover:underline"
      >
        Ver {post.comments_count} comentário{post.comments_count !== 1 ? 's' : ''}
      </button>
    </div>
  </motion.div>
);
