-- =====================================================================
-- Malama — Cron mensal da memória empírica do agente
--   pg_cron chama a Edge Function generate-empirical-cases todo dia 1º
--   do mês às 03:15 UTC (00:15 em Brasília). A função agrega desfechos
--   de planos encerrados em casos anônimos (k>=3) para o RAG empírico.
--
--   Mesmo padrão de send-consultation-reminders:
--     * URL (não-secreta) vem de platform_settings ('supabase_functions_url')
--     * service_role key vem do VAULT: name='service_role_key_for_cron'
--     * Requer pg_cron + pg_net habilitados
--
--   Rodar manualmente no SQL Editor.
-- =====================================================================

-- Pré-checagem: o job depende destes dois valores; sem eles o cron falharia
-- em silêncio todo mês.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform_settings WHERE key = 'supabase_functions_url') THEN
    RAISE EXCEPTION 'Falta platform_settings.supabase_functions_url — insira antes: INSERT INTO platform_settings (key, value) VALUES (''supabase_functions_url'', ''https://agstaiizemtngcgmliju.supabase.co/functions/v1'');';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron') THEN
    RAISE EXCEPTION 'Falta o segredo service_role_key_for_cron no Vault — crie antes: SELECT vault.create_secret(''<SERVICE_ROLE_KEY>'', ''service_role_key_for_cron'');';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-empirical-cases-monthly') THEN
      PERFORM cron.unschedule('generate-empirical-cases-monthly');
    END IF;

    PERFORM cron.schedule(
      'generate-empirical-cases-monthly',
      '15 3 1 * *',  -- dia 1 de cada mês, 03:15 UTC
      $job$
        SELECT net.http_post(
          url     := (SELECT value FROM platform_settings WHERE key = 'supabase_functions_url') || '/generate-empirical-cases',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron')
          ),
          body    := '{}'::jsonb
        )
      $job$
    );

    RAISE NOTICE 'Cron mensal generate-empirical-cases-monthly agendado (dia 1, 03:15 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron não habilitado — habilite a extensão antes de rodar este script.';
  END IF;
END $$;
