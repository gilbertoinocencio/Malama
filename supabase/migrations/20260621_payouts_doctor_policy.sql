-- Médicos não conseguiam ver seus próprios repasses no Financeiro:
-- a tabela payouts não tinha política SELECT para o role authenticated.

GRANT SELECT ON payouts TO authenticated;

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payouts' AND policyname = 'Doctors view own payouts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Doctors view own payouts"
        ON payouts FOR SELECT
        USING (
          doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
        )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payouts' AND policyname = 'Admins manage payouts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins manage payouts"
        ON payouts FOR ALL
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
        WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    $policy$;
  END IF;
END $$;
