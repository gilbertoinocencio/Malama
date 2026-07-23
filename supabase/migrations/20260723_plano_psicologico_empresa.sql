-- =====================================================
-- Malama — Plano psicológico por empresa (upsell B2B)
-- Migration: 20260723_plano_psicologico_empresa.sql
--
-- A empresa contratante pode ativar o plano psicológico (consultas com
-- psicólogo, via telemedicina), com valor e nº de assentos próprios —
-- separados dos assentos do plano base. Quem recebe o crédito psi é
-- decidido pelo RH (ver RPC rh_alocar_psicologo, migração seguinte).
--
-- Toda a coluna nasce desligada/nula → nenhuma empresa é afetada.
-- Aplicar via SQL Editor.
-- =====================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS plano_psicologico  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS valor_assento_psi  NUMERIC(10,2);

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS max_assentos_psi   INTEGER;

-- Marca no colaborador se ele recebeu o acesso psicológico (o RH aloca).
-- Booleano simples: o SALDO de consultas vive em consultation_credits;
-- esta flag só diz "este colaborador tem direito ao plano psi".
ALTER TABLE empresa_colaboradores
  ADD COLUMN IF NOT EXISTS plano_psicologico BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_colaboradores_plano_psi
  ON empresa_colaboradores(empresa_id, plano_psicologico)
  WHERE plano_psicologico = true;
