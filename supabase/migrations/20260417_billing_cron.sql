-- =====================================================
-- NURA — pg_cron Jobs para Billing
-- Migration: 20260417_billing_cron.sql
--
-- ATENÇÃO: Este script deve ser executado APÓS a extensão
-- pg_cron estar habilitada no Supabase Dashboard:
-- Database → Extensions → pg_cron
--
-- As URLs das functions precisam ser configuradas em
-- platform_settings com as chaves:
--   'supabase_functions_url'  → ex: https://xyz.supabase.co/functions/v1
--   'service_role_key_for_cron' → sua service role key
--
-- Ou substitua diretamente os valores abaixo antes de executar.
-- =====================================================

-- Remover jobs existentes caso já existam (idempotente)
SELECT cron.unschedule('expire-credits')    WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-credits'
);
SELECT cron.unschedule('biweekly-payouts')  WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'biweekly-payouts'
);

-- Job 1: Expira créditos todo dia às 00:05 UTC
SELECT cron.schedule(
  'expire-credits',
  '5 0 * * *',
  $$
    SELECT net.http_post(
      url     := (SELECT value FROM platform_settings WHERE key = 'supabase_functions_url') || '/expire-credits',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM platform_settings WHERE key = 'service_role_key_for_cron')
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- Job 2: Split quinzenal — dias 15 e 28 às 02:00 UTC
-- Dia 28 cobre fevereiro; a function internamente verifica qual período processar
SELECT cron.schedule(
  'biweekly-payouts',
  '0 2 15,28 * *',
  $$
    SELECT net.http_post(
      url     := (SELECT value FROM platform_settings WHERE key = 'supabase_functions_url') || '/process-payouts',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM platform_settings WHERE key = 'service_role_key_for_cron')
      ),
      body    := '{}'::jsonb
    )
  $$
);
