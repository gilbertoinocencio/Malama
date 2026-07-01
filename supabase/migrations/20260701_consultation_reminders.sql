-- =====================================================================
-- Lembretes de consulta agendada
--   * Confirmação in-app no momento do agendamento (trigger)
--   * Tabela de dedupe para os lembretes 24h / 3h / 30min (cron)
--   * pg_cron chamando a Edge Function send-consultation-reminders a cada 5 min
--
-- O tipo de notificação usado é 'consultation_reminder' (roteia para
-- "Minhas Consultas" no app). Reaproveita a tabela public.patient_notifications.
-- =====================================================================

-- 1. Confirmação de agendamento (dispara ao inserir a consulta)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_patient_on_consultation_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_name TEXT;
  v_when        TEXT;
BEGIN
  IF NEW.status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_doctor_name FROM public.doctors WHERE id = NEW.doctor_id;
  v_when := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI');

  INSERT INTO public.patient_notifications (user_id, type, title, body, data)
  VALUES (
    NEW.patient_id,
    'consultation_reminder',
    'Consulta agendada',
    'Sua consulta com Dr(a). ' || COALESCE(v_doctor_name, 'seu médico')
      || ' foi marcada para ' || v_when
      || '. Você receberá lembretes antes do horário.',
    jsonb_build_object(
      'consultation_id', NEW.id,
      'doctor_name',     v_doctor_name,
      'scheduled_at',    NEW.scheduled_at,
      'reminder_kind',   'booked'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_consultation_booked ON public.consultations;
CREATE TRIGGER trg_notify_patient_on_consultation_booked
  AFTER INSERT ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_patient_on_consultation_booked();

-- 2. Dedupe dos lembretes temporizados (24h / 3h / 30min)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultation_reminders_sent (
  consultation_id UUID        NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  kind            TEXT        NOT NULL,  -- '24h' | '3h' | '30min'
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consultation_id, kind)
);

-- Somente a service role (Edge Function) escreve/lê. RLS habilitada e sem
-- policies = bloqueia anon/authenticated; service role ignora RLS.
ALTER TABLE public.consultation_reminders_sent ENABLE ROW LEVEL SECURITY;

-- 3. Agendamento do cron (a cada 5 min) — só se pg_cron estiver habilitado.
--    URLs/keys vêm de platform_settings ('supabase_functions_url' e
--    'service_role_key_for_cron'), mesmo padrão dos jobs de billing.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'consultation-reminders') THEN
      PERFORM cron.unschedule('consultation-reminders');
    END IF;

    PERFORM cron.schedule(
      'consultation-reminders',
      '*/5 * * * *',
      $job$
        SELECT net.http_post(
          url     := (SELECT value FROM platform_settings WHERE key = 'supabase_functions_url') || '/send-consultation-reminders',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM platform_settings WHERE key = 'service_role_key_for_cron')
          ),
          body    := '{}'::jsonb
        )
      $job$
    );
  END IF;
END $$;
