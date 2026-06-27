-- =====================================================
-- Malama — Leads (waitlist) visíveis só para super_admin
-- Migration: 20260626_leads_admin_only.sql
--
-- doctor_leads e patient_leads contêm PII (nome, e-mail, CRM) e, no caso de
-- pacientes, o "objetivo" (ex.: condicao_clinica, acompanhamento_glp1 = dado de
-- saúde). Antes a leitura era "TO authenticated USING (true)" → qualquer usuário
-- logado baixava a lista inteira. Agora só super_admin lê. Insert público
-- (formulário das landings) permanece intacto.
-- =====================================================

DROP POLICY IF EXISTS "Auth read doctor_leads" ON doctor_leads;
CREATE POLICY "Admins read doctor_leads" ON doctor_leads
  FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Auth read patient_leads" ON patient_leads;
CREATE POLICY "Admins read patient_leads" ON patient_leads
  FOR SELECT TO authenticated
  USING (is_super_admin());
