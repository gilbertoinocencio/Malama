-- ============================================================================
-- meal-photos: restaura as policies de upload/leitura da foto de refeição.
--
-- Sintoma: desde 29/07/2026 nenhum objeto novo entrou no bucket `meal-photos`
-- (último upload 29/07 13:18) e as refeições passaram a gravar o data URI
-- base64 dentro de `meals.image_url` — 112 KB a 246 KB por linha. Quando esse
-- payload cresce, o INSERT da refeição falha e o app mostra
-- "Erro ao registrar refeição. Tente novamente."
--
-- Causa: o bucket existe e é público (`file_size_limit` e `allowed_mime_types`
-- nulos), então o que sobra é RLS em storage.objects — as policies do
-- meal-photos (criadas em supabase-schema.sql) não estão mais valendo. Nenhuma
-- migration do repositório as recria, por isso este arquivo.
--
-- Idempotente: pode rodar mais de uma vez com segurança.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Remove qualquer versão anterior (nomes antigos incluídos) para não duplicar.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') ILIKE '%meal-photos%' OR coalesce(with_check, '') ILIKE '%meal-photos%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- A pasta é sempre o auth.uid() do dono (ver MealService.uploadMealImage).
CREATE POLICY meal_photos_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'meal-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket é público: a URL pública precisa de leitura liberada.
CREATE POLICY meal_photos_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'meal-photos');

CREATE POLICY meal_photos_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'meal-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY meal_photos_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'meal-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- OPCIONAL — limpeza das linhas que guardaram base64 no lugar da URL.
-- Só rode se aceitar PERDER essas fotos (elas não existem no storage; o base64
-- na coluna é a única cópia). Deixa o `select *` em meals leve de novo.
--
-- UPDATE public.meals SET image_url = NULL WHERE image_url LIKE 'data:%';
-- ---------------------------------------------------------------------------
