-- =====================================================================
-- Malama — remoção completa da integração Strava (01/09/2026)
--
-- Decisão de produto: a cobertura de atividade física passou a ser só
-- Apple HealthKit e Google Health Connect — on-device, sem OAuth de
-- terceiro. Garmin, Polar e Samsung Health saíram junto (eram cards
-- só de UI, `uiOnly: true`, sem função nenhuma por trás).
--
-- O que este arquivo faz: aperta o domínio de valores de
-- user_integrations.service para não aceitar mais os serviços
-- descontinuados — não é correção de segurança (RLS/auth continuam
-- valendo do mesmo jeito), é higiene de schema: nenhum código escreve
-- esses valores desde a remoção, então o CHECK deveria refletir isso.
--
-- O QUE ESTE ARQUIVO *NÃO* FAZ, DE PROPÓSITO:
--
--   • Não apaga nem altera public.strava_connections. A tabela guarda
--     access_token/refresh_token que supabase/functions/delete-account
--     ainda usa para revogar a autorização no Strava quando um usuário
--     que chegou a conectar apaga a própria conta — apagar a coluna
--     quebraria essa limpeza. As Edge Functions que renovavam e liam
--     esses tokens para sincronizar (strava-sync, strava-refresh-token)
--     já foram desligadas (devolvem 410); os tokens vão simplesmente
--     ficar obsoletos com o tempo.
--
--   • Não apaga linhas de public.activities com service='strava'. É
--     histórico de treino do próprio usuário, não credencial — some a
--     alimentação de dados novos, mas o que já existe continua sendo
--     dado dele.
--
-- FECHAMENTO QUE FICA FORA DO CÓDIGO: para invalidar de vez os tokens
-- OAuth que ainda estão em strava_connections, desative o app da Malama
-- no painel de desenvolvedor do Strava (ou gire o client secret) — isso
-- revoga todos os tokens emitidos de uma vez, do lado do Strava. Não é
-- algo que uma migration ou uma Edge Function consiga fazer.
-- =====================================================================

BEGIN;

DO $b$
BEGIN
  IF to_regclass('public.user_integrations') IS NOT NULL THEN
    ALTER TABLE public.user_integrations
      DROP CONSTRAINT IF EXISTS user_integrations_service_check;
    ALTER TABLE public.user_integrations
      ADD CONSTRAINT user_integrations_service_check
      CHECK (service IN ('google_fit', 'health_connect', 'apple_health'));
    RAISE NOTICE '[strava-removal] CHECK de user_integrations.service apertado.';
  ELSE
    RAISE NOTICE '[strava-removal] public.user_integrations nao existe neste banco — nada a fazer.';
  END IF;
END
$b$;

COMMIT;
