-- ================================================================
-- MIGRATION: fix_community_posts
-- Corrige a tabela posts para suportar posts da comunidade:
--   1. Remove constraint de type que não inclui tipos da comunidade
--   2. Adiciona colunas caption e tags
--   3. Torna content nullable (posts da comunidade não usam)
--   4. Cria bucket community-media com políticas de acesso
-- ================================================================

-- 1. Remove constraint CHECK de type e substitui por uma mais permissiva
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_type_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_type_check
    CHECK (type IN ('meal','streak','hydration','plan','visual','text','photo','video','goal'));

-- 2. Adiciona colunas usadas pelos posts de comunidade
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS caption    TEXT,
  ADD COLUMN IF NOT EXISTS tags       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flow_score NUMERIC DEFAULT 0;

-- 3. Torna content nullable (posts da comunidade não preenchem)
ALTER TABLE public.posts
  ALTER COLUMN content DROP NOT NULL;

-- 4. Cria bucket community-media (público, máx 20 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  20971520,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Postgres não tem CREATE POLICY IF NOT EXISTS: sem o DROP antes, rerodar esta
-- migração aborta em "policy already exists" e, como o SQL Editor para tudo no
-- primeiro erro, os passos seguintes nunca chegam a rodar.
DROP POLICY IF EXISTS "community_media_upload" ON storage.objects;
DROP POLICY IF EXISTS "community_media_read"   ON storage.objects;
DROP POLICY IF EXISTS "community_media_delete" ON storage.objects;

-- 5. Política: usuário autenticado pode fazer upload na própria pasta
CREATE POLICY "community_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = 'community'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 6. Política: leitura pública (bucket já é público)
CREATE POLICY "community_media_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'community-media');

-- 7. Política: dono pode deletar seus próprios arquivos
CREATE POLICY "community_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
