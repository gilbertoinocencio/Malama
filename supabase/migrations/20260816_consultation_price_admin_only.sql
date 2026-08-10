-- =====================================================
-- Malama — Valor da consulta é tabelado, só a Malama escreve
-- Migration: 20260816_consultation_price_admin_only.sql
--
-- Aplicar via SQL Editor.
--
-- O QUE ESTAVA FALTANDO
-- 20260815_security_hardening já protege status, nivel, platform_fee_percent,
-- rating e total_consultations contra escrita do próprio profissional. Mas
-- consultation_price ficou de fora: o formulário de cadastro deixava o
-- profissional escolher o valor, e a policy doctors_own_update (sem restrição
-- de coluna) permitia alterá-lo depois por chamada direta à API.
--
-- No modelo atual a remuneração é TABELADA POR NÍVEL — doctors.nivel cruzado
-- com as settings doctor_value_nivelN / psi_value_nivelN, como faz
-- doctorService.getDoctorEarnings. Quem define o nível é o admin, na aprovação.
-- Deixar consultation_price livre abria a porta para o profissional divergir da
-- tabela por fora da UI.
--
-- Só estende a lista de campos protegidos da função existente; o trigger
-- (BEFORE INSERT OR UPDATE em public.doctors) já está criado e continua válido.
-- =====================================================

CREATE OR REPLACE FUNCTION public.protect_doctor_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.status := 'pending';
    -- O valor não nasce do cadastro: fica nulo até a Malama definir o nível.
    NEW.consultation_price := NULL;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.platform_fee_percent IS DISTINCT FROM OLD.platform_fee_percent
     OR NEW.nivel IS DISTINCT FROM OLD.nivel
     OR NEW.consultation_price IS DISTINCT FROM OLD.consultation_price
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.total_consultations IS DISTINCT FROM OLD.total_consultations THEN
    RAISE EXCEPTION 'Campos administrativos do profissional nao podem ser alterados pelo proprio usuario';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.doctors.consultation_price IS
  'Valor tabelado da consulta, escrito só pelo admin/service_role. A remuneração efetiva vem de nivel + settings doctor_value_nivelN / psi_value_nivelN.';
