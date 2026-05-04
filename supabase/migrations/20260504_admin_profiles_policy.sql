-- Permite que super_admin veja todos os profiles (fix: antes só via própria conta)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR auth.uid() = id
  );

-- RPC com SECURITY DEFINER para buscar profiles + email de auth.users sem expor service_role
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
  -- Só super_admin pode chamar esta função
  IF (auth.jwt() -> 'user_metadata' ->> 'role') <> 'super_admin' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.display_name,
      p.avatar_url,
      u.email,
      p.created_at,
      p.acquisition_channel,
      p.referred_by_doctor_id,
      p.age,
      p.gender,
      p.goal
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;
