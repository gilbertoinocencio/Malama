-- ================================================================
-- MIGRATION: storage_buckets
-- Cria buckets para exames e arquivos de chat do painel médico
-- ================================================================

-- ── patient-exams ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-exams',
  'patient-exams',
  false,                           -- bucket privado
  20971520,                        -- 20 MB
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

-- Paciente: upload nos seus próprios exames
CREATE POLICY "patient_exams_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-exams'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Paciente: ler seus próprios exames
CREATE POLICY "patient_exams_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-exams'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Médico: ler exames de seus pacientes (via tabela patient_exams)
CREATE POLICY "doctor_exams_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-exams'
    AND EXISTS (
      SELECT 1 FROM public.patient_exams pe
        JOIN public.doctors d ON d.id = pe.doctor_id
      WHERE d.user_id = auth.uid()
        AND pe.file_url LIKE '%' || name
    )
  );

-- Paciente: deletar seus próprios exames
CREATE POLICY "patient_exams_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-exams'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── chat-files ───────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  false,                           -- bucket privado
  10485760,                        -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Participantes do chat: upload (médico ou paciente do canal)
CREATE POLICY "chat_files_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND EXISTS (
      SELECT 1 FROM public.appointment_chats ac
      WHERE ac.id::text = (storage.foldername(name))[2]
        AND ac.status = 'open'
        AND (
          ac.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = ac.doctor_id AND d.user_id = auth.uid()
          )
        )
    )
  );

-- Participantes do chat: leitura
CREATE POLICY "chat_files_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND EXISTS (
      SELECT 1 FROM public.appointment_chats ac
      WHERE ac.id::text = (storage.foldername(name))[2]
        AND (
          ac.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = ac.doctor_id AND d.user_id = auth.uid()
          )
        )
    )
  );
