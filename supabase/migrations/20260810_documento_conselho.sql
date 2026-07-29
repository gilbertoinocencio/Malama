-- =====================================================
-- Malama — Documento de comprovação do conselho profissional
-- Migration: 20260810_documento_conselho.sql
--
-- Aplicar via SQL Editor.
--
-- POR QUE ISTO EXISTE
-- O CRM tem validação por API do CFM (edge function validate-crm). O CRP e o
-- e-Psi não têm API pública equivalente: hoje o psicólogo apenas DECLARA que
-- tem cadastro ativo, e o admin aprova sem nada para conferir.
--
-- Com o anexo, a conferência deixa de ser confiança e passa a ser documental:
-- o profissional envia a carteira do conselho e/ou o comprovante de e-Psi, e
-- o admin abre o arquivo antes de liberar.
--
-- Bucket próprio, com políticas declaradas aqui — diferente de
-- doctors-certificates, que foi criado fora de migração e cujas permissões
-- não estão versionadas.
-- =====================================================

-- ── 1. Coluna no cadastro do profissional ────────────────────────
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS documento_conselho_path TEXT,
  ADD COLUMN IF NOT EXISTS documento_conselho_enviado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.doctors.documento_conselho_path IS
  'Caminho no bucket profissional-documentos. Carteira do conselho e/ou comprovante de e-Psi. Guardamos o PATH, não a URL: link assinado expira.';

-- ── 2. Bucket privado ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profissional-documentos',
  'profissional-documentos',
  false,                           -- privado: documento de identificação profissional
  10485760,                        -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Pasta = auth.uid() do profissional. O cadastro acontece antes de existir
-- linha em doctors, então a pasta não pode depender de doctors.id.
DROP POLICY IF EXISTS "prof_doc_upload_own" ON storage.objects;
CREATE POLICY "prof_doc_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profissional-documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "prof_doc_update_own" ON storage.objects;
CREATE POLICY "prof_doc_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profissional-documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura: o próprio profissional e o super admin (que faz a conferência).
DROP POLICY IF EXISTS "prof_doc_read_own" ON storage.objects;
CREATE POLICY "prof_doc_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profissional-documentos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_super_admin()
    )
  );

-- ── 3. Link assinado para o admin conferir ───────────────────────
-- O admin precisa abrir o arquivo, mas o path sozinho não abre bucket
-- privado. Esta RPC existe para o painel pedir a URL no momento do clique,
-- em vez de guardar link assinado no banco (que expira e vaza se vazar a linha).
DROP FUNCTION IF EXISTS admin_documento_conselho_path(UUID);

CREATE OR REPLACE FUNCTION admin_documento_conselho_path(p_doctor_id UUID)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN is_super_admin() THEN
      (SELECT documento_conselho_path FROM public.doctors WHERE id = p_doctor_id)
    ELSE NULL
  END;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION admin_documento_conselho_path(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_documento_conselho_path(UUID) TO authenticated;
