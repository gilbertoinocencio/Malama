import React, { useEffect, useState } from 'react';
import { AppView } from '../types';
import { USER_AVATAR } from '../constants';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';

interface SocialFeedProps {
  onNavigate: (view: AppView) => void;
  onFabClick: () => void;
  activeView: AppView;
  onBack: () => void;
}

interface Post {
  id: string;
  image_url: string;
  caption: string;
  likes_count: number;
  created_at: string;
  profiles: { display_name: string; avatar_url: string; level: string };
  user_has_liked?: boolean;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ onNavigate, onFabClick, activeView, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [user]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
                *,
                profiles (display_name, avatar_url, level)
            `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data as any || []);
    } catch (e) {
      console.error("Error loading posts", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_has_liked: true } : p
    ));

    if (!user) return;

    try {
      const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      if (error && error.code !== '23505') throw error;
    } catch (e) {
      console.error("Error liking post:", e);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-nura-bg dark:bg-background-dark font-display animate-fade-in transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-nura-border dark:border-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2 text-nura-main dark:text-white"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h1 className="text-nura-main dark:text-white text-xl font-bold tracking-tight">{t.social.community}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-nura-petrol/10 dark:bg-primary/10 flex items-center justify-center text-nura-petrol dark:text-primary">
            <span className="material-symbols-outlined text-lg">spa</span>
          </div>
        </div>
        <div className="flex w-10 items-center justify-end">
          <button className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-nura-main dark:text-white">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </header>

      {/* StoryCarousel */}
      <div className="flex w-full overflow-x-auto no-scrollbar px-4 py-4 space-x-4">
        <div className="flex flex-col justify-start gap-2 min-w-[80px] text-center cursor-pointer group">
          <div
            onClick={onFabClick}
            className="relative w-full aspect-[3/4] rounded-2xl bg-nura-card dark:bg-surface-dark border border-nura-border dark:border-white/10 flex items-center justify-center overflow-hidden transition-transform group-active:scale-95"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-50"
              style={{ backgroundImage: `url("${USER_AVATAR}")` }}
            ></div>
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="size-10 rounded-full bg-nura-petrol dark:bg-primary flex items-center justify-center text-white shadow-lg border-2 border-nura-bg dark:border-background-dark z-10">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
          </div>
          <p className="text-nura-main dark:text-white text-xs font-semibold truncate">{t.social.myFlow}</p>
        </div>

        {/* Placeholder stories */}
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col justify-start gap-2 min-w-[80px] text-center cursor-pointer group opacity-50">
            <div className="w-full relative aspect-[3/4] rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Community Feed Grid */}
      <div className="px-4 py-2">
        <h2 className="text-nura-main dark:text-white text-xl font-bold leading-tight mb-3">{t.social.feedTitle}</h2>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-2 border-nura-petrol dark:border-primary rounded-full border-t-transparent"></div></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-nura-muted dark:text-gray-400">
            <p>{t.social.noPosts}</p>
            <button onClick={onFabClick} className="mt-4 text-nura-petrol dark:text-primary font-bold">{t.social.postNow}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post) => (
              <div key={post.id} className="relative rounded-2xl overflow-hidden aspect-[4/5] group cursor-pointer shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${post.image_url}')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-white text-sm font-bold leading-tight line-clamp-2 mb-1">{post.caption}</p>
                      <p className="text-gray-300 text-[10px]">@{post.profiles?.display_name || 'user'}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                      className={`size-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${post.user_has_liked ? 'bg-nura-petrol text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">water_drop</span>
                      <span className="ml-0.5 text-[10px]">{post.likes_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};