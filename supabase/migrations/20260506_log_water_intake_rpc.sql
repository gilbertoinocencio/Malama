-- ================================================================
-- RPC: log_water_intake
-- Incrementa water_intake em daily_logs de forma atômica.
-- Usa ON CONFLICT DO UPDATE para evitar race condition entre
-- SELECT + INSERT/UPDATE separados.
-- ================================================================

CREATE OR REPLACE FUNCTION public.log_water_intake(
  p_user_id UUID,
  p_date    DATE,
  p_ml      INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_water_goal  INTEGER;
  v_new_total   INTEGER;
BEGIN
  -- Calcula meta personalizada a partir do perfil (usada só na inserção inicial)
  SELECT GREATEST(3000, ROUND(COALESCE(weight, 70) * 35)::INTEGER)
       + CASE activity_level
           WHEN 'intense'  THEN 600
           WHEN 'moderate' THEN 300
           ELSE 0
         END
    INTO v_water_goal
  FROM public.profiles
  WHERE id = p_user_id;

  INSERT INTO public.daily_logs (user_id, date, water_intake, water_goal)
  VALUES (p_user_id, p_date, p_ml, COALESCE(v_water_goal, 3000))
  ON CONFLICT (user_id, date) DO UPDATE
    SET water_intake = public.daily_logs.water_intake + p_ml,
        updated_at   = NOW()
  RETURNING water_intake INTO v_new_total;

  RETURN v_new_total;
END;
$$;

-- Garante que usuários autenticados podem chamar a função
GRANT EXECUTE ON FUNCTION public.log_water_intake(UUID, DATE, INTEGER) TO authenticated;
