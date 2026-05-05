-- Função SECURITY DEFINER que permite ao médico autenticado
-- obter o email de um paciente a partir de auth.users (role authenticated não tem acesso direto)
CREATE OR REPLACE FUNCTION get_patient_name_for_doctor(p_patient_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_email        text;
BEGIN
  -- Tenta display_name primeiro
  SELECT display_name INTO v_display_name
  FROM public.profiles
  WHERE id = p_patient_id;

  IF v_display_name IS NOT NULL AND v_display_name <> '' THEN
    RETURN v_display_name;
  END IF;

  -- Fallback: parte local do email (antes do @)
  SELECT split_part(email, '@', 1) INTO v_email
  FROM auth.users
  WHERE id = p_patient_id;

  RETURN COALESCE(v_email, 'Paciente');
END;
$$;

-- Concede execução apenas para authenticated (médicos logados)
GRANT EXECUTE ON FUNCTION get_patient_name_for_doctor(uuid) TO authenticated;
