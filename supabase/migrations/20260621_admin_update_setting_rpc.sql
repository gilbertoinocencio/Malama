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

-- RPC com SECURITY DEFINER para admin atualizar platform_settings sem depender de RLS.
-- Mesmo padrão de admin_get_all_users() — valida super_admin no servidor.

CREATE OR REPLACE FUNCTION admin_update_setting(p_key TEXT, p_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE platform_settings SET value = p_value, updated_at = now() WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO platform_settings (key, value) VALUES (p_key, p_value);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_setting(TEXT, TEXT) TO authenticated;
