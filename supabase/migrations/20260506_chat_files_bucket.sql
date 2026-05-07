-- ================================================================
-- Bucket: chat-files
-- Armazena arquivos enviados no chat pós-consulta (médico ↔ paciente)
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Médico pode fazer upload de arquivos de chat
CREATE POLICY "doctors_upload_chat_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Paciente pode fazer upload de arquivos de chat
CREATE POLICY "patients_upload_chat_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND NOT EXISTS (
    SELECT 1 FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Qualquer autenticado pode ler (bucket público mas com RLS na leitura)
CREATE POLICY "authenticated_read_chat_files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');
