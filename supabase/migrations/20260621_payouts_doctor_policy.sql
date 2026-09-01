-- =====================================================================
-- SUPERADA por 20260626_rbac_app_metadata.sql
--
-- A versão original deste arquivo checava o papel em
-- `auth.jwt() -> 'user_metadata' ->> 'role'`. user_metadata é gravável
-- pelo próprio usuário (supabase.auth.updateUser), então aquilo era
-- auto-promoção a super_admin.
--
-- O arquivo foi reescrito para chamar is_super_admin() (que lê
-- app_metadata) e ficou seguro em qualquer ordem de execução. Mantido
-- executável de propósito: aqui as migrations são aplicadas à mão pelo
-- SQL Editor, sem registro do que já rodou, e um arquivo que reintroduz
-- a falha ao ser reaplicado é uma armadilha.
-- Auditoria de segurança, 01/09/2026 — achado F9.
-- =====================================================================

-- Médicos não conseguiam ver seus próprios repasses no Financeiro.
-- Causa raiz: política "Admin can manage all payouts" (FOR ALL) usava
-- `FROM auth.users` inline sem SECURITY DEFINER — o role authenticated
-- não tem acesso direto a auth.users → "permission denied for table users"
-- em qualquer query na tabela, inclusive a dos médicos.
--
-- Fix: dropar todas as políticas quebradas e recriar corretamente.

GRANT SELECT ON payouts TO authenticated;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Dropar todas as políticas existentes (inclui a quebrada)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'payouts' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON payouts';
  END LOOP;
END $$;

CREATE POLICY "Doctors view own payouts"
  ON payouts FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage payouts"
  ON payouts FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
