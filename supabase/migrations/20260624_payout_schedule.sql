-- =====================================================
-- Malama — Novo calendário de repasses aos médicos
-- Migration: 20260624_payout_schedule.sql
--
-- Regra de negócio:
--   • Créditos realizados nos dias 1–14  → pagos no dia 30 do mesmo mês.
--   • Créditos realizados nos dias 15–fim → pagos no dia 15 do mês seguinte.
-- Dá margem para correções antes do repasse efetivo.
--
-- O dia 28 cobre fevereiro (sem dia 30). Em meses de 31 dias as rodadas
-- 28 e 30 caem ambas no ramo "1ª metade" — a 2ª é inócua porque
-- get_unpaid_realized_credits só retorna créditos ainda não pagos.
-- A function determinePeriod() decide o período conforme o dia da execução.
-- =====================================================

-- Remover o job antigo (quinzenal 15/28) caso exista
SELECT cron.unschedule('biweekly-payouts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'biweekly-payouts'
);
SELECT cron.unschedule('payouts-15-30') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'payouts-15-30'
);

-- Novo job: dias 15, 28 e 30 às 02:00 UTC
SELECT cron.schedule(
  'payouts-15-30',
  '0 2 15,28,30 * *',
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
