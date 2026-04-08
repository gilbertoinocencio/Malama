-- Migration: Adicionar campo specialty_custom para especialidades personalizadas
-- Data: 08/04/2026
-- Descrição: Permite que médicos tenham especialidades customizadas além das opções padrão

-- 1. Adicionar coluna specialty_custom (nullable)
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS specialty_custom VARCHAR(255) NULL;

-- 2. Comentário para documentação
COMMENT ON COLUMN doctors.specialty_custom IS 'Especialidade personalizada quando specialty = "Outro". Permite adicionar especialidades não listadas no enum.';

-- 3. Rollback (para referência):
-- ALTER TABLE doctors DROP COLUMN IF EXISTS specialty_custom;
