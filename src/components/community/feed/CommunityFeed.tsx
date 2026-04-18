import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getFeed, getCurrentSpotlight, getDailyQuestion, checkMilestones, checkAndGrantAutoBadges,
  getNewPostCount,
  type EnrichedPost,
} from '../../../services/communityService';
import { AppView } from '../../../types';
import { FeedHeader } from './FeedHeader';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import { SpotlightCard } from './SpotlightCard';
import { DailyQuestionCard } from './DailyQuestionCard';
import { NewPostsBanner } from './NewPostsBanner';
import { CommentsSheetV2 } from '../comments/CommentsSheetV2';
import { PostComposerV2 } from '../post/PostComposerV2';
import { ReportSheet } from '../moderation/ReportSheet';
import toast from 'react-hot-toast';

interface CommunityFeedProps {
  onNavigate: (view: AppView, userId?: string) => void;
  onBack: () => void;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [spotlight, setSpotlight] = useState<EnrichedPost | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<EnrichedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [newPostCount, setNewPostCount] = useState(0);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const lastFetchTime = useRef<string>(new Date().toISOString());
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (reset = false) => {
    if (!user) return;
    if (reset) { setLoading(true); setCursor(null); setHasMore(true); }
    const c = reset ? null : cursor;
    const result = await getFeed(user.id, mode, c);
    if (reset) {
      setPosts(result.posts);
      lastFetchTime.current = new Date().toISOString();
      setNewPostCount(0);
    } else {
      setPosts(prev => [...prev, ...result.posts]);
    }
    setCursor(result.nextCursor);
    setHasMore(result.nextCursor !== null);
    setLoading(false);
    setLoadingMore(false);
  }, [user, mode, cursor]);

  useEffect(() => {
    loadFeed(true);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    getCurrentSpotlight().then(setSpotlight);
    getDailyQuestion(user.id).then(setDailyQuestion);
    checkMilestones(user.id);
    checkAndGrantAutoBadges(user.id).then(newBadges => {
      newBadges.forEach(b => toast.success(`${b.emoji} Badge desbloqueado: ${b.label}!`));
    });
  }, [user]);

  // Polling para novos posts a cada 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const count = await getNewPostCount(lastFetchTime.current, mode, user.id);
      setNewPostCount(count);
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, mode]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true);
        loadFeed(false);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadFeed]);

  const handleRefresh = () => { loadFeed(true); };

  const handlePostCreated = () => {
    setComposerOpen(false);
    loadFeed(true);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleNavigateToProfile = (userId: string) => {
    onNavigate(AppView.COMMUNITY_PROFILE, userId);
  };

  if (!user || !profile) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <FeedHeader
        mode={mode}
        onModeChange={m => setMode(m)}
        onNavigate={onNavigate}
        userId={user.id}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col px-3 py-3 gap-2 max-w-lg mx-auto pb-24">
          <NewPostsBanner count={newPostCount} onRefresh={handleRefresh} />

          {spotlight && (
            <SpotlightCard
              post={spotlight}
              onOpenComments={setCommentsPostId}
              onNavigateToProfile={handleNavigateToProfile}
            />
          )}

          {dailyQuestion && (
            <DailyQuestionCard
              post={dailyQuestion}
              onOpenComments={setCommentsPostId}
            />
          )}

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-3">🌱</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {mode === 'following'
                  ? 'Siga outros usuários para ver seus posts aqui.'
                  : 'Seja o primeiro a postar na comunidade!'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user.id}
                  onOpenComments={setCommentsPostId}
                  onOpenReport={setReportPostId}
                  onNavigateToProfile={handleNavigateToProfile}
                  onNavigate={onNavigate}
                  onTagClick={tag => onNavigate(AppView.COMMUNITY_SEARCH)}
                  onDeleted={handlePostDeleted}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Sentinel para infinite scroll */}
          <div ref={loaderRef} className="h-8 flex items-center justify-center">
            {loadingMore && <PostCardSkeleton />}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs text-gray-400 py-4">Você viu tudo por aqui! 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* FAB de novo post */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#2ECC71] rounded-full shadow-lg
          shadow-[#2ECC71]/40 flex items-center justify-center z-30 active:scale-95 transition-transform"
      >
        <Plus size={24} className="text-white" />
      </button>

      {composerOpen && (
        <PostComposerV2
          userId={user.id}
          onClose={() => setComposerOpen(false)}
          onPublished={handlePostCreated}
        />
      )}

      {commentsPostId && (
        <CommentsSheetV2
          postId={commentsPostId}
          currentUserId={user.id}
          onClose={() => setCommentsPostId(null)}
        />
      )}

      {reportPostId && (
        <ReportSheet
          postId={reportPostId}
          reporterId={user.id}
          onClose={() => setReportPostId(null)}
        />
      )}
    </div>
  );
};
