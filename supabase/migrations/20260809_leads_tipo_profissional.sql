-- =====================================================
-- Malama — Fila de espera de profissionais aceita psicólogo
-- Migration: 20260809_leads_tipo_profissional.sql
--
-- Aplicar via SQL Editor.
--
-- O QUE ESTAVA FALTANDO
-- doctor_leads nasceu só para médico: crm e crm_uf NOT NULL, especialidade
-- em texto livre e nenhuma noção de tipo de profissional. Com a entrada do
-- modo Mental, o psicólogo não tinha por onde se cadastrar — a página
-- /listamedicos pede CRM — e, se conseguisse, o admin não teria como
-- separar a fila por tipo para analisar e liberar.
--
-- crm/crm_uf passam a significar REGISTRO DO CONSELHO de forma genérica:
-- CRM/UF para médico, CRP/UF para psicólogo. É a mesma convenção que a
-- tabela doctors já adotou em 20260723_profissional_psicologo, onde
-- conselho_numero foi preenchido a partir de crm.
-- =====================================================

ALTER TABLE doctor_leads
  ADD COLUMN IF NOT EXISTS tipo_profissional TEXT NOT NULL DEFAULT 'medico'
    CHECK (tipo_profissional IN ('medico', 'psicologo'));

-- Psicólogo: declaração de e-Psi ativo (CFP) para atendimento online.
-- Não há API pública de validação como a do CFM, então é declaratório e o
-- gate continua sendo a aprovação do admin.
ALTER TABLE doctor_leads
  ADD COLUMN IF NOT EXISTS epsi_ativo BOOLEAN;

COMMENT ON COLUMN doctor_leads.crm IS
  'Registro no conselho: CRM para médico, CRP para psicólogo (ver tipo_profissional).';
COMMENT ON COLUMN doctor_leads.crm_uf IS
  'UF do conselho (CRM ou CRP, conforme tipo_profissional).';

CREATE INDEX IF NOT EXISTS idx_doctor_leads_tipo
  ON doctor_leads(tipo_profissional, status);

-- Todo lead existente é médico — o default já cobre, sem backfill.
