-- Alerta ao médico quando paciente registra energia "Baixa" por 5 dias consecutivos

CREATE OR REPLACE FUNCTION public.trg_check_low_energy_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak       INT;
  v_doctor_id    UUID;
  v_patient_name TEXT;
  v_already      BOOLEAN;
BEGIN
  -- Só disparar quando energia registrada for Baixa
  IF NEW.energy_level IS NULL OR NEW.energy_level <> 'Baixa' THEN
    RETURN NEW;
  END IF;

  -- Contar quantos dos últimos 5 dias têm energia = 'Baixa'
  SELECT COUNT(*) INTO v_streak
  FROM public.daily_logs
  WHERE user_id = NEW.user_id
    AND date >= (NEW.date::date - INTERVAL '4 days')
    AND date <= NEW.date::date
    AND energy_level = 'Baixa';

  IF v_streak < 5 THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do paciente
  SELECT display_name INTO v_patient_name
  FROM public.profiles WHERE id = NEW.user_id;

  -- Notificar cada médico que tem consulta com este paciente
  FOR v_doctor_id IN
    SELECT DISTINCT doctor_id FROM public.consultations
    WHERE patient_id = NEW.user_id
  LOOP
    -- Evitar notificação duplicada nos últimos 5 dias
    SELECT EXISTS (
      SELECT 1 FROM public.doctor_notifications
      WHERE doctor_id   = v_doctor_id
        AND patient_id  = NEW.user_id
        AND type        = 'ai_alert'
        AND data->>'alert_type' = 'low_energy_streak'
        AND created_at >= now() - INTERVAL '5 days'
    ) INTO v_already;

    IF NOT v_already THEN
      PERFORM public.notify_doctor(
        v_doctor_id,
        NEW.user_id,
        'ai_alert',
        '⚡ Energia baixa por 5 dias — ' || COALESCE(v_patient_name, 'Paciente'),
        COALESCE(v_patient_name, 'O paciente') || ' registrou energia baixa por 5 dias consecutivos no diário.',
        jsonb_build_object('alert_type', 'low_energy_streak', 'streak_days', 5)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_low_energy_alert ON public.daily_logs;
CREATE TRIGGER trg_low_energy_alert
  AFTER INSERT OR UPDATE OF energy_level ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_low_energy_streak();
