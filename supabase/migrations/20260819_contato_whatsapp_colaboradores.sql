-- =====================================================
-- Malama — Campo de contato (WhatsApp) nos pontos de
-- cadastro que hoje só coletam nome/e-mail:
--   - empresa_colaboradores: RH adiciona colaborador
--   - profiles: paciente edita o próprio perfil no app
--   - patient_leads: lista de espera pública (landing)
-- =====================================================

ALTER TABLE empresa_colaboradores
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

ALTER TABLE patient_leads
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;
