-- Migration: Adicionar rastreamento de indicação e canal de aquisição nos perfis
-- Data: 08/04/2026
-- Descrição: Permite saber quem indicou o paciente e por qual canal ele chegou ao app

-- 1. Canal de aquisição (organic, referral, website, social, etc.)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS acquisition_channel TEXT NULL
  CHECK (acquisition_channel IN ('organic', 'referral', 'website', 'social', 'other'));

-- 2. Médico que indicou (quando canal = referral)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referred_by_doctor_id UUID NULL REFERENCES doctors(id) ON DELETE SET NULL;

-- 3. Comentários
COMMENT ON COLUMN profiles.acquisition_channel IS 'Canal pelo qual o usuário chegou ao app: organic, referral, website, social, other.';
COMMENT ON COLUMN profiles.referred_by_doctor_id IS 'ID do médico que indicou este paciente via link personalizado (/convite/:token).';

-- 4. Índice para buscas por médico indicador
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_doctor ON profiles(referred_by_doctor_id);

-- 5. Rollback (para referência):
-- ALTER TABLE profiles DROP COLUMN IF EXISTS acquisition_channel;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS referred_by_doctor_id;
-- DROP INDEX IF EXISTS idx_profiles_referred_by_doctor;
