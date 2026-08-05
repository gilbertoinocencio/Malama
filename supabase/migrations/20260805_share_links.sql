-- ================================================================
-- MIGRATION: share_links
-- Laço viral do compartilhamento: cada card compartilhado ganha um link
-- público (/s/<id>) com preview próprio em WhatsApp/Instagram/LinkedIn.
--
-- Sem isso o card é um beco sem saída: bonito, mas quem vê não tem como
-- chegar no app.
-- ================================================================

-- 1. Tabela de compartilhamentos
CREATE TABLE IF NOT EXISTS public.shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 'meal' | 'moment' | 'day' | 'hydration' | 'plan'
  type        TEXT NOT NULL,

  -- Snapshot congelado. O card compartilhado NUNCA muda depois de postado,
  -- então nada aqui é join: é cópia do que estava na tela naquele momento.
  image_url   TEXT NOT NULL,
  headline    TEXT,
  subline     TEXT,

  -- Código de indicação de quem compartilhou, quando houver.
  referral_token TEXT,

  views       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shares_user_id_created_idx
  ON public.shares (user_id, created_at DESC);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- 2. Políticas
DROP POLICY IF EXISTS "shares_insert_own"  ON public.shares;
DROP POLICY IF EXISTS "shares_select_any"  ON public.shares;
DROP POLICY IF EXISTS "shares_delete_own"  ON public.shares;

-- Só cria compartilhamento em nome de si mesmo.
CREATE POLICY "shares_insert_own"
  ON public.shares FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Leitura pública é o ponto: o link precisa abrir para quem não tem conta.
-- O id é UUID aleatório — o link é não-listado, não secreto.
CREATE POLICY "shares_select_any"
  ON public.shares FOR SELECT TO public
  USING (true);

-- O dono pode apagar o que compartilhou (direito ao arrependimento).
CREATE POLICY "shares_delete_own"
  ON public.shares FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. Contador de visualizações
-- SECURITY DEFINER porque quem visita o link é anônimo e não pode ter UPDATE
-- na tabela. A função só incrementa: não expõe nem altera mais nada.
CREATE OR REPLACE FUNCTION public.increment_share_views(share_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shares SET views = views + 1 WHERE id = share_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_views(UUID) TO anon, authenticated;

-- 4. Bucket dos cards renderizados (público, máx 5 MB, só imagem)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'share-cards',
  'share-cards',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Postgres não tem CREATE POLICY IF NOT EXISTS; sem o DROP antes, rerodar
-- aborta em "policy already exists" e o SQL Editor para tudo no primeiro erro.
DROP POLICY IF EXISTS "share_cards_upload" ON storage.objects;
DROP POLICY IF EXISTS "share_cards_read"   ON storage.objects;
DROP POLICY IF EXISTS "share_cards_delete" ON storage.objects;

CREATE POLICY "share_cards_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'share-cards'
    AND (storage.foldername(name))[1] = 'shares'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Leitura pública: é ela que faz o preview aparecer no WhatsApp.
CREATE POLICY "share_cards_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'share-cards');

CREATE POLICY "share_cards_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'share-cards'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
