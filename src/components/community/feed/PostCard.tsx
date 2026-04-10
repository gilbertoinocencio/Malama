import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Trash2, EyeOff, Loader2, Play } from 'lucide-react';
import { formatDistanceToNow } from '../../../utils/dateUtils';
import { BadgeChip } from '../badges/BadgeChip';
import { ReactionBar } from '../reactions/ReactionBar';
import {
  upsertReaction, removeReaction, deletePost, hideSystemPost,
  type EnrichedPost, type ReactionType,
} from '../../../services/communityService';
import { AppView } from '../../../types';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: EnrichedPost;
  currentUserId: string;
  onOpenComments: (postId: string) => void;
  onOpenReport: (postId: string) => void;
  onNavigateToProfile: (userId: string) => void;
  onNavigate: (view: AppView) => void;
  onTagClick: (tag: string) => void;
  onDeleted: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onOpenComments,
  onOpenReport,
  onNavigateToProfile,
  onTagClick,
  onDeleted,
}) => {
  const [reactions, setReactions] = useState(post.reactions);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const isOwn = post.user_id === currentUserId;
  const canDelete = isOwn && !post.is_system_post &&
    (Date.now() - new Date(post.created_at).getTime()) < 24 * 3600_000;
  const canHide = isOwn && post.is_system_post;

  const handleReact = async (type: ReactionType) => {
    const prev = { ...reactions };
    // Optimistic update
    const wasReacting = reactions.user_reaction === type;
    const newReactions = { ...reactions };
    if (reactions.user_reaction) {
      newReactions[reactions.user_reaction]--;
      newReactions.total--;
    }
    if (!wasReacting) {
      newReactions[type]++;
      newReactions.total++;
      newReactions.user_reaction = type;
    } else {
      newReactions.user_reaction = null;
    }
    setReactions(newReactions);

    const ok = wasReacting
      ? await removeReaction(post.id, currentUserId)
      : await upsertReaction(post.id, currentUserId, type);
    if (!ok) setReactions(prev);
  };

  const handleUnreact = async () => {
    if (!reactions.user_reaction) return;
    const prev = { ...reactions };
    const newReactions = { ...reactions };
    newReactions[reactions.user_reaction]--;
    newReactions.total--;
    newReactions.user_reaction = null;
    setReactions(newReactions);
    const ok = await removeReaction(post.id, currentUserId);
    if (!ok) setReactions(prev);
  };

  const handleDelete = async () => {
    const ok = await deletePost(currentUserId, post.id);
    if (ok) { onDeleted(post.id); toast.success('Post removido.'); }
    else toast.error('Não foi possível remover o post.');
    setMenuOpen(false);
  };

  const handleHide = async () => {
    const ok = await hideSystemPost(currentUserId, post.id);
    if (ok) { onDeleted(post.id); toast.success('Post ocultado.'); }
    else toast.error('Não foi possível ocultar o post.');
    setMenuOpen(false);
  };

  const mediaUrls = post.media_urls?.length ? post.media_urls : (post.image_url ? [post.image_url] : []);
  const isMilestone = post.is_system_post && post.type === 'milestone';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden
        ${isMilestone
          ? 'border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950 dark:to-gray-900'
          : 'border-gray-100 dark:border-gray-800'
        }`}
    >
      {isMilestone && (
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400" />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <button
            className="flex items-center gap-2.5"
            onClick={() => onNavigateToProfile(post.user_id)}
          >
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#2ECC71]/20 flex items-center justify-center text-[#2ECC71] font-semibold text-sm">
                {post.author.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  {post.author.display_name}
                </span>
                {post.author.featured_badge && (
                  <BadgeChip badge={post.author.featured_badge} size="sm" />
                )}
              </div>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(post.created_at))}
              </span>
            </div>
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
            >
              <MoreVertical size={16} className="text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg border
                  border-gray-200 dark:border-gray-700 overflow-hidden min-w-[150px]">
                  {canDelete && (
                    <button onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                      <Trash2 size={14} /> Deletar post
                    </button>
                  )}
                  {canHide && (
                    <button onClick={handleHide}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <EyeOff size={14} /> Ocultar
                    </button>
                  )}
                  {!isOwn && (
                    <button onClick={() => { onOpenReport(post.id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Denunciar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Conteúdo de texto */}
        {post.caption && (
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3 whitespace-pre-wrap">
            {post.caption}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map(tag => (
              <button key={tag} onClick={() => onTagClick(tag)}
                className="text-xs text-[#2ECC71] hover:underline font-medium">
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Vídeo */}
        {post.video_url && (
          <div className="rounded-xl overflow-hidden mb-3 bg-black aspect-video relative">
            {post.video_status === 'processing' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-2">
                <Loader2 size={24} className="text-white animate-spin" />
                <span className="text-xs text-gray-400">Processando vídeo…</span>
              </div>
            ) : (
              <>
                <video src={post.video_url} className="w-full h-full object-cover" controls={false} />
                <button
                  onClick={() => {
                    const vid = document.querySelector(`video[src="${post.video_url}"]`) as HTMLVideoElement;
                    vid?.play();
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                    <Play size={20} className="text-gray-900 ml-1" />
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* Galeria de imagens */}
        {!post.video_url && mediaUrls.length > 0 && (
          <div className="mb-3">
            <div className="rounded-xl overflow-hidden">
              <img
                src={mediaUrls[mediaIndex]}
                alt=""
                className="w-full max-h-72 object-cover"
              />
            </div>
            {mediaUrls.length > 1 && (
              <div className="flex gap-1 mt-1.5 justify-center">
                {mediaUrls.map((url, i) => (
                  <button key={url} onClick={() => setMediaIndex(i)}
                    className={`rounded-md overflow-hidden border-2 transition-all ${i === mediaIndex ? 'border-[#2ECC71]' : 'border-transparent'}`}>
                    <img src={url} alt="" className="w-10 h-10 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reaction bar */}
        <ReactionBar
          postId={post.id}
          reactions={reactions}
          commentsCount={post.comments_count}
          onReact={handleReact}
          onUnreact={handleUnreact}
          onOpenComments={() => onOpenComments(post.id)}
        />
      </div>
    </motion.div>
  );
};
