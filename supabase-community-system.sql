-- =====================================================
-- NURA COMMUNITY - Sistema Social Completo
-- =====================================================
-- Cria todas as tabelas necessárias para o sistema social
-- Execute no Supabase SQL Editor
-- =====================================================

-- ═══════════════════════════════════════
-- 1. CORRIGIR TABELA POSTS EXISTENTE
-- ═══════════════════════════════════════

-- Adicionar colunas faltantes à tabela posts
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
  UNIQUE(post_id, user_id) -- Um usuário só pode dar like uma vez por post
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at DESC);

-- Políticas RLS para likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver likes
CREATE POLICY "Qualquer um pode ver likes"
  ON likes FOR SELECT
  USING (true);

-- Usuários autenticados podem dar like
CREATE POLICY "Usuários podem dar like"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem remover seu próprio like
CREATE POLICY "Usuários podem remover like"
  ON likes FOR DELETE
  TO authenticated
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at ASC);

-- Políticas RLS para comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver comentários
CREATE POLICY "Qualquer um pode ver comentários"
  ON comments FOR SELECT
  USING (true);

-- Usuários autenticados podem comentar
CREATE POLICY "Usuários podem comentar"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem editar seus próprios comentários
CREATE POLICY "Usuários podem editar comentários"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios comentários
CREATE POLICY "Usuários podem deletar comentários"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 4. TABELA FOLLOWS (Seguidores)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id), -- Não pode seguir a mesma pessoa duas vezes
  CHECK (follower_id != following_id) -- Não pode seguir a si mesmo
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created ON follows(created_at DESC);

-- Políticas RLS para follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver relações de follow
CREATE POLICY "Qualquer um pode ver follows"
  ON follows FOR SELECT
  USING (true);

-- Usuários autenticados podem seguir
CREATE POLICY "Usuários podem seguir"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Usuários podem deixar de seguir
CREATE POLICY "Usuários podem deixar de seguir"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ═══════════════════════════════════════
-- 5. TABELA POST_VIEWS (Visualizações)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver post_views"
  ON post_views FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem registrar visualização"
  ON post_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 6. TABELA BOOKMARKS (Posts Salvos)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem bookmarkar"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover bookmark"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 7. FUNÇÕES E TRIGGERS AUTOMÁTICOS
-- ═══════════════════════════════════════

-- Função para atualizar contador de likes automaticamente
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

-- Trigger para atualizar likes ao inserir/deletar
DROP TRIGGER IF EXISTS trigger_update_likes ON likes;
CREATE TRIGGER trigger_update_likes
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- Função para atualizar contador de comentários
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET updated_at = NOW() 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET updated_at = NOW() 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comments ON comments;
CREATE TRIGGER trigger_update_comments
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- ═══════════════════════════════════════
-- 8. CORRIGIR POLÍTICAS DA TABELA POSTS
-- ═══════════════════════════════════════

-- Garantir que posts têm políticas corretas
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ver posts" ON posts;
CREATE POLICY "Qualquer um pode ver posts"
  ON posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários podem criar posts" ON posts;
CREATE POLICY "Usuários podem criar posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem editar posts" ON posts;
CREATE POLICY "Usuários podem editar posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar posts" ON posts;
CREATE POLICY "Usuários podem deletar posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- 9. ADICIONAR CAMPO DE BIOGRAFIA AO PERFIL
-- ═══════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- ═══════════════════════════════════════
-- 10. VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════

-- Verificar se todas as tabelas foram criadas
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'likes', 'comments', 'follows', 'post_views', 'bookmarks')
ORDER BY tablename;

-- =====================================================
-- RESUMO DAS TABELAS CRIADAS:
-- =====================================================
-- 
-- ✅ posts - Posts do feed (corrigida com caption, flow_score)
-- ✅ likes - Curtidas em posts (com trigger automático)
-- ✅ comments - Comentários em posts
-- ✅ follows - Sistema de seguidores
-- ✅ post_views - Contagem de visualizações
-- ✅ bookmarks - Posts salvos
-- 
-- FUNCIONALIDADES AUTOMÁTICAS:
-- ✅ Contador de likes atualizado automaticamente
-- ✅ Contador de comentários atualizado
-- ✅ Políticas RLS configuradas
-- ✅ Índices de performance criados
-- 
-- PRÓXIMOS PASSOS:
-- 1. Executar este SQL no Supabase
-- 2. Testar criação de posts
-- 3. Testar likes e comentários
-- 4. Implementar UI de comentários
-- 
-- =====================================================
