-- Permite que super_admin atualize configurações da plataforma via Configurações.
-- A tabela já existe com uma política de SELECT (leitura pública ou autenticada),
-- mas não tinha política de UPDATE, causando 403 ao salvar.

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ler (necessário p/ Edge Functions e médicos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_settings' AND policyname = 'Anyone can read settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can read settings"
        ON platform_settings FOR SELECT
        TO authenticated
        USING (true)
    $policy$;
  END IF;
END $$;

-- Escrita: apenas super_admin pode inserir/atualizar/deletar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_settings' AND policyname = 'Admins can manage settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can manage settings"
        ON platform_settings FOR ALL
        TO authenticated
        USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        )
        WITH CHECK (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        )
    $policy$;
  END IF;
END $$;
