import React, { useEffect, useState } from 'react';
import { AppView } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { PostService, Post } from '../services/postService';
import { PostComposerModal } from './PostComposerModal';
import { CommentsModal } from './CommentsModal';

interface SocialFeedProps {
  onNavigate: (view: AppView) => void;
  onFabClick: () => void;
  activeView: AppView;
  onBack: () => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ onNavigate, onFabClick, activeView, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [user]);

  const loadPosts = async (pageNum: number = 0) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(pageNum === 0);
    try {
      const data = await PostService.getFeedPosts(pageNum, 10, user.id);

      if (pageNum === 0) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }

      setHasMore(data.length === 10);
      setPage(pageNum);
    } catch (e) {
      console.error("Error loading posts", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user || likingPostId) return;

    setLikingPostId(postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const isLiked = p.user_has_liked;
        return {
          ...p,
          likes: isLiked ? p.likes - 1 : p.likes + 1,
          user_has_liked: !isLiked
        };
      }
      return p;
    });
    setPosts(updatedPosts);

    // Actual API call
    if (post.user_has_liked) {
      await PostService.unlikePost(postId, user.id);
    } else {
      await PostService.likePost(postId, user.id);
    }

    setLikingPostId(null);
  };

  const handlePostSuccess = () => {
    loadPosts(0);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  // Empty state
  if (!loading && posts.length === 0) {
    return (
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-nura-bg/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-nura-petrol dark:text-white p-2 -ml-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">{t.social.community}</h1>
          <div className="w-10" />
        </header>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="size-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-orange-500 text-4xl">groups</span>
          </div>
          <h2 className="text-xl font-bold text-nura-main dark:text-white mb-2">
            Feed do Flow
          </h2>
          <p className="text-sm text-nura-muted dark:text-gray-400 mb-6 max-w-[280px]">
            Nenhum post ainda. Seja o primeiro a compartilhar seu flow!
          </p>
          <button
            onClick={() => setShowComposer(true)}
            className="px-6 py-3 bg-nura-petrol dark:bg-primary text-white rounded-full font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Postar Agora
          </button>
        </div>

        {/* Composer Modal */}
        {showComposer && (
          <PostComposerModal
            onClose={() => setShowComposer(false)}
            onSuccess={handlePostSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-nura-bg/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <button onClick={onBack} className="text-nura-petrol dark:text-white p-2 -ml-2">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">{t.social.community}</h1>
        <button className="text-nura-muted dark:text-gray-400 p-2 -mr-2">
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </header>

      {/* Posts Feed */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nura-petrol dark:border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
                {/* Post Header */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 flex items-center justify-center h-full">person</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {post.profiles?.display_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(post.created_at)}
                    </p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                  </button>
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800">
                    <img src={post.image_url} alt={post.caption || ''} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Post Actions */}
                <div className="p-3">
                  <div className="flex items-center gap-4 mb-2">
                    <button
                      onClick={() => handleLike(post.id)}
                      disabled={likingPostId === post.id}
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[24px] ${post.user_has_liked ? 'text-red-500 fill-current' : ''}`}>
                        {post.user_has_liked ? 'favorite' : 'favorite_border'}
                      </span>
                      <span className="text-sm font-medium">{post.likes}</span>
                    </button>
                    <button
                      onClick={() => setCommentsPostId(post.id)}
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors ml-auto">
                      <span className="material-symbols-outlined text-[24px]">share</span>
                    </button>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold">{post.profiles?.display_name}</span>{' '}
                        {post.caption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={() => loadPosts(page + 1)}
                disabled={loading}
                className="w-full py-3 text-sm font-medium text-nura-petrol dark:text-primary hover:opacity-80 disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Carregar mais'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowComposer(true)}
        className="fixed bottom-24 right-6 size-14 bg-nura-petrol dark:bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Modals */}
      {showComposer && (
        <PostComposerModal
          onClose={() => setShowComposer(false)}
          onSuccess={handlePostSuccess}
        />
      )}

      {commentsPostId && (
        <CommentsModal
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
        />
      )}
    </div>
  );
};

export default SocialFeed;
