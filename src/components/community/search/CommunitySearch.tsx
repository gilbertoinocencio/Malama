import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { searchPosts, searchUsers, type EnrichedPost, type ProfileSummary } from '../../../services/communityService';
import { AppView } from '../../../types';
import { PostCard } from '../feed/PostCard';
import { PostCardSkeleton } from '../feed/PostCardSkeleton';
import { BadgeChip } from '../badges/BadgeChip';
import { FollowButton } from '../profile/FollowButton';

interface CommunitySearchProps {
  onBack: () => void;
  onNavigate: (view: AppView, userId?: string) => void;
  initialTag?: string;
}

export const CommunitySearch: React.FC<CommunitySearchProps> = ({ onBack, onNavigate, initialTag }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState(initialTag ? `#${initialTag}` : '');
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [users, setUsers] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user) { setPosts([]); setUsers([]); return; }
    setLoading(true);
    const [postsResult, usersResult] = await Promise.all([
      searchPosts(q, user.id),
      searchUsers(q, 10, user.id),
    ]);
    setPosts(postsResult.posts);
    setUsers(usersResult);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-background-dark">
      {/* Header com input */}
      <div className="bg-white dark:bg-background-dark border-b border-gray-100 dark:border-white/10 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="shrink-0">
            <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-Malama-dark rounded-full px-3 py-2">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar posts, #tags ou usuários…"
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex px-4 pb-2 gap-1">
          {(['posts', 'users'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-medium px-4 py-1.5 rounded-full transition-all ${
                activeTab === tab
                  ? 'bg-Malama-petrol text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tab === 'posts' ? 'Posts' : 'Usuários'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 max-w-lg mx-auto w-full pb-24">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-gray-400 text-sm">Digite para buscar posts, #tags ou usuários</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <PostCardSkeleton key={i} />)}</div>
        ) : activeTab === 'posts' ? (
          posts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum post encontrado.</p>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user.id}
                  onOpenComments={setCommentsPostId}
                  onOpenReport={setReportPostId}
                  onNavigateToProfile={uid => onNavigate(AppView.COMMUNITY_PROFILE, uid)}
                  onNavigate={onNavigate}
                  onTagClick={tag => setQuery(`#${tag}`)}
                  onDeleted={id => setPosts(prev => prev.filter(p => p.id !== id))}
                />
              ))}
            </div>
          )
        ) : (
          users.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-white dark:bg-surface-dark rounded-2xl p-3
                    border border-gray-100 dark:border-white/10"
                >
                  <button
                    onClick={() => onNavigate(AppView.COMMUNITY_PROFILE, u.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-Malama-petrol/20 flex items-center justify-center text-[#2ECC71] font-bold shrink-0">
                        {u.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.display_name}</p>
                      <p className="text-xs text-gray-400">{u.followers_count} seguidores</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.featured_badge && <BadgeChip badge={u.featured_badge} size="sm" />}
                    <FollowButton
                      currentUserId={user.id}
                      targetUserId={u.id}
                      initialIsFollowing={u.is_following}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Lazy imports de modais se necessário */}
      {commentsPostId && (
        <React.Suspense fallback={null}>
          {React.createElement(
            React.lazy(() => import('../comments/CommentsSheetV2').then(m => ({ default: m.CommentsSheetV2 }))),
            { postId: commentsPostId, currentUserId: user.id, onClose: () => setCommentsPostId(null) }
          )}
        </React.Suspense>
      )}
    </div>
  );
};
