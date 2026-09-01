-- =====================================================================
-- Malama — agenda o cron de send-glp1-notifications
--
-- Achado durante a revisão pós-deploy de 01/09/2026: a function existe
-- desde muito antes (calcula dose atrasada, manda Web Push, marca
-- notification_sent), mas nunca teve um `cron.schedule` em nenhuma
-- migração do repositório — confirmado também ao vivo, contra o banco de
-- produção, com `SELECT * FROM cron.job WHERE command ILIKE '%glp1%'`
-- (0 linhas). Nenhum código do repo a chama por nenhum outro caminho
-- (frontend, outra Edge Function). Os lembretes de dose de GLP-1 nunca
-- dispararam de fato — não é regressão de hoje, é uma lacuna anterior.
--
-- Mesmo padrão das duas outras reminder functions já agendadas
-- (consultation-reminders em 20260812_service_key_para_vault.sql,
-- send-rh-reminders-daily em 20260844_rh_lembretes_semanais.sql):
-- `net.http_post` com a service_role_key lida do Vault, nunca hardcoded.
-- É exatamente o token que o guard `autorizado()` da function espera
-- (supabase/functions/send-glp1-notifications/index.ts) — o mesmo guard
-- que motivou originalmente a checagem "isso não vai quebrar um cron que
-- eu não enxergo no repo?", e a resposta, confirmada, foi "não havia
-- cron nenhum".
--
-- Cadência: a cada 5 minutos, conforme o comentário no topo do próprio
-- index.ts ("Runs on a cron every 5 minutes").
-- =====================================================================

BEGIN;

DO $b$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron não está habilitado neste banco.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'pg_net não está habilitado neste banco — net.http_post não vai existir.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron'
  ) THEN
    RAISE EXCEPTION 'Vault não tem o segredo service_role_key_for_cron — '
                    'rode antes 20260812_service_key_para_vault.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_settings WHERE key = 'supabase_functions_url'
  ) THEN
    RAISE EXCEPTION 'platform_settings não tem supabase_functions_url.';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'glp1-dose-reminders') THEN
    PERFORM cron.unschedule('glp1-dose-reminders');
  END IF;

  PERFORM cron.schedule(
    'glp1-dose-reminders',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url     := (SELECT value FROM public.platform_settings WHERE key = 'supabase_functions_url') || '/send-glp1-notifications',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron')
        ),
        body    := '{}'::jsonb
      )
    $job$
  );

  RAISE NOTICE '[glp1] cron "glp1-dose-reminders" agendado (*/5 * * * *).';
END
$b$;

COMMIT;

-- =====================================================================
-- VERIFICAÇÃO (não altera nada)
--
--   SELECT jobid, jobname, schedule, active FROM cron.job
--   WHERE jobname = 'glp1-dose-reminders';
--
-- Depois de alguns minutos, confira nos logs da function (Edge Functions
-- → send-glp1-notifications → Logs) se está sendo chamada com 200, e se
-- a coluna glp1_doses.notification_sent está avançando para quem tinha
-- dose atrasada.
-- =====================================================================
