-- 1. Remove o trigger que depende da coluna
DROP TRIGGER IF EXISTS trg_low_energy_alert ON public.daily_logs;

-- 2. Altera o tipo de INTEGER para TEXT preservando dados existentes
ALTER TABLE daily_logs
  ALTER COLUMN energy_level TYPE text USING
    CASE energy_level::text
      WHEN '1' THEN 'Baixa'
      WHEN '2' THEN 'Média'
      WHEN '3' THEN 'Boa'
      WHEN '4' THEN 'Flow'
      ELSE NULL
    END;

-- 3. Recria o trigger
CREATE TRIGGER trg_low_energy_alert
  AFTER INSERT OR UPDATE OF energy_level ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_low_energy_streak();
