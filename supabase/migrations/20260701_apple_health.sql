-- =====================================================
-- Malama — Apple HealthKit integration
-- Adds 'apple_health' to the user_integrations service constraint.
-- activities.service e health_daily_metrics.source são TEXT livre — sem alteração.
-- weight_logs.source já inclui 'wearable' — sem alteração.
-- =====================================================

ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_service_check;

ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_service_check
  CHECK (service IN ('strava','google_fit','garmin','polar','samsung','health_connect','apple_health'));
