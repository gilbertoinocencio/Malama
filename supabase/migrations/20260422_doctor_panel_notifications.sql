-- ================================================================
-- MIGRATION: doctor_panel_notifications
-- Etapa 4 — Notificações do painel médico + colunas supervised plan
-- ================================================================

-- ----------------------------------------------------------------
-- 1. quarterly_plans — colunas para plano supervisionado
-- ----------------------------------------------------------------
ALTER TABLE public.quarterly_plans
  ADD COLUMN IF NOT EXISTS doctor_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doctor_id       UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doctor_name     TEXT,
  ADD COLUMN IF NOT EXISTS doctor_note     TEXT;

CREATE INDEX IF NOT EXISTS quarterly_plans_doctor_id_idx ON public.quarterly_plans(doctor_id);

-- ----------------------------------------------------------------
-- 2. doctor_notifications — fila de notificações para médicos
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Tipo do evento
  type         TEXT NOT NULL CHECK (type IN (
    'chat_opened',          -- canal pós-consulta aberto
    'chat_message',         -- paciente enviou mensagem
    'sla_risk',             -- SLA prestes a vencer (< 8h)
    'chat_expiring',        -- canal expira em < 48h
    'ai_alert',             -- insight crítico de IA detectado
    'exam_uploaded'         -- paciente enviou exame
  )),

  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB DEFAULT '{}',  -- ex: { chat_id, exam_id, consultation_id }

  is_read      BOOLEAN NOT NULL DEFAULT false,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_notifications_doctor_id_idx  ON public.doctor_notifications(doctor_id);
CREATE INDEX IF NOT EXISTS doctor_notifications_is_read_idx    ON public.doctor_notifications(is_read);
CREATE INDEX IF NOT EXISTS doctor_notifications_created_at_idx ON public.doctor_notifications(created_at DESC);

-- RLS
ALTER TABLE public.doctor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor_notifications_own" ON public.doctor_notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_notifications.doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (false); -- apenas service_role insere

-- ----------------------------------------------------------------
-- 3. Função helper para criar notificações (service_role)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_doctor(
  p_doctor_id  UUID,
  p_patient_id UUID,
  p_type       TEXT,
  p_title      TEXT,
  p_body       TEXT DEFAULT NULL,
  p_data       JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.doctor_notifications (doctor_id, patient_id, type, title, body, data)
  VALUES (p_doctor_id, p_patient_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_doctor(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ----------------------------------------------------------------
-- 4. Trigger: notificar médico quando paciente envia mensagem
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_doctor_on_patient_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id  UUID;
  v_patient_id UUID;
BEGIN
  -- Só notificar em mensagens do paciente
  IF NEW.sender_role <> 'patient' THEN
    RETURN NEW;
  END IF;

  SELECT doctor_id, patient_id INTO v_doctor_id, v_patient_id
  FROM public.appointment_chats
  WHERE id = NEW.chat_id AND status = 'open';

  IF NOT FOUND THEN RETURN NEW; END IF;

  PERFORM public.notify_doctor(
    v_doctor_id,
    v_patient_id,
    'chat_message',
    'Nova mensagem do paciente',
    LEFT(COALESCE(NEW.content, 'Arquivo enviado'), 120),
    jsonb_build_object('chat_id', NEW.chat_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doctor_on_patient_message ON public.chat_messages;
CREATE TRIGGER trg_notify_doctor_on_patient_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_doctor_on_patient_message();

-- ----------------------------------------------------------------
-- 5. Trigger: notificar médico quando paciente envia exame
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_doctor_on_exam_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.doctor_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_doctor(
    NEW.doctor_id,
    NEW.patient_id,
    'exam_uploaded',
    'Novo exame enviado',
    NEW.exam_name,
    jsonb_build_object('exam_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doctor_on_exam_upload ON public.patient_exams;
CREATE TRIGGER trg_notify_doctor_on_exam_upload
  AFTER INSERT ON public.patient_exams
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_doctor_on_exam_upload();

-- ----------------------------------------------------------------
-- 6. Trigger: notificar médico quando canal é aberto
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_doctor_chat_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_doctor(
    NEW.doctor_id,
    NEW.patient_id,
    'chat_opened',
    'Canal de acompanhamento aberto',
    'O canal pós-consulta está disponível por 20 dias.',
    jsonb_build_object('chat_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doctor_chat_opened ON public.appointment_chats;
CREATE TRIGGER trg_notify_doctor_chat_opened
  AFTER INSERT ON public.appointment_chats
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_doctor_chat_opened();

-- ----------------------------------------------------------------
-- 7. RPC: verificar SLA em risco e canais prestes a expirar
--    Chamada por cron externo (a cada hora via supabase cron job)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_sla_and_expiry_alerts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_inserted INT := 0;
  rec RECORD;
BEGIN
  -- SLA em risco: sla_breach_at entre agora e 8 horas
  FOR rec IN
    SELECT ac.id, ac.doctor_id, ac.patient_id, ac.sla_breach_at
    FROM public.appointment_chats ac
    WHERE ac.status = 'open'
      AND ac.sla_breach_at IS NOT NULL
      AND ac.sla_breach_at BETWEEN now() AND now() + INTERVAL '8 hours'
      -- evitar notificação duplicada (criada nas últimas 6h)
      AND NOT EXISTS (
        SELECT 1 FROM public.doctor_notifications dn
        WHERE dn.doctor_id = ac.doctor_id
          AND dn.type = 'sla_risk'
          AND (dn.data->>'chat_id')::uuid = ac.id
          AND dn.created_at > now() - INTERVAL '6 hours'
      )
  LOOP
    PERFORM public.notify_doctor(
      rec.doctor_id,
      rec.patient_id,
      'sla_risk',
      'SLA prestes a vencer',
      'Você tem menos de 8 horas para responder o paciente.',
      jsonb_build_object('chat_id', rec.id)
    );
    rows_inserted := rows_inserted + 1;
  END LOOP;

  -- Canal expirando em < 48h
  FOR rec IN
    SELECT ac.id, ac.doctor_id, ac.patient_id, ac.expires_at
    FROM public.appointment_chats ac
    WHERE ac.status = 'open'
      AND ac.expires_at BETWEEN now() AND now() + INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.doctor_notifications dn
        WHERE dn.doctor_id = ac.doctor_id
          AND dn.type = 'chat_expiring'
          AND (dn.data->>'chat_id')::uuid = ac.id
          AND dn.created_at > now() - INTERVAL '24 hours'
      )
  LOOP
    PERFORM public.notify_doctor(
      rec.doctor_id,
      rec.patient_id,
      'chat_expiring',
      'Canal de acompanhamento expirando',
      'O canal fecha em menos de 48 horas.',
      jsonb_build_object('chat_id', rec.id)
    );
    rows_inserted := rows_inserted + 1;
  END LOOP;

  RETURN rows_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_sla_and_expiry_alerts() TO service_role;

-- ----------------------------------------------------------------
-- 8. RPC: buscar notificações não lidas do médico + marcar lidas
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_doctor_notifications(p_limit INT DEFAULT 30)
RETURNS SETOF public.doctor_notifications
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
BEGIN
  SELECT id INTO v_doctor_id FROM public.doctors WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
    SELECT * FROM public.doctor_notifications
    WHERE doctor_id = v_doctor_id
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_doctor_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
BEGIN
  SELECT id INTO v_doctor_id FROM public.doctors WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.doctor_notifications
  SET is_read = true, read_at = now()
  WHERE doctor_id = v_doctor_id AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_notifications(INT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_doctor_notifications_read()       TO authenticated;
