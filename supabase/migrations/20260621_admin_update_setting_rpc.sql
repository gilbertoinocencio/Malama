-- RPC com SECURITY DEFINER para admin atualizar platform_settings sem depender de RLS.
-- Mesmo padrão de admin_get_all_users() — valida super_admin no servidor.

CREATE OR REPLACE FUNCTION admin_update_setting(p_key TEXT, p_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') <> 'super_admin' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE platform_settings SET value = p_value, updated_at = now() WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO platform_settings (key, value) VALUES (p_key, p_value);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_setting(TEXT, TEXT) TO authenticated;
