-- ================================================================
-- MIGRATION: doctor_panel_v2
-- Etapa 1 — Novas tabelas clínicas do painel do médico
-- clinical_notes, appointment_chats, chat_messages, patient_exams
-- ================================================================

-- ----------------------------------------------------------------
-- 1. CLINICAL_NOTES — Prontuário estruturado por consulta
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id       UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  doctor_id             UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  patient_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Seções estruturadas
  chief_complaint       TEXT,               -- Queixa principal
  history_illness       TEXT,               -- História da doença atual
  relevant_history      TEXT,               -- Antecedentes relevantes
  physical_exam         TEXT,               -- Exame físico
  diagnosis             TEXT,               -- Hipótese diagnóstica / CID-10
  plan                  TEXT,               -- Plano terapêutico
  free_text             TEXT,               -- Anotações livres

  -- Métricas clínicas medidas na consulta
  weight_kg             NUMERIC(5,2),
  height_cm             NUMERIC(5,1),
  bmi                   NUMERIC(4,2),
  blood_pressure_sys    INT,                -- mmHg sistólica
  blood_pressure_dia    INT,                -- mmHg diastólica
  heart_rate            INT,                -- bpm
  waist_cm              NUMERIC(5,1),

  -- Controle
  is_draft              BOOLEAN NOT NULL DEFAULT true,
  finalized_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (consultation_id)                  -- Um prontuário por consulta
);

CREATE INDEX IF NOT EXISTS clinical_notes_doctor_id_idx   ON public.clinical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS clinical_notes_patient_id_idx  ON public.clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS clinical_notes_created_at_idx  ON public.clinical_notes(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_clinical_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clinical_notes_updated_at ON public.clinical_notes;
CREATE TRIGGER trg_clinical_notes_updated_at
  BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_clinical_notes_updated_at();

-- ----------------------------------------------------------------
-- 2. APPOINTMENT_CHATS — Canal de chat pós-consulta (20 dias)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_chats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id   UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  doctor_id         UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  patient_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'closed', 'expired')),

  -- SLA: médico deve responder em X horas
  sla_hours         INT NOT NULL DEFAULT 48,
  last_patient_msg_at  TIMESTAMPTZ,        -- para calcular SLA
  last_doctor_msg_at   TIMESTAMPTZ,
  sla_breach_at        TIMESTAMPTZ,        -- quando o SLA vence

  -- Vida útil do canal
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL
                      GENERATED ALWAYS AS (opened_at + INTERVAL '20 days') STORED,
  closed_at         TIMESTAMPTZ,
  closed_by         UUID REFERENCES auth.users(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (consultation_id)                 -- Um canal por consulta
);

CREATE INDEX IF NOT EXISTS appt_chats_doctor_id_idx    ON public.appointment_chats(doctor_id);
CREATE INDEX IF NOT EXISTS appt_chats_patient_id_idx   ON public.appointment_chats(patient_id);
CREATE INDEX IF NOT EXISTS appt_chats_status_idx       ON public.appointment_chats(status);
CREATE INDEX IF NOT EXISTS appt_chats_expires_at_idx   ON public.appointment_chats(expires_at);

-- ----------------------------------------------------------------
-- 3. CHAT_MESSAGES — Mensagens do canal pós-consulta
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       UUID NOT NULL REFERENCES public.appointment_chats(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('doctor', 'patient')),

  content       TEXT,                      -- Texto da mensagem (nullable se só arquivo)
  file_url      TEXT,                      -- URL do arquivo no Storage
  file_name     TEXT,
  file_type     TEXT,                      -- MIME type
  file_size_kb  INT,

  is_read       BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx      ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx    ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx   ON public.chat_messages(created_at DESC);

-- Trigger: atualizar last_*_msg_at no appointment_chats ao inserir mensagem
CREATE OR REPLACE FUNCTION public.update_chat_last_msg()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sender_role = 'patient' THEN
    UPDATE public.appointment_chats
    SET
      last_patient_msg_at = NEW.created_at,
      sla_breach_at = NEW.created_at + (sla_hours || ' hours')::INTERVAL
    WHERE id = NEW.chat_id AND status = 'open';
  ELSE
    UPDATE public.appointment_chats
    SET last_doctor_msg_at = NEW.created_at
    WHERE id = NEW.chat_id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_last_msg ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_last_msg
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_msg();

-- ----------------------------------------------------------------
-- 4. PATIENT_EXAMS — Resultados de exames enviados pelo paciente
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  chat_id         UUID REFERENCES public.appointment_chats(id) ON DELETE SET NULL,

  exam_name       TEXT NOT NULL,           -- Nome do exame (ex: "Hemograma completo")
  exam_date       DATE,                    -- Data de coleta
  lab_name        TEXT,                    -- Laboratório
  file_url        TEXT NOT NULL,           -- URL no Supabase Storage
  file_name       TEXT NOT NULL,
  file_type       TEXT,                    -- PDF, image/jpeg, etc.
  file_size_kb    INT,

  -- Anotação do médico sobre o exame
  doctor_note     TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES public.doctors(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_exams_patient_id_idx      ON public.patient_exams(patient_id);
CREATE INDEX IF NOT EXISTS patient_exams_doctor_id_idx       ON public.patient_exams(doctor_id);
CREATE INDEX IF NOT EXISTS patient_exams_consultation_id_idx ON public.patient_exams(consultation_id);
CREATE INDEX IF NOT EXISTS patient_exams_exam_date_idx       ON public.patient_exams(exam_date DESC);

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- ── clinical_notes ──────────────────────────────────────────────
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Médico: CRUD apenas nos seus prontuários
CREATE POLICY "clinical_notes_doctor_crud" ON public.clinical_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = clinical_notes.doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = clinical_notes.doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- Paciente: somente leitura do seu próprio prontuário (finalizados)
CREATE POLICY "clinical_notes_patient_read" ON public.clinical_notes
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    AND is_draft = false
  );

-- Admin: leitura total
CREATE POLICY "clinical_notes_admin_read" ON public.clinical_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── appointment_chats ────────────────────────────────────────────
ALTER TABLE public.appointment_chats ENABLE ROW LEVEL SECURITY;

-- Médico: acesso aos seus próprios chats
CREATE POLICY "appt_chats_doctor_access" ON public.appointment_chats
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = appointment_chats.doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = appointment_chats.doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- Paciente: acesso ao seu próprio chat
CREATE POLICY "appt_chats_patient_access" ON public.appointment_chats
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- ── chat_messages ────────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Participantes do chat: leitura e envio
CREATE POLICY "chat_messages_participant_read" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointment_chats ac
      WHERE ac.id = chat_messages.chat_id
        AND (
          ac.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = ac.doctor_id AND d.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "chat_messages_participant_insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointment_chats ac
      WHERE ac.id = chat_messages.chat_id
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

-- Marcar mensagem como lida: apenas o destinatário
CREATE POLICY "chat_messages_update_read" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointment_chats ac
      WHERE ac.id = chat_messages.chat_id
        AND (
          ac.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = ac.doctor_id AND d.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (true);

-- ── patient_exams ────────────────────────────────────────────────
ALTER TABLE public.patient_exams ENABLE ROW LEVEL SECURITY;

-- Paciente: CRUD nos seus exames
CREATE POLICY "patient_exams_patient_crud" ON public.patient_exams
  FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Médico: leitura dos exames dos seus pacientes
CREATE POLICY "patient_exams_doctor_read" ON public.patient_exams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = patient_exams.doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- Médico: atualizar nota e revisão
CREATE POLICY "patient_exams_doctor_update" ON public.patient_exams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = patient_exams.doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- ================================================================
-- RPC FUNCTIONS
-- ================================================================

-- ── close_expired_chats ──────────────────────────────────────────
-- Chamada por cron: fecha chats onde expires_at < now()
CREATE OR REPLACE FUNCTION public.close_expired_chats()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE public.appointment_chats
  SET status = 'expired', closed_at = now()
  WHERE status = 'open' AND expires_at < now();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- ── can_close_appointment ────────────────────────────────────────
-- Verifica se um médico pode encerrar uma consulta
-- (requer prontuário finalizado)
CREATE OR REPLACE FUNCTION public.can_close_appointment(p_consultation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_exists   BOOLEAN;
  v_note_draft    BOOLEAN;
  v_consultation  RECORD;
BEGIN
  SELECT status, doctor_id INTO v_consultation
  FROM public.consultations
  WHERE id = p_consultation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_close', false, 'reason', 'Consulta não encontrada');
  END IF;

  -- Verifica se o médico logado é o dono
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = v_consultation.doctor_id AND d.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('can_close', false, 'reason', 'Acesso negado');
  END IF;

  IF v_consultation.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('can_close', false, 'reason', 'Consulta já encerrada');
  END IF;

  -- Verifica prontuário
  SELECT EXISTS(
    SELECT 1 FROM public.clinical_notes
    WHERE consultation_id = p_consultation_id
  ), COALESCE((
    SELECT is_draft FROM public.clinical_notes
    WHERE consultation_id = p_consultation_id
    LIMIT 1
  ), true)
  INTO v_note_exists, v_note_draft;

  IF NOT v_note_exists THEN
    RETURN jsonb_build_object('can_close', false, 'reason', 'Prontuário obrigatório antes de encerrar');
  END IF;

  IF v_note_draft THEN
    RETURN jsonb_build_object('can_close', false, 'reason', 'Finalize o prontuário antes de encerrar');
  END IF;

  RETURN jsonb_build_object('can_close', true, 'reason', null);
END;
$$;

-- ── get_patient_full_history ─────────────────────────────────────
-- Retorna histórico completo de um paciente para o médico
CREATE OR REPLACE FUNCTION public.get_patient_full_history(
  p_patient_id  UUID,
  p_doctor_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Valida que o médico logado é o solicitante
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = p_doctor_id AND d.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'consultations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           c.id,
          'scheduled_at', c.scheduled_at,
          'status',       c.status,
          'type',         c.type,
          'notes',        c.notes,
          'clinical_note', (
            SELECT jsonb_build_object(
              'id',            cn.id,
              'is_draft',      cn.is_draft,
              'finalized_at',  cn.finalized_at,
              'diagnosis',     cn.diagnosis,
              'plan',          cn.plan,
              'weight_kg',     cn.weight_kg,
              'bmi',           cn.bmi
            )
            FROM public.clinical_notes cn
            WHERE cn.consultation_id = c.id
            LIMIT 1
          )
        ) ORDER BY c.scheduled_at DESC
      )
      FROM public.consultations c
      WHERE c.patient_id = p_patient_id
        AND c.doctor_id = p_doctor_id
    ), '[]'::jsonb),

    'exams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          pe.id,
          'exam_name',   pe.exam_name,
          'exam_date',   pe.exam_date,
          'lab_name',    pe.lab_name,
          'file_url',    pe.file_url,
          'file_name',   pe.file_name,
          'doctor_note', pe.doctor_note,
          'reviewed_at', pe.reviewed_at,
          'created_at',  pe.created_at
        ) ORDER BY pe.exam_date DESC NULLS LAST
      )
      FROM public.patient_exams pe
      WHERE pe.patient_id = p_patient_id
        AND pe.doctor_id = p_doctor_id
    ), '[]'::jsonb),

    'open_chat', (
      SELECT jsonb_build_object(
        'id',                  ac.id,
        'status',              ac.status,
        'expires_at',          ac.expires_at,
        'last_patient_msg_at', ac.last_patient_msg_at,
        'last_doctor_msg_at',  ac.last_doctor_msg_at,
        'sla_breach_at',       ac.sla_breach_at,
        'unread_count', (
          SELECT COUNT(*) FROM public.chat_messages cm
          WHERE cm.chat_id = ac.id
            AND cm.sender_role = 'patient'
            AND cm.is_read = false
        )
      )
      FROM public.appointment_chats ac
      WHERE ac.patient_id = p_patient_id
        AND ac.doctor_id = p_doctor_id
        AND ac.status = 'open'
      ORDER BY ac.opened_at DESC
      LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── open_appointment_chat ────────────────────────────────────────
-- Abre um canal de chat ao encerrar consulta
CREATE OR REPLACE FUNCTION public.open_appointment_chat(
  p_consultation_id UUID,
  p_sla_hours       INT DEFAULT 48
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id  UUID;
  v_patient_id UUID;
  v_chat_id    UUID;
BEGIN
  SELECT doctor_id, patient_id INTO v_doctor_id, v_patient_id
  FROM public.consultations
  WHERE id = p_consultation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;

  -- Verifica permissão
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = v_doctor_id AND d.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Insere ou retorna o chat já existente
  INSERT INTO public.appointment_chats (consultation_id, doctor_id, patient_id, sla_hours)
  VALUES (p_consultation_id, v_doctor_id, v_patient_id, p_sla_hours)
  ON CONFLICT (consultation_id) DO UPDATE
    SET status = 'open', closed_at = NULL, closed_by = NULL
  RETURNING id INTO v_chat_id;

  RETURN v_chat_id;
END;
$$;

-- ── Permissões das funções ───────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.close_expired_chats()                     TO service_role;
GRANT EXECUTE ON FUNCTION public.can_close_appointment(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_full_history(UUID, UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_appointment_chat(UUID, INT)          TO authenticated;
