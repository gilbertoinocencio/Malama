-- =====================================================
-- NURA COMMUNITY - Sistema Social Completo (CORRIGIDO)
-- =====================================================
-- Versão Idempotente: Pode ser executado múltiplas vezes
-- Execute no Supabase SQL Editor
-- =====================================================

-- ═══════════════════════════════════════
-- 1. CORRIGIR TABELA POSTS EXISTENTE
-- ═══════════════════════════════════════

ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS flow_score INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ═══════════════════════════════════════
-- 2. TABELA LIKES
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at DESC);

-- RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Políticas (Drop antes de criar para evitar erros)
DROP POLICY IF EXISTS "Qualquer um pode ver likes" ON likes;
CREATE POLICY "Qualquer um pode ver likes"
  ON likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuários podem dar like" ON likes;
CREATE POLICY "Usuários podem dar like"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem remover like" ON likes;
CREATE POLICY "Usuários podem remover like"
  ON likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 3. TABELA COMMENTS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at ASC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ver comentários" ON comments;
CREATE POLICY "Qualquer um pode ver comentários"
  ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuários podem comentar" ON comments;
CREATE POLICY "Usuários podem comentar"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem editar comentários" ON comments;
CREATE POLICY "Usuários podem editar comentários"
  ON comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar comentários" ON comments;
CREATE POLICY "Usuários podem deletar comentários"
  ON comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 4. TABELA FOLLOWS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ver follows" ON follows;
CREATE POLICY "Qualquer um pode ver follows"
  ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuários podem seguir" ON follows;
CREATE POLICY "Usuários podem seguir"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Usuários podem deixar de seguir" ON follows;
CREATE POLICY "Usuários podem deixar de seguir"
  ON follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ═══════════════════════════════════════
-- 5. TABELA POST_VIEWS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem registrar visualização" ON post_views;
CREATE POLICY "Usuários podem registrar visualização"
  ON post_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 6. TABELA BOOKMARKS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus bookmarks" ON bookmarks;
CREATE POLICY "Usuários podem ver seus bookmarks"
  ON bookmarks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem bookmarkar" ON bookmarks;
CREATE POLICY "Usuários podem bookmarkar"
  ON bookmarks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 7. TRIGGERS AUTOMÁTICOS
-- ═══════════════════════════════════════

-- Trigger Likes
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_likes ON likes;
CREATE TRIGGER trigger_update_likes
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- ═══════════════════════════════════════
-- 8. POLÍTICAS DA TABELA POSTS
-- ═══════════════════════════════════════

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ver posts" ON posts;
CREATE POLICY "Qualquer um pode ver posts"
  ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuários podem criar posts" ON posts;
CREATE POLICY "Usuários podem criar posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem editar posts" ON posts;
CREATE POLICY "Usuários podem editar posts"
  ON posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar posts" ON posts;
CREATE POLICY "Usuários podem deletar posts"
  ON posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 9. CAMPOS DE PERFIL SOCIAL
-- ═══════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- =====================================================
-- ✅ SUCESSO!
-- =====================================================
-- Tabelas e políticas verificadas/atualizadas.
-- Agora a Comunidade está pronta para uso!
-- =====================================================
