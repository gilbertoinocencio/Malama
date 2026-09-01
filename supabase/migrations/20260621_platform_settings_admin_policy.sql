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
        USING (is_super_admin())
        WITH CHECK (is_super_admin())
    $policy$;
  END IF;
END $$;
