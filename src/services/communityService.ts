import { supabase } from './supabase';

// ================================================================
// TYPES
// ================================================================

export type ReactionType = 'heart' | 'fire' | 'muscle' | 'clap' | 'hug';
export type MilestoneType = 'first_day' | 'one_week' | 'one_month' | 'first_kg' | 'every_5kg' | 'badge_earned';
export type NotificationType = 'comment' | 'reply' | 'reaction' | 'milestone' | 'spotlight' | 'new_follower' | 'doctor_broadcast' | 'badge_earned';
export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'misinformation';

export interface ReactionSummary {
  heart: number;
  fire: number;
  muscle: number;
  clap: number;
  hug: number;
  total: number;
  user_reaction: ReactionType | null;
}

export interface BadgeSummary {
  code: string;
  label: string;
  emoji: string;
  color_hex: string;
  is_featured: boolean;
}

export interface EnrichedPost {
  id: string;
  user_id: string;
  type: string;
  caption: string | null;
  image_url: string | null;
  media_urls: string[];
  video_url: string | null;
  video_status: 'processing' | 'ready' | 'failed';
  content: Record<string, unknown> | null;
  tags: string[];
  is_system_post: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  report_count: number;
  created_at: string;
  reactions: ReactionSummary;
  comments_count: number;
  author: {
    display_name: string;
    avatar_url: string | null;
    featured_badge: BadgeSummary | null;
  };
  is_spotlight?: boolean;
  milestone_data?: Record<string, unknown>;
}

export interface ThreadedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  mentions: string[];
  created_at: string;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
  replies: ThreadedComment[];
}

export interface CommunityNotification {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  post_id?: string;
  comment_id?: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  actor?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface NotificationPreferences {
  on_comment: boolean;
  on_reply: boolean;
  on_reaction: boolean;
  on_milestone: boolean;
  on_spotlight: boolean;
  on_new_follower: boolean;
  on_doctor_broadcast: boolean;
  on_badge_earned: boolean;
  milestone_opt_out: boolean;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  badge: {
    code: string;
    label: string;
    emoji: string;
    color_hex: string;
    is_manual: boolean;
  };
  granted_at: string;
  is_featured: boolean;
}

export interface CommunityProfile {
  id: string;
  display_name: string;
  community_alias: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  glp1_start_date: string | null;
  created_at: string;
  featured_badge: BadgeSummary | null;
  all_badges: BadgeSummary[];
  is_following: boolean;
  treatment_days: number;
}

export interface ProfileSummary {
  id: string;
  display_name: string;
  community_alias: string | null;
  avatar_url: string | null;
  followers_count: number;
  featured_badge: BadgeSummary | null;
  is_following: boolean;
}

export interface ModerationReportItem {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: ReportReason;
  detail: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  post?: Partial<EnrichedPost>;
  reporter?: { display_name: string };
}

// ================================================================
// HELPERS
// ================================================================

function extractTags(caption: string): string[] {
  const matches = caption.match(/#[\wÀ-ú]+/g) ?? [];
  return matches.map(t => t.slice(1).toLowerCase());
}

async function resizeImage(file: File, maxPx = 1200): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width <= maxPx && height <= maxPx) { resolve(file); return; }
      const ratio = Math.min(maxPx / width, maxPx / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    video.src = url;
  });
}

async function getFeaturedBadgeForUser(userId: string): Promise<BadgeSummary | null> {
  const { data } = await supabase
    .from('user_badges')
    .select('is_featured, badges(code, label, emoji, color_hex)')
    .eq('user_id', userId)
    .eq('is_featured', true)
    .single();
  if (!data) return null;
  const b = data.badges as unknown as { code: string; label: string; emoji: string; color_hex: string } | null;
  if (!b) return null;
  return { code: b.code, label: b.label, emoji: b.emoji, color_hex: b.color_hex, is_featured: true };
}

// ================================================================
// SECTION 1: FEED
// ================================================================

export async function getFeed(
  userId: string,
  mode: 'all' | 'following',
  cursor: string | null,
  limit = 15
): Promise<{ posts: EnrichedPost[]; nextCursor: string | null; newPostCount: number }> {
  try {
    let postIds: string[] = [];

    if (mode === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      const followingIds = (follows ?? []).map(f => f.following_id);
      if (followingIds.length === 0) return { posts: [], nextCursor: null, newPostCount: 0 };

      let q = supabase
        .from('posts')
        .select('id')
        .in('user_id', followingIds)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      if (cursor) q = q.lt('created_at', cursor);
      const { data } = await q;
      postIds = (data ?? []).map(p => p.id);
    } else {
      // Mixed algorithm: fetch recent + popular then sort by score
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from('posts')
        .select(`
          id, created_at,
          reactions(reaction_type),
          comments(id)
        `)
        .eq('is_hidden', false)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(60);
      if (cursor) q = q.lt('created_at', cursor);

      const { data: raw } = await q;
      if (!raw) return { posts: [], nextCursor: null, newPostCount: 0 };

      const scored = raw.map(p => {
        const reactionCount = Array.isArray(p.reactions) ? p.reactions.length : 0;
        const commentCount = Array.isArray(p.comments) ? p.comments.length : 0;
        const hoursSince = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
        const score = reactionCount * 2 + commentCount * 1.5 + (1 / (hoursSince + 1)) * 10;
        return { id: p.id, created_at: p.created_at, score };
      });

      scored.sort((a, b) => b.score - a.score);
      postIds = scored.slice(0, limit).map(p => p.id);
    }

    if (postIds.length === 0) return { posts: [], nextCursor: null, newPostCount: 0 };

    const enriched = await enrichPosts(postIds, userId);

    // Spotlight e daily question vão na frente (tratado no componente via getCurrentSpotlight + getDailyQuestion)
    const lastPost = enriched[enriched.length - 1];
    const nextCursor = enriched.length === limit ? lastPost?.created_at ?? null : null;

    return { posts: enriched, nextCursor, newPostCount: 0 };
  } catch {
    return { posts: [], nextCursor: null, newPostCount: 0 };
  }
}

async function enrichPosts(postIds: string[], viewerId: string): Promise<EnrichedPost[]> {
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, user_id, type, caption, image_url, media_urls, video_url, video_status,
      content, tags, is_system_post, is_pinned, is_hidden, report_count, created_at,
      profiles(display_name, avatar_url)
    `)
    .in('id', postIds)
    .eq('is_hidden', false);

  if (!posts || posts.length === 0) return [];

  const [reactionsData, commentsCount, userReactions, featuredBadges] = await Promise.all([
    supabase.from('reactions').select('post_id, reaction_type').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds),
    supabase.from('reactions').select('post_id, reaction_type').in('post_id', postIds).eq('user_id', viewerId),
    Promise.all(posts.map(p => getFeaturedBadgeForUser(p.user_id))),
  ]);

  const reactionMap = new Map<string, ReactionSummary>();
  for (const r of reactionsData.data ?? []) {
    if (!reactionMap.has(r.post_id)) {
      reactionMap.set(r.post_id, { heart: 0, fire: 0, muscle: 0, clap: 0, hug: 0, total: 0, user_reaction: null });
    }
    const s = reactionMap.get(r.post_id)!;
    s[r.reaction_type as ReactionType]++;
    s.total++;
  }
  for (const ur of userReactions.data ?? []) {
    const s = reactionMap.get(ur.post_id);
    if (s) s.user_reaction = ur.reaction_type as ReactionType;
  }

  const commentCountMap = new Map<string, number>();
  for (const c of commentsCount.data ?? []) {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
  }

  return posts.map((p, i) => {
    const profile = p.profiles as unknown as { display_name: string; avatar_url: string | null } | null;
    return {
      id: p.id,
      user_id: p.user_id,
      type: p.type,
      caption: p.caption,
      image_url: p.image_url,
      media_urls: p.media_urls ?? [],
      video_url: p.video_url,
      video_status: (p.video_status as 'processing' | 'ready' | 'failed') ?? 'ready',
      content: p.content,
      tags: p.tags ?? [],
      is_system_post: p.is_system_post ?? false,
      is_pinned: p.is_pinned ?? false,
      is_hidden: p.is_hidden ?? false,
      report_count: p.report_count ?? 0,
      created_at: p.created_at,
      reactions: reactionMap.get(p.id) ?? { heart: 0, fire: 0, muscle: 0, clap: 0, hug: 0, total: 0, user_reaction: null },
      comments_count: commentCountMap.get(p.id) ?? 0,
      author: {
        display_name: profile?.display_name ?? 'Usuário',
        avatar_url: profile?.avatar_url ?? null,
        featured_badge: featuredBadges[i],
      },
    };
  });
}

export async function getNewPostCount(
  since: string,
  mode: 'all' | 'following',
  userId: string
): Promise<number> {
  try {
    if (mode === 'following') {
      const { data: follows } = await supabase
        .from('follows').select('following_id').eq('follower_id', userId);
      const ids = (follows ?? []).map(f => f.following_id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from('posts').select('id', { count: 'exact', head: true })
        .in('user_id', ids).eq('is_hidden', false).gt('created_at', since);
      return count ?? 0;
    }
    const { count } = await supabase
      .from('posts').select('id', { count: 'exact', head: true })
      .eq('is_hidden', false).gt('created_at', since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ================================================================
// SECTION 2: POST CREATION
// ================================================================

export async function uploadMediaFiles(
  userId: string,
  files: File[]
): Promise<{ imageUrls: string[]; videoUrl: string | null }> {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const videoFiles = files.filter(f => f.type.startsWith('video/'));

  const imageUrls: string[] = [];
  for (const file of imageFiles.slice(0, 4)) {
    const resized = await resizeImage(file);
    const path = `community/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from('community-media').upload(path, resized);
    if (!error) {
      const { data } = supabase.storage.from('community-media').getPublicUrl(path);
      imageUrls.push(data.publicUrl);
    }
  }

  let videoUrl: string | null = null;
  if (videoFiles.length > 0) {
    const video = videoFiles[0];
    if (video.size > 50 * 1024 * 1024) throw new Error('video_too_large');
    const duration = await getVideoDuration(video);
    if (duration > 60) throw new Error('video_too_long');
    const path = `community/${userId}/${Date.now()}_video.${video.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('community-media').upload(path, video);
    if (!error) {
      const { data } = supabase.storage.from('community-media').getPublicUrl(path);
      videoUrl = data.publicUrl;
    }
  }

  return { imageUrls, videoUrl };
}

export async function createCommunityPost(
  userId: string,
  data: {
    caption: string;
    files?: File[];
    type?: string;
  }
): Promise<string | null> {
  // Anti-spam: máx 10 posts/dia
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('posts').select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString());
  if ((count ?? 0) >= 10) throw new Error('daily_limit_reached');

  const tags = extractTags(data.caption);
  let imageUrls: string[] = [];
  let videoUrl: string | null = null;
  let videoStatus: 'processing' | 'ready' = 'ready';

  if (data.files && data.files.length > 0) {
    const hasVideo = data.files.some(f => f.type.startsWith('video/'));
    if (hasVideo) videoStatus = 'processing';
    const uploaded = await uploadMediaFiles(userId, data.files);
    imageUrls = uploaded.imageUrls;
    videoUrl = uploaded.videoUrl;
    videoStatus = 'ready'; // upload concluído
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      type: data.type ?? 'text',
      caption: data.caption,
      tags,
      media_urls: imageUrls,
      image_url: imageUrls[0] ?? null,
      video_url: videoUrl,
      video_status: videoStatus,
    })
    .select('id')
    .single();

  if (error || !post) return null;

  // Atualiza contador de posts no perfil (best-effort)
  try {
    await supabase.rpc('increment_posts_count' as string, { p_user_id: userId });
  } catch { /* ignora se RPC não existir */ }

  return post.id;
}

export async function deletePost(userId: string, postId: string): Promise<boolean> {
  const { data: post } = await supabase
    .from('posts')
    .select('user_id, is_system_post, created_at')
    .eq('id', postId)
    .single();

  if (!post || post.user_id !== userId) return false;
  if (post.is_system_post) return false; // marcos não podem ser deletados

  const hoursSince = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  if (hoursSince > 24) return false; // janela de 24h expirada

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  return !error;
}

export async function hideSystemPost(userId: string, postId: string): Promise<boolean> {
  // Marcos: o usuário pode apenas ocultar (is_hidden = true), não deletar
  const { data: post } = await supabase
    .from('posts').select('user_id, is_system_post').eq('id', postId).single();
  if (!post || post.user_id !== userId || !post.is_system_post) return false;
  const { error } = await supabase
    .from('posts').update({ is_hidden: true, hidden_reason: 'user' }).eq('id', postId);
  return !error;
}

// ================================================================
// SECTION 3: REACTIONS
// ================================================================

export async function upsertReaction(
  postId: string,
  userId: string,
  reactionType: ReactionType
): Promise<boolean> {
  const { error } = await supabase.rpc('upsert_reaction', {
    p_post_id: postId,
    p_user_id: userId,
    p_reaction_type: reactionType,
  });
  if (!error) {
    // Notifica o autor do post
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post && post.user_id !== userId) {
      await queueNotification(post.user_id, 'reaction', userId, { post_id: postId });
    }
  }
  return !error;
}

export async function removeReaction(postId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('remove_reaction', { p_post_id: postId, p_user_id: userId });
  return !error;
}

export async function getReactions(postId: string, userId: string): Promise<ReactionSummary> {
  const [allReactions, userReaction] = await Promise.all([
    supabase.from('reactions').select('reaction_type').eq('post_id', postId),
    supabase.from('reactions').select('reaction_type').eq('post_id', postId).eq('user_id', userId).single(),
  ]);

  const summary: ReactionSummary = { heart: 0, fire: 0, muscle: 0, clap: 0, hug: 0, total: 0, user_reaction: null };
  for (const r of allReactions.data ?? []) {
    summary[r.reaction_type as ReactionType]++;
    summary.total++;
  }
  if (userReaction.data) summary.user_reaction = userReaction.data.reaction_type as ReactionType;
  return summary;
}

// ================================================================
// SECTION 4: THREADED COMMENTS
// ================================================================

export async function getThreadedComments(postId: string): Promise<ThreadedComment[]> {
  const { data: comments } = await supabase
    .from('comments')
    .select(`id, post_id, user_id, content, parent_id, mentions, created_at,
             profiles(display_name, avatar_url)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!comments) return [];

  const map = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];

  for (const c of comments) {
    const profile = c.profiles as unknown as { display_name: string; avatar_url: string | null } | null;
    const tc: ThreadedComment = {
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      content: c.content,
      parent_id: c.parent_id ?? null,
      mentions: c.mentions ?? [],
      created_at: c.created_at,
      author: {
        display_name: profile?.display_name ?? 'Usuário',
        avatar_url: profile?.avatar_url ?? null,
      },
      replies: [],
    };
    map.set(c.id, tc);
  }

  for (const tc of map.values()) {
    if (tc.parent_id && map.has(tc.parent_id)) {
      map.get(tc.parent_id)!.replies.push(tc);
    } else {
      roots.push(tc);
    }
  }

  return roots;
}

export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string | null
): Promise<ThreadedComment | null> {
  const mentions = await resolveUserMentions(content);

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content, parent_id: parentId ?? null, mentions })
    .select(`id, post_id, user_id, content, parent_id, mentions, created_at,
             profiles(display_name, avatar_url)`)
    .single();

  if (error || !comment) return null;

  // Notificação ao autor do post ou do comentário pai
  if (parentId) {
    const { data: parent } = await supabase
      .from('comments').select('user_id').eq('id', parentId).single();
    if (parent && parent.user_id !== userId) {
      await queueNotification(parent.user_id, 'reply', userId, { post_id: postId, comment_id: comment.id });
    }
  } else {
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post && post.user_id !== userId) {
      await queueNotification(post.user_id, 'comment', userId, { post_id: postId, comment_id: comment.id });
    }
  }

  const profile = comment.profiles as unknown as { display_name: string; avatar_url: string | null } | null;
  return {
    id: comment.id,
    post_id: comment.post_id,
    user_id: comment.user_id,
    content: comment.content,
    parent_id: comment.parent_id ?? null,
    mentions: comment.mentions ?? [],
    created_at: comment.created_at,
    author: {
      display_name: profile?.display_name ?? 'Usuário',
      avatar_url: profile?.avatar_url ?? null,
    },
    replies: [],
  };
}

export async function resolveUserMentions(text: string): Promise<string[]> {
  const names = [...new Set((text.match(/@([\wÀ-ú]+)/g) ?? []).map(m => m.slice(1)))];
  if (names.length === 0) return [];
  const { data } = await supabase
    .from('profiles').select('id, display_name').in('display_name', names);
  return (data ?? []).map(p => p.id);
}

// ================================================================
// SECTION 5: BADGES
// ================================================================

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('id, badge_id, granted_at, is_featured, badges(code, label, emoji, color_hex, is_manual)')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });
  return (data ?? []).map(ub => ({
    id: ub.id,
    badge_id: ub.badge_id,
    badge: ub.badges as unknown as { code: string; label: string; emoji: string; color_hex: string; is_manual: boolean },
    granted_at: ub.granted_at,
    is_featured: ub.is_featured,
  }));
}

export async function getFeaturedBadge(userId: string): Promise<BadgeSummary | null> {
  return getFeaturedBadgeForUser(userId);
}

export async function setFeaturedBadge(userId: string, badgeId: string): Promise<boolean> {
  // Remove featured de todos e seta no escolhido
  await supabase.from('user_badges').update({ is_featured: false }).eq('user_id', userId);
  const { error } = await supabase
    .from('user_badges').update({ is_featured: true }).eq('user_id', userId).eq('badge_id', badgeId);
  return !error;
}

export async function checkAndGrantAutoBadges(userId: string): Promise<Array<{ code: string; label: string; emoji: string }>> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, weight, glp1_start_date')
    .eq('id', userId)
    .single();

  const { data: allBadges } = await supabase.from('badges').select('*').eq('is_manual', false);
  const { data: existingBadges } = await supabase
    .from('user_badges').select('badge_id, badges(code)').eq('user_id', userId);

  const existingCodes = new Set((existingBadges ?? []).map(ub => (ub.badges as unknown as { code: string })?.code));
  const newlyGranted: Array<{ code: string; label: string; emoji: string }> = [];

  if (!profile || !allBadges) return newlyGranted;

  const daysSinceJoin = (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000;

  // Iniciante: 30 dias
  if (!existingCodes.has('iniciante') && daysSinceJoin >= 30) {
    const badge = allBadges.find(b => b.code === 'iniciante');
    if (badge) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id });
      newlyGranted.push({ code: badge.code, label: badge.label, emoji: badge.emoji });
      await queueNotification(userId, 'badge_earned', null, { data: { badge_code: 'iniciante' } });
    }
  }

  // Consistente: 3 meses (90 dias)
  if (!existingCodes.has('consistente') && daysSinceJoin >= 90) {
    const badge = allBadges.find(b => b.code === 'consistente');
    if (badge) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id });
      newlyGranted.push({ code: badge.code, label: badge.label, emoji: badge.emoji });
      await queueNotification(userId, 'badge_earned', null, { data: { badge_code: 'consistente' } });
    }
  }

  // Em Chama: 3+ posts/semana por 4 semanas
  if (!existingCodes.has('em_chama')) {
    const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000).toISOString();
    const { data: postData } = await supabase
      .from('posts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', fourWeeksAgo)
      .eq('is_system_post', false);

    if (postData && postData.length >= 12) { // 3/semana x 4 semanas = 12
      const badge = allBadges.find(b => b.code === 'em_chama');
      if (badge) {
        await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id });
        newlyGranted.push({ code: badge.code, label: badge.label, emoji: badge.emoji });
        await queueNotification(userId, 'badge_earned', null, { data: { badge_code: 'em_chama' } });
      }
    }
  }

  // Transformação: 10kg+ perdidos
  if (!existingCodes.has('transformacao') && profile.glp1_start_date) {
    const { data: meals } = await supabase
      .from('meals').select('created_at').eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(1);
    const { data: recentProfile } = await supabase
      .from('profiles').select('weight').eq('id', userId).single();
    // Comparação simples pelo campo weight atual vs peso inicial (armazenado em content do perfil)
    // Requer que profile tenha initial_weight ou similar; usando heurística de 10kg
    if (recentProfile && meals && meals.length > 0) {
      // Se chegou aqui e a lógica de perdas está em outro lugar, apenas verificar tag
      // Para garantir: verificar se há milestone every_5kg com kg_marker >= 10
      const { data: milestoneData } = await supabase
        .from('milestones')
        .select('data')
        .eq('user_id', userId)
        .eq('milestone_type', 'every_5kg')
        .order('created_at', { ascending: false })
        .limit(1);
      const maxKg = milestoneData?.[0]?.data?.kg_marker as number | undefined;
      if (maxKg && maxKg >= 10) {
        const badge = allBadges.find(b => b.code === 'transformacao');
        if (badge) {
          await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id });
          newlyGranted.push({ code: badge.code, label: badge.label, emoji: badge.emoji });
          await queueNotification(userId, 'badge_earned', null, { data: { badge_code: 'transformacao' } });
        }
      }
    }
  }

  return newlyGranted;
}

export async function grantManualBadge(
  _adminId: string,
  targetUserId: string,
  badgeCode: string
): Promise<boolean> {
  const { data: badge } = await supabase
    .from('badges').select('id').eq('code', badgeCode).eq('is_manual', true).single();
  if (!badge) return false;
  const { error } = await supabase.from('user_badges').insert({
    user_id: targetUserId,
    badge_id: badge.id,
    granted_by: _adminId,
  });
  if (!error) {
    await queueNotification(targetUserId, 'badge_earned', null, { data: { badge_code: badgeCode } });
  }
  return !error;
}

// ================================================================
// SECTION 6: MILESTONES
// ================================================================

export async function checkMilestones(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, created_at, weight, milestone_opt_out, glp1_start_date')
    .eq('id', userId)
    .single();

  if (!profile || profile.milestone_opt_out) return;

  const { data: existing } = await supabase
    .from('milestones').select('milestone_type, data').eq('user_id', userId);
  const existingTypes = new Set((existing ?? []).map(m => m.milestone_type));

  const daysSinceJoin = (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000;
  const name = profile.display_name ?? 'Usuário';

  // first_day
  if (!existingTypes.has('first_day') && daysSinceJoin < 1) {
    await createMilestonePost(userId, 'first_day', { display_name: name });
  }

  // one_week
  if (!existingTypes.has('one_week') && daysSinceJoin >= 7 && daysSinceJoin < 8) {
    await createMilestonePost(userId, 'one_week', { display_name: name });
  }

  // one_month
  if (!existingTypes.has('one_month') && daysSinceJoin >= 30 && daysSinceJoin < 31) {
    await createMilestonePost(userId, 'one_month', { display_name: name });
  }

  // Marcos de perda de peso: verificar via milestones existentes
  if (profile.weight) {
    const { data: weightMilestones } = await supabase
      .from('milestones')
      .select('data')
      .eq('user_id', userId)
      .in('milestone_type', ['first_kg', 'every_5kg']);

    const handledMarkers = new Set(
      (weightMilestones ?? []).map(m => (m.data as { kg_marker?: number })?.kg_marker ?? 0)
    );

    // first_kg (marcador = 1) — disparado por integração externa com registro de peso
    // Verificação simples: se não tem first_kg e o perfil registrou glp1_start_date
    if (!existingTypes.has('first_kg') && profile.glp1_start_date) {
      // Seria disparado pelo componente que registra peso; aqui apenas garantimos idempotência
    }

    // every_5kg
    for (const marker of [5, 10, 15, 20, 25, 30]) {
      if (!handledMarkers.has(marker)) break; // não pular marcadores
    }
  }
}

export async function recordWeightLossMilestone(
  userId: string,
  kgLost: number
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles').select('display_name, milestone_opt_out').eq('id', userId).single();
  if (!profile || profile.milestone_opt_out) return;

  const name = profile.display_name ?? 'Usuário';
  const { data: existing } = await supabase
    .from('milestones').select('milestone_type, data').eq('user_id', userId);

  const existingTypes = new Set((existing ?? []).map(m => m.milestone_type));
  const handledMarkers = new Set(
    (existing ?? [])
      .filter(m => m.milestone_type === 'every_5kg')
      .map(m => (m.data as { kg_marker?: number })?.kg_marker ?? 0)
  );

  if (!existingTypes.has('first_kg') && kgLost >= 1) {
    await createMilestonePost(userId, 'first_kg', { display_name: name, kg_lost: 1 });
  }

  for (const marker of [5, 10, 15, 20, 25, 30, 40, 50]) {
    if (kgLost >= marker && !handledMarkers.has(marker)) {
      await createMilestonePost(userId, 'every_5kg', { display_name: name, kg_marker: marker });
    }
  }

  await checkAndGrantAutoBadges(userId);
}

export async function createMilestonePost(
  userId: string,
  milestoneType: MilestoneType,
  data: Record<string, unknown>
): Promise<string | null> {
  const captions: Record<MilestoneType, string> = {
    first_day: `🌱 ${data.display_name} acabou de começar a jornada no Malama!`,
    one_week: `🎉 ${data.display_name} completou 1 semana!`,
    one_month: `🏆 ${data.display_name} está há 1 mês na jornada!`,
    first_kg: `⚡ ${data.display_name} perdeu o primeiro quilo!`,
    every_5kg: `🔥 ${data.display_name} perdeu ${data.kg_marker}kg! Incrível!`,
    badge_earned: `🏅 ${data.display_name} conquistou um novo badge!`,
  };

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      type: 'milestone',
      caption: captions[milestoneType],
      is_system_post: true,
      content: { milestone_type: milestoneType, ...data },
      tags: ['marco', milestoneType],
    })
    .select('id')
    .single();

  if (error || !post) return null;

  await supabase.from('milestones').insert({
    user_id: userId,
    milestone_type: milestoneType,
    data,
    post_id: post.id,
  });

  await queueNotification(userId, 'milestone', null, {
    post_id: post.id,
    data: { milestone_type: milestoneType, ...data },
  });

  return post.id;
}

// ================================================================
// SECTION 7: WEEKLY SPOTLIGHT
// ================================================================

export async function runWeeklySpotlight(): Promise<void> {
  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Verificar se já existe spotlight para esta semana
  const { data: existing } = await supabase
    .from('weekly_spotlight').select('id').eq('week_start', weekStartStr).single();
  if (existing) return;

  // Buscar posts da semana com mais reações
  const { data: posts } = await supabase
    .from('posts')
    .select('id, user_id, reactions(id)')
    .eq('is_hidden', false)
    .eq('is_system_post', false)
    .gte('created_at', oneWeekAgo);

  if (!posts || posts.length === 0) return;

  const scored = posts
    .map(p => ({ id: p.id, user_id: p.user_id, count: Array.isArray(p.reactions) ? p.reactions.length : 0 }))
    .sort((a, b) => b.count - a.count);

  const winner = scored[0];
  if (!winner) return;

  const pinnedUntil = new Date();
  pinnedUntil.setHours(pinnedUntil.getHours() + 24);

  await supabase.from('weekly_spotlight').insert({
    post_id: winner.id,
    week_start: weekStartStr,
    pinned_until: pinnedUntil.toISOString(),
  });

  await supabase.from('posts').update({ is_pinned: true }).eq('id', winner.id);

  await queueNotification(winner.user_id, 'spotlight', null, { post_id: winner.id });
}

export async function getCurrentSpotlight(): Promise<EnrichedPost | null> {
  const { data } = await supabase
    .from('weekly_spotlight')
    .select('post_id, pinned_until')
    .gte('pinned_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  const posts = await enrichPosts([data.post_id], '');
  if (posts.length === 0) return null;
  return { ...posts[0], is_spotlight: true };
}

// ================================================================
// SECTION 8: COMMUNITY PROFILE
// ================================================================

export async function getCommunityProfile(
  targetUserId: string,
  viewerUserId: string
): Promise<CommunityProfile | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select(`id, display_name, community_alias, avatar_url, bio,
             is_private, followers_count, following_count, posts_count,
             glp1_start_date, created_at`)
    .eq('id', targetUserId)
    .single();

  if (!profile) return null;

  const isFollowing = viewerUserId
    ? (await supabase.from('follows')
        .select('follower_id').eq('follower_id', viewerUserId).eq('following_id', targetUserId)
        .single()).data !== null
    : false;

  // Perfil privado: retorna minimal para não-seguidores
  if (profile.is_private && !isFollowing && targetUserId !== viewerUserId) {
    return {
      id: profile.id,
      display_name: profile.community_alias ?? profile.display_name,
      community_alias: profile.community_alias,
      avatar_url: profile.avatar_url,
      bio: null,
      is_private: true,
      followers_count: profile.followers_count ?? 0,
      following_count: profile.following_count ?? 0,
      posts_count: profile.posts_count ?? 0,
      glp1_start_date: null,
      created_at: profile.created_at,
      featured_badge: null,
      all_badges: [],
      is_following: false,
      treatment_days: 0,
    };
  }

  const [featuredBadge, allBadgesData] = await Promise.all([
    getFeaturedBadgeForUser(targetUserId),
    getUserBadges(targetUserId),
  ]);

  const treatmentDays = profile.glp1_start_date
    ? Math.floor((Date.now() - new Date(profile.glp1_start_date).getTime()) / 86_400_000)
    : Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000);

  return {
    id: profile.id,
    display_name: profile.community_alias ?? profile.display_name,
    community_alias: profile.community_alias,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    is_private: profile.is_private ?? false,
    followers_count: profile.followers_count ?? 0,
    following_count: profile.following_count ?? 0,
    posts_count: profile.posts_count ?? 0,
    glp1_start_date: profile.glp1_start_date,
    created_at: profile.created_at,
    featured_badge: featuredBadge,
    all_badges: allBadgesData.map(ub => ({
      code: ub.badge.code,
      label: ub.badge.label,
      emoji: ub.badge.emoji,
      color_hex: ub.badge.color_hex,
      is_featured: ub.is_featured,
    })),
    is_following: isFollowing,
    treatment_days: treatmentDays,
  };
}

export async function updateCommunitySettings(
  userId: string,
  settings: { community_alias?: string; is_private?: boolean; milestone_opt_out?: boolean }
): Promise<boolean> {
  const { error } = await supabase.from('profiles').update(settings).eq('id', userId);
  return !error;
}

// ================================================================
// SECTION 9: FOLLOW SYSTEM
// ================================================================

export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase.rpc('follow_user_fn', {
    p_follower: followerId,
    p_following: followingId,
  });
  if (!error) {
    await queueNotification(followingId, 'new_follower', followerId, {});
  }
  return !error;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase.rpc('unfollow_user_fn', {
    p_follower: followerId,
    p_following: followingId,
  });
  return !error;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();
  return !!data;
}

export async function getSuggestedUsers(userId: string): Promise<ProfileSummary[]> {
  const { data: profile } = await supabase
    .from('profiles').select('glp1_start_date').eq('id', userId).single();

  const { data: following } = await supabase
    .from('follows').select('following_id').eq('follower_id', userId);
  const followingIds = new Set((following ?? []).map(f => f.following_id));
  followingIds.add(userId);

  let query = supabase
    .from('profiles')
    .select('id, display_name, community_alias, avatar_url, followers_count, is_private')
    .eq('is_private', false)
    .not('id', 'in', `(${[...followingIds].join(',')})`)
    .order('followers_count', { ascending: false })
    .limit(10);

  // Filtrar por glp1_start_date similar (±30 dias) se disponível
  if (profile?.glp1_start_date) {
    const start = new Date(profile.glp1_start_date);
    const from = new Date(start.getTime() - 30 * 86_400_000).toISOString().split('T')[0];
    const to = new Date(start.getTime() + 30 * 86_400_000).toISOString().split('T')[0];
    query = query.gte('glp1_start_date', from).lte('glp1_start_date', to);
  }

  const { data: users } = await query;
  if (!users) return [];

  return Promise.all(users.map(async u => ({
    id: u.id,
    display_name: u.community_alias ?? u.display_name,
    community_alias: u.community_alias,
    avatar_url: u.avatar_url,
    followers_count: u.followers_count ?? 0,
    featured_badge: await getFeaturedBadgeForUser(u.id),
    is_following: false,
  })));
}

// ================================================================
// SECTION 10: SEARCH
// ================================================================

export async function searchPosts(
  query: string,
  viewerUserId: string,
  cursor?: string | null
): Promise<{ posts: EnrichedPost[]; nextCursor: string | null }> {
  const isTag = query.startsWith('#');

  if (isTag) {
    return searchByTag(query.slice(1), viewerUserId, cursor);
  }

  let q = supabase
    .from('posts')
    .select('id')
    .eq('is_hidden', false)
    .textSearch('caption', query, { config: 'portuguese' })
    .order('created_at', { ascending: false })
    .limit(15);

  if (cursor) q = q.lt('created_at', cursor);
  const { data } = await q;
  if (!data || data.length === 0) return { posts: [], nextCursor: null };

  const posts = await enrichPosts(data.map(p => p.id), viewerUserId);
  const nextCursor = posts.length === 15 ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

export async function searchByTag(
  tag: string,
  viewerUserId: string,
  cursor?: string | null
): Promise<{ posts: EnrichedPost[]; nextCursor: string | null }> {
  let q = supabase
    .from('posts')
    .select('id, created_at')
    .eq('is_hidden', false)
    .contains('tags', [tag.toLowerCase()])
    .order('created_at', { ascending: false })
    .limit(15);

  if (cursor) q = q.lt('created_at', cursor);
  const { data } = await q;
  if (!data || data.length === 0) return { posts: [], nextCursor: null };

  const posts = await enrichPosts(data.map(p => p.id), viewerUserId);
  const nextCursor = posts.length === 15 ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

export async function searchUsers(query: string, limit = 10): Promise<ProfileSummary[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, community_alias, avatar_url, followers_count')
    .or(`display_name.ilike.%${query}%,community_alias.ilike.%${query}%`)
    .eq('is_private', false)
    .limit(limit);

  if (!data) return [];
  return Promise.all(data.map(async u => ({
    id: u.id,
    display_name: u.community_alias ?? u.display_name,
    community_alias: u.community_alias,
    avatar_url: u.avatar_url,
    followers_count: u.followers_count ?? 0,
    featured_badge: await getFeaturedBadgeForUser(u.id),
    is_following: false,
  })));
}

// ================================================================
// SECTION 11: MODERATION
// ================================================================

export async function reportPost(
  postId: string,
  reporterId: string,
  reason: ReportReason,
  detail?: string
): Promise<boolean> {
  const { error } = await supabase.rpc('report_post_fn', {
    p_post_id: postId,
    p_user_id: reporterId,
    p_reason: reason,
    p_detail: detail ?? null,
  });
  return !error;
}

export async function getModerationQueue(
  status: 'pending' | 'reviewed' | 'dismissed' = 'pending',
  limit = 20,
  offset = 0
): Promise<{ reports: ModerationReportItem[]; total: number }> {
  const { data, count } = await supabase
    .from('post_reports')
    .select(`id, post_id, reporter_id, reason, detail, status, created_at,
             profiles!post_reports_reporter_id_fkey(display_name),
             posts(id, caption, image_url, user_id, report_count)`,
            { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const reports: ModerationReportItem[] = (data ?? []).map(r => ({
    id: r.id,
    post_id: r.post_id,
    reporter_id: r.reporter_id,
    reason: r.reason as ReportReason,
    detail: r.detail,
    status: r.status as 'pending' | 'reviewed' | 'dismissed',
    created_at: r.created_at,
    reporter: r.profiles as unknown as { display_name: string } | undefined,
    post: r.posts as Partial<EnrichedPost> | undefined,
  }));

  return { reports, total: count ?? 0 };
}

export async function resolveReport(
  adminId: string,
  reportId: string,
  action: 'remove' | 'dismiss'
): Promise<boolean> {
  const { data: report } = await supabase
    .from('post_reports').select('post_id, reason').eq('id', reportId).single();
  if (!report) return false;

  await supabase
    .from('post_reports')
    .update({ status: action === 'remove' ? 'reviewed' : 'dismissed', reviewed_by: adminId })
    .eq('id', reportId);

  if (action === 'remove') {
    await supabase
      .from('posts')
      .update({ is_hidden: true, hidden_reason: 'admin' })
      .eq('id', report.post_id);

    const { data: post } = await supabase
      .from('posts').select('user_id').eq('id', report.post_id).single();
    if (post) {
      await queueNotification(post.user_id, 'milestone', adminId, {
        post_id: report.post_id,
        data: { removed: true, reason: report.reason },
      });
    }
  } else {
    // Dismiss: unhide se estava oculto por reports
    await supabase
      .from('posts')
      .update({ is_hidden: false, hidden_reason: null })
      .eq('id', report.post_id)
      .eq('hidden_reason', 'reports');

    await supabase
      .from('post_reports')
      .update({ status: 'dismissed', reviewed_by: adminId })
      .eq('post_id', report.post_id);
  }

  return true;
}

// ================================================================
// SECTION 12: NOTIFICATIONS
// ================================================================

export async function queueNotification(
  recipientId: string,
  type: NotificationType,
  actorId: string | null,
  payload: { post_id?: string; comment_id?: string; data?: Record<string, unknown> }
): Promise<void> {
  if (!recipientId) return;

  // Verificar preferências
  const { data: prefs } = await supabase
    .from('notification_preferences').select('*').eq('user_id', recipientId).single();

  const prefKey = `on_${type}` as keyof NotificationPreferences;
  if (prefs && prefs[prefKey] === false) return;

  await supabase.from('community_notifications').insert({
    recipient_id: recipientId,
    actor_id: actorId,
    type,
    post_id: payload.post_id ?? null,
    comment_id: payload.comment_id ?? null,
    data: payload.data ?? {},
  });
}

export async function getNotifications(
  userId: string,
  cursor?: string | null
): Promise<{ notifications: CommunityNotification[]; unreadCount: number; nextCursor: string | null }> {
  let q = supabase
    .from('community_notifications')
    .select(`id, type, actor_id, post_id, comment_id, data, is_read, created_at,
             profiles!community_notifications_actor_id_fkey(display_name, avatar_url)`)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) q = q.lt('created_at', cursor);
  const { data } = await q;

  const { count: unreadCount } = await supabase
    .from('community_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  const notifications: CommunityNotification[] = (data ?? []).map(n => ({
    id: n.id,
    type: n.type as NotificationType,
    actor_id: n.actor_id,
    post_id: n.post_id ?? undefined,
    comment_id: n.comment_id ?? undefined,
    data: n.data ?? {},
    is_read: n.is_read,
    created_at: n.created_at,
    actor: n.profiles as unknown as { display_name: string; avatar_url: string | null } | undefined,
  }));

  const nextCursor = notifications.length === 20 ? notifications[notifications.length - 1].created_at : null;
  return { notifications, unreadCount: unreadCount ?? 0, nextCursor };
}

export async function markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
  let q = supabase.from('community_notifications').update({ is_read: true }).eq('recipient_id', userId);
  if (notificationIds && notificationIds.length > 0) {
    q = q.in('id', notificationIds);
  }
  await q;
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const defaults: NotificationPreferences = {
    on_comment: true, on_reply: true, on_reaction: true, on_milestone: true,
    on_spotlight: true, on_new_follower: true, on_doctor_broadcast: true,
    on_badge_earned: true, milestone_opt_out: false,
  };
  const { data } = await supabase
    .from('notification_preferences').select('*').eq('user_id', userId).single();
  return data ? { ...defaults, ...data } : defaults;
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<boolean> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() });
  return !error;
}

export async function sendDoctorBroadcast(
  senderId: string,
  message: string,
  targetAudience: 'all' | 'glp1' = 'all'
): Promise<{ sent: number }> {
  let q = supabase.from('profiles').select('id');
  if (targetAudience === 'glp1') q = q.eq('glp1_mode', true);

  const { data: users } = await q;
  if (!users || users.length === 0) return { sent: 0 };

  const { data: prefData } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('on_doctor_broadcast', false);
  const optedOut = new Set((prefData ?? []).map(p => p.user_id));

  const targets = users.filter(u => !optedOut.has(u.id));
  const batchSize = 1000;

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    await supabase.from('community_notifications').insert(
      batch.map(u => ({
        recipient_id: u.id,
        actor_id: senderId,
        type: 'doctor_broadcast',
        data: { message },
      }))
    );
  }

  return { sent: targets.length };
}

// ================================================================
// SECTION 13: DAILY QUESTION
// ================================================================

const DAILY_QUESTIONS = [
  'O que você comeu hoje? 🍽️',
  'Como está sua hidratação hoje? 💧',
  'Qual foi seu maior desafio alimentar esta semana?',
  'Compartilhe uma receita saudável que você gostou! 🥗',
  'Como você está se sentindo com o tratamento? 💪',
  'Qual dica de alimentação você daria para quem está começando?',
  'Teve alguma conquista essa semana? Conte para a gente! ✨',
];

const SYSTEM_USER_ID = import.meta.env.VITE_COMMUNITY_SYSTEM_USER_ID as string | undefined;

export async function getDailyQuestion(viewerUserId: string): Promise<EnrichedPost | null> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Busca pergunta do dia já existente (independente de quem criou)
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('is_pinned', true)
    .eq('is_system_post', true)
    .gte('created_at', todayStart.toISOString())
    .single();

  if (existing) {
    const posts = await enrichPosts([existing.id], viewerUserId);
    return posts[0] ?? null;
  }

  // Só cria nova pergunta do dia se o sistema estiver configurado
  if (!SYSTEM_USER_ID) return null;

  const dayIndex = new Date().getDay();
  const question = DAILY_QUESTIONS[dayIndex % DAILY_QUESTIONS.length];

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: SYSTEM_USER_ID,
      type: 'text',
      caption: question,
      is_pinned: true,
      is_system_post: true,
      tags: ['perguntadodia'],
    })
    .select('id')
    .single();

  if (error || !post) return null;
  const posts = await enrichPosts([post.id], viewerUserId);
  return posts[0] ?? null;
}
