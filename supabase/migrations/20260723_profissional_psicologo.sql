-- =====================================================
-- Malama — Psicólogo como tipo de profissional (Onda B do upsell)
-- Migration: 20260723_profissional_psicologo.sql
--
-- O profissional passa a ter um TIPO. Médico (default) mantém CRM+CFM.
-- Psicólogo usa CRP (Conselho Regional de Psicologia) + declaração de
-- e-Psi ativo (cadastro no CFP para atendimento online). Não há API
-- pública do e-Psi como a do CFM, então a validação é documental e o
-- gate é a aprovação do admin (status pending → approved, já existente).
--
-- RETROCOMPATÍVEL: tipo_profissional default 'medico' — todo médico
-- existente permanece médico sem alteração. As colunas de conselho
-- genérico são preenchidas a partir do CRM para os médicos existentes.
--
-- Aplicar via SQL Editor.
-- =====================================================

-- Tipo do profissional
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS tipo_profissional TEXT NOT NULL DEFAULT 'medico'
    CHECK (tipo_profissional IN ('medico', 'psicologo'));

-- Conselho genérico: para médico = CRM/UF (já existe em crm/crm_state);
-- estas colunas guardam o registro de forma agnóstica ao tipo, permitindo
-- CRP para psicólogo sem sobrecarregar a semântica de "crm".
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS conselho_tipo    TEXT;   -- 'CRM' | 'CRP'
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS conselho_numero  TEXT;
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS conselho_uf      TEXT;

-- Psicólogo: declaração de e-Psi ativo (CFP). Para médico permanece NULL.
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS epsi_ativo       BOOLEAN;

-- Backfill: médicos existentes → conselho CRM a partir das colunas atuais.
UPDATE doctors
SET conselho_tipo   = COALESCE(conselho_tipo, 'CRM'),
    conselho_numero = COALESCE(conselho_numero, crm),
    conselho_uf     = COALESCE(conselho_uf, crm_state)
WHERE tipo_profissional = 'medico'
  AND conselho_numero IS NULL;

CREATE INDEX IF NOT EXISTS idx_doctors_tipo_profissional
  ON doctors(tipo_profissional, status);
