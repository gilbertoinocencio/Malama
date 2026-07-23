-- =====================================================
-- Malama — Especialidade no crédito de consulta (upsell psicológico)
-- Migration: 20260723_credito_especialidade.sql
--
-- Adiciona 'especialidade' ao crédito para separar saldos: consultas
-- médicas (endócrino/nutrólogo) vs psicológicas. Cada crédito já é uma
-- linha, então filtrar por especialidade produz dois saldos separados
-- reusando toda a máquina de status/expiração/reagendamento existente.
--
-- RETROCOMPATÍVEL: default 'medico' — todo crédito existente e todo
-- crédito novo do plano base continua sendo médico sem alteração de código.
-- O crédito psicológico é criado explicitamente com especialidade='psicologo'.
--
-- Aplicar via SQL Editor.
-- =====================================================

ALTER TABLE consultation_credits
  ADD COLUMN IF NOT EXISTS especialidade TEXT NOT NULL DEFAULT 'medico'
    CHECK (especialidade IN ('medico', 'psicologo'));

-- Índice para busca eficiente de saldo por especialidade
CREATE INDEX IF NOT EXISTS idx_credits_user_especialidade
  ON consultation_credits(user_id, especialidade, status);
