/**
 * PostService - Serviço para gerenciamento de posts sociais
 * Gerencia posts, likes, comentários, follows e bookmarks
 */

import { supabase } from './supabase';

export interface Post {
  id: string;
  user_id: string;
  type: 'meal' | 'streak' | 'hydration' | 'plan' | 'visual' | 'text' | 'photo';
  content?: any;
  image_url?: string;
  caption?: string;
  flow_score?: number;
  likes: number;
  tags?: string[];
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    level?: string;
  };
  user_has_liked?: boolean;
  comments_count?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
}

export interface FollowRelation {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export const PostService = {
  // ═══════════════════════════════════════
  // POSTS
  // ═══════════════════════════════════════

  /**
   * Criar um novo post
   */
  async createPost(
    userId: string,
    data: {
      type: Post['type'];
      caption?: string;
      image_url?: string;
      content?: any;
      flow_score?: number;
      tags?: string[];
    }
  ): Promise<string | null> {
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        type: data.type,
        caption: data.caption,
        image_url: data.image_url,
        content: data.content || {},
        flow_score: data.flow_score,
        tags: data.tags || [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao criar post:', error);
      return null;
    }

    // profiles.posts_count é mantido pelo trigger trg_sync_posts_count
    // (migration 20260817) — cobre criação e exclusão sem depender do cliente.

    return post?.id || null;
  },

  /**
   * Buscar posts do feed (com paginação)
   */
  async getFeedPosts(
    page: number = 0,
    limit: number = 20,
    userId?: string
  ): Promise<Post[]> {
    const offset = page * limit;

    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url,
          level
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar posts:', error);
      return [];
    }

    // Se usuário está logado, verificar quais posts ele já deu like
    if (userId && data.length > 0) {
      const postIds = data.map((p: any) => p.id);
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds);

      const likedPostIds = new Set(likes?.map((l: any) => l.post_id) || []);
      return data.map((post: any) => ({
        ...post,
        user_has_liked: likedPostIds.has(post.id),
      }));
    }

    return data || [];
  },

  /**
   * Buscar posts de um usuário específico
   */
  async getUserPosts(userId: string, page: number = 0, limit: number = 20): Promise<Post[]> {
    const offset = page * limit;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url,
          level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Erro ao buscar posts do usuário:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Deletar um post
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erro ao deletar post:', error);
      return false;
    }

    return true;
  },

  // ═══════════════════════════════════════
  // LIKES
  // ═══════════════════════════════════════

  /**
   * Dar like em um post
   */
  async likePost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: userId });

    if (error) {
      console.error('❌ Erro ao dar like:', error);
      return false;
    }

    return true;
  },

  /**
   * Remover like de um post
   */
  async unlikePost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erro ao remover like:', error);
      return false;
    }

    return true;
  },

  /**
   * Verificar se usuário já deu like no post
   */
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error) return false;
    return !!data;
  },

  // ═══════════════════════════════════════
  // COMMENTS
  // ═══════════════════════════════════════

  /**
   * Adicionar comentário em um post
   */
  async addComment(
    postId: string,
    userId: string,
    content: string
  ): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
      })
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao adicionar comentário:', error);
      return null;
    }

    return data;
  },

  /**
   * Buscar comentários de um post
   */
  async getComments(postId: string, limit: number = 50): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar comentários:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Deletar comentário
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erro ao deletar comentário:', error);
      return false;
    }

    return true;
  },

  // ═══════════════════════════════════════
  // FOLLOWS
  // ═══════════════════════════════════════

  /**
   * Seguir um usuário
   */
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) {
      console.error('❌ Erro ao seguir usuário:', error);
      return false;
    }

    return true;
  },

  /**
   * Deixar de seguir um usuário
   */
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('❌ Erro ao deixar de seguir:', error);
      return false;
    }

    return true;
  },

  /**
   * Verificar se está seguindo alguém
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (error) return false;
    return !!data;
  },

  /**
   * Buscar seguidores de um usuário
   */
  async getFollowers(userId: string): Promise<FollowRelation[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, following_id, created_at')
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar seguidores:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Buscar quem o usuário está seguindo
   */
  async getFollowing(userId: string): Promise<FollowRelation[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, following_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar following:', error);
      return [];
    }

    return data || [];
  },

  // ═══════════════════════════════════════
  // BOOKMARKS
  // ═══════════════════════════════════════

  /**
   * Salvar post (bookmark)
   */
  async bookmarkPost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('bookmarks')
      .insert({ post_id: postId, user_id: userId });

    if (error) {
      console.error('❌ Erro ao salvar post:', error);
      return false;
    }

    return true;
  },

  /**
   * Remover bookmark
   */
  async removeBookmark(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erro ao remover bookmark:', error);
      return false;
    }

    return true;
  },

  /**
   * Buscar posts salvos do usuário
   */
  async getBookmarks(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        post_id,
        posts (
          *,
          profiles:user_id (
            display_name,
            avatar_url,
            level
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar bookmarks:', error);
      return [];
    }

    return data?.map((item: any) => item.posts) || [];
  }
};

export default PostService;
