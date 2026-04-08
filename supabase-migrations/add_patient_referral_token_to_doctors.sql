-- Migration: Adicionar campo patient_referral_token para indicação de pacientes
-- Data: 08/04/2026
-- Descrição: Permite que médicos gerem um link personalizado para indicar pacientes ao app mobile

-- 1. Adicionar coluna patient_referral_token (nullable, único)
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS patient_referral_token VARCHAR(64) NULL UNIQUE;

-- 2. Comentário para documentação
COMMENT ON COLUMN doctors.patient_referral_token IS 'Token único gerado pelo médico para indicação de pacientes. Usado em links do tipo /convite/{token}.';

-- 3. Rollback (para referência):
-- ALTER TABLE doctors DROP COLUMN IF EXISTS patient_referral_token;
