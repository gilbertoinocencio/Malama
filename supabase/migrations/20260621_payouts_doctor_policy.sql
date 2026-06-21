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
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin');
