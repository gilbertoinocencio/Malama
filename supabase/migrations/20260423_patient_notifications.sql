-- =====================================================================
-- patient_notifications: notificações in-app para pacientes
-- Usada para avisar o paciente sobre eventos relevantes da consulta:
--   - chat_opened: análise clínica disponível, suporte de 20 dias aberto
--   - chat_expiring: suporte encerrando em breve
--   - exam_reviewed: médico anotou nos exames
-- =====================================================================

-- 1. Tabela
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,          -- chat_opened | chat_expiring | exam_reviewed
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_notifications_user
  ON public.patient_notifications (user_id, created_at DESC);

-- 2. RLS
-- -----------------------------------------------------------------------
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;

-- Paciente lê/atualiza (marcar como lida) apenas as próprias
CREATE POLICY "patient_notifications_select"
  ON public.patient_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "patient_notifications_update"
  ON public.patient_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role pode inserir (usado pelos triggers SECURITY DEFINER)
CREATE POLICY "patient_notifications_insert_service"
  ON public.patient_notifications
  FOR INSERT
  WITH CHECK (true);

-- 3. Trigger: notifica paciente quando chat pós-consulta é aberto
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_patient_on_chat_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patient_notifications (user_id, type, title, body, data)
  VALUES (
    NEW.patient_id,
    'chat_opened',
    'Análise clínica disponível',
    'Sua consulta foi finalizada. Você tem 20 dias de suporte direto com seu médico.',
    jsonb_build_object(
      'chat_id',         NEW.id,
      'consultation_id', NEW.consultation_id,
      'expires_at',      NEW.expires_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_chat_opened ON public.appointment_chats;
CREATE TRIGGER trg_notify_patient_on_chat_opened
  AFTER INSERT ON public.appointment_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_patient_on_chat_opened();

-- 4. RPC auxiliar: buscar notificações do paciente
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_patient_notifications(p_limit INT DEFAULT 40)
RETURNS SETOF public.patient_notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.patient_notifications
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- 5. RPC auxiliar: marcar todas como lidas
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_patient_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.patient_notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
$$;
