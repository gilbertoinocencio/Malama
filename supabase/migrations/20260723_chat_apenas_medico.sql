-- =====================================================
-- Malama — Chat pós-consulta é exclusivo de médico
-- Migration: 20260723_chat_apenas_medico.sql
--
-- Regra de negócio: psicólogo NÃO tem chat com o paciente, apenas a
-- consulta recorrente mensal. Blindagem na ORIGEM (ponto único de
-- criação do chat): se o profissional da consulta for psicólogo,
-- open_appointment_chat não abre chat e retorna NULL.
--
-- Aplicar via SQL Editor (após 20260723_profissional_psicologo).
-- =====================================================

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
  v_tipo       TEXT;
  v_chat_id    UUID;
BEGIN
  SELECT doctor_id, patient_id INTO v_doctor_id, v_patient_id
  FROM public.consultations
  WHERE id = p_consultation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;

  -- Verifica permissão (o médico da própria consulta)
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = v_doctor_id AND d.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Psicólogo não tem chat: encerra sem abrir (retorna NULL).
  SELECT COALESCE(tipo_profissional, 'medico') INTO v_tipo
  FROM public.doctors WHERE id = v_doctor_id;

  IF v_tipo = 'psicologo' THEN
    RETURN NULL;
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

GRANT EXECUTE ON FUNCTION public.open_appointment_chat(UUID, INT) TO authenticated;
