-- ================================================================
-- Trigger: médico envia mensagem → cria patient_notification
-- + adiciona patient_notifications ao realtime publication
-- ================================================================

-- Notifica paciente quando médico envia mensagem no chat pós-consulta
CREATE OR REPLACE FUNCTION public.notify_patient_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id      UUID;
  v_consultation_id UUID;
  v_doctor_name     TEXT;
BEGIN
  IF NEW.sender_role != 'doctor' THEN
    RETURN NEW;
  END IF;

  SELECT ac.patient_id, ac.consultation_id
    INTO v_patient_id, v_consultation_id
  FROM public.appointment_chats ac
  WHERE ac.id = NEW.chat_id;

  IF v_patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_doctor_name
  FROM public.doctors
  WHERE user_id = NEW.sender_id;

  INSERT INTO public.patient_notifications (user_id, type, title, body, data)
  VALUES (
    v_patient_id,
    'chat_message',
    'Nova mensagem de ' || COALESCE(v_doctor_name, 'seu médico'),
    CASE
      WHEN NEW.content IS NOT NULL THEN LEFT(NEW.content, 120)
      ELSE 'Arquivo anexado'
    END,
    jsonb_build_object(
      'chat_id',         NEW.chat_id,
      'consultation_id', v_consultation_id,
      'doctor_name',     COALESCE(v_doctor_name, 'Médico'),
      'message_id',      NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_patient_on_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_patient_on_chat_message();

-- Realtime para patient_notifications (badge atualiza em tempo real)
ALTER TABLE public.patient_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_notifications;
