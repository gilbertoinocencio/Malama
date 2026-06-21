-- =====================================================
-- Malama — Patentes de médico + valores configuráveis de repasse
-- Migration: 20260624_doctor_patentes.sql
--
-- O valor por consulta realizada deixa de ser fixo (R$100 hardcoded)
-- e passa a depender da "patente" do médico (bronze/prata/ouro), com
-- valores configuráveis em platform_settings. Atribuição manual da
-- patente pelo admin nesta etapa; automação por metas fica para depois.
-- =====================================================

-- 1. Coluna de patente no médico (default 'prata' = valor base atual)
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS patente TEXT NOT NULL DEFAULT 'prata';

-- Garantir o CHECK apenas uma vez (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctors_patente_check'
  ) THEN
    ALTER TABLE doctors
      ADD CONSTRAINT doctors_patente_check
      CHECK (patente IN ('bronze', 'prata', 'ouro'));
  END IF;
END $$;

-- 2. Valores por patente em platform_settings.
--    As linhas precisam existir porque settingsService.updateSetting usa UPDATE.
INSERT INTO platform_settings (key, value) VALUES
  ('doctor_value_bronze', '90'),
  ('doctor_value_prata',  '100'),
  ('doctor_value_ouro',   '120')
ON CONFLICT (key) DO NOTHING;
