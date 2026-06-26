-- =====================================================
-- Malama — Hardening RBAC: user_metadata → app_metadata
-- Migration: 20260626_rbac_app_metadata.sql
--
-- PROBLEMA: o papel (super_admin/rh) era lido de user_metadata, que o próprio
-- usuário altera via supabase.auth.updateUser({ data: { role } }) no navegador.
-- Isso permitia auto-promoção a super_admin (acesso a todos os dados).
-- app_metadata (raw_app_meta_data) só é gravável por service_role / admin API.
--
-- PRÉ-REQUISITO (Passo B — já executado): copiar os papéis para app_metadata:
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--       || jsonb_build_object('role', raw_user_meta_data->>'role')
--   where raw_user_meta_data->>'role' is not null;
--
-- APÓS aplicar esta migration, o super_admin precisa DESLOGAR e LOGAR de novo
-- para o JWT carregar app_metadata.role.
-- =====================================================

-- 1) Ponto único de verdade. Lê app_metadata do JWT (não toca auth.users → sem
--    SECURITY DEFINER, sem "permission denied for table users").
--    Substitui as definições anteriores (billing_system e empresas_b2b).
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin', false);
$$;

-- 2) profiles — admin vê todos; demais usuários só o próprio
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_super_admin() OR auth.uid() = id);

-- 3) RPC admin_get_all_users — vaza todos os perfis + e-mails se desprotegida
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id          uuid,
  display_name text,
  avatar_url  text,
  email       text,
  created_at  timestamptz,
  acquisition_channel text,
  referred_by_doctor_id uuid,
  age         int,
  gender      text,
  goal        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
    SELECT p.id, p.display_name, p.avatar_url, u.email, p.created_at,
           p.acquisition_channel, p.referred_by_doctor_id, p.age, p.gender, p.goal
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;

-- 4) RPC admin_update_setting — escrita de configurações pelo admin
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

-- 5) platform_settings — gestão só admin (a leitura já foi blindada no item #1)
DROP POLICY IF EXISTS "Admins can manage settings" ON platform_settings;
CREATE POLICY "Admins can manage settings" ON platform_settings
  FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 6) payouts — gestão só admin (médico lê os próprios via "Doctors view own payouts")
DROP POLICY IF EXISTS "Admins manage payouts" ON payouts;
CREATE POLICY "Admins manage payouts" ON payouts
  FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 7) support_tickets — antes usava auth.jwt()->>'role' (role do Postgres, nunca
--    'super_admin' → policy estava quebrada). Agora via app_metadata.
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
CREATE POLICY "Admins can update all tickets" ON support_tickets
  FOR UPDATE TO authenticated USING (is_super_admin());

-- NOTA: subscriptions, consultation_credits, payout_items, credit_admin_logs,
-- empresas, rh_usuarios, empresa_colaboradores e empresa_leads já chamam
-- is_super_admin() → foram corrigidas automaticamente pela redefinição no passo 1.
