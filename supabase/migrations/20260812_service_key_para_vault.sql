-- =====================================================
-- Malama — Move a service role key do cron para o Vault
-- Migration: 20260812_service_key_para_vault.sql
--
-- Aplicar via SQL Editor (roda tudo numa transação: se qualquer passo falhar,
-- nada é aplicado e os jobs continuam como estão).
--
-- CONTEXTO
-- A migration 20260811 fechou a LEITURA de platform_settings por não-admin,
-- mas a service role key continuou guardada numa tabela comum — protegida
-- apenas por policy. Aqui ela sai da tabela e vai para o Vault, que guarda
-- cifrado e não é alcançável por PostgREST.
--
-- QUEM USA A CHAVE (levantado antes de mexer):
--   • expire-credits         (20260417) — lê de platform_settings  → migra
--   • payouts-15-30          (20260624) — lê de platform_settings  → migra
--   • consultation-reminders (20260701) — JÁ lê do Vault           → só padroniza
--   • generate-empirical-cases-monthly (script avulso na raiz) — JÁ lê do
--     Vault → padroniza APENAS se o job já estiver agendado
--   • compute-clinical-outcomes (20260627) — não usa a chave (chama função local)
-- Nenhum código do app lê essa chave: só estes jobs.
--
-- ORDEM DE SEGURANÇA: cria o segredo no cofre → reagenda os jobs → confere →
-- só então apaga de platform_settings. Nunca o contrário.
-- =====================================================

-- ── 1. Garantir o segredo no Vault ───────────────────────────────
-- Se o cofre já tem (foi assim que o job de lembretes passou a funcionar),
-- mantém. Se não tem, copia de platform_settings. Se não existe em lugar
-- nenhum, ABORTA — reagendar os jobs sem chave os deixaria quebrados.
DO $$
DECLARE
  v_no_vault  TEXT;
  v_na_tabela TEXT;
BEGIN
  SELECT decrypted_secret INTO v_no_vault
  FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron';

  SELECT value INTO v_na_tabela
  FROM public.platform_settings WHERE key = 'service_role_key_for_cron';

  IF COALESCE(v_no_vault, '') = '' AND COALESCE(v_na_tabela, '') = '' THEN
    RAISE EXCEPTION
      'service_role_key_for_cron não existe nem no Vault nem em platform_settings. Crie o segredo antes: SELECT vault.create_secret(''<service role key>'', ''service_role_key_for_cron'');';
  END IF;

  IF COALESCE(v_no_vault, '') = '' THEN
    PERFORM vault.create_secret(
      v_na_tabela,
      'service_role_key_for_cron',
      'Service role key usada pelos jobs de pg_cron para chamar Edge Functions.'
    );
    RAISE NOTICE 'Segredo copiado de platform_settings para o Vault.';
  ELSE
    RAISE NOTICE 'Segredo já existia no Vault — mantido.';
  END IF;
END $$;


-- ── 2. Ponto único de leitura da chave ───────────────────────────
-- Os jobs passam a chamar esta função em vez de fazer SELECT no cofre.
-- Duas razões:
--   1. Se a chave sumir, o job FALHA com mensagem clara. Antes, 'Bearer ' ||
--      NULL vira NULL: a requisição sai sem Authorization e toma 401 em
--      silêncio — crédito não expira, repasse não roda, e nada avisa.
--   2. Um lugar só para rotacionar depois.
--
-- ⚠️ O REVOKE abaixo não é opcional: uma função SECURITY DEFINER que
-- devolve a service role key, executável por 'authenticated', seria um
-- buraco MAIOR que o original — qualquer usuário logado bastaria chamá-la.
-- Só o dono (postgres, que é quem o pg_cron usa) pode executar.
CREATE OR REPLACE FUNCTION public._cron_service_key()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v TEXT;
BEGIN
  SELECT decrypted_secret INTO v
  FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron';

  IF COALESCE(v, '') = '' THEN
    RAISE EXCEPTION 'service_role_key_for_cron ausente no Vault — job de cron não consegue autenticar.';
  END IF;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public._cron_service_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._cron_service_key() FROM anon;
REVOKE ALL ON FUNCTION public._cron_service_key() FROM authenticated;

COMMENT ON FUNCTION public._cron_service_key() IS
  'Uso exclusivo dos jobs de pg_cron. NUNCA conceder EXECUTE a authenticated/anon: devolve a service role key em texto claro.';


-- ── 3. Reagendar os jobs lendo do Vault ──────────────────────────
-- Mesmos horários de antes; muda só a origem da chave.
--   expire-credits         '5 0 * * *'      (20260417)
--   payouts-15-30          '0 2 15,28,30 * *' (20260624)
--   consultation-reminders '*/5 * * * *'    (20260701)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron não está habilitado — os jobs não existem neste banco.';
  END IF;

  -- expire-credits
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-credits') THEN
    PERFORM cron.unschedule('expire-credits');
  END IF;
  PERFORM cron.schedule(
    'expire-credits',
    '5 0 * * *',
    $job$
      SELECT net.http_post(
        url     := (SELECT value FROM public.platform_settings WHERE key = 'supabase_functions_url') || '/expire-credits',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || public._cron_service_key()
        ),
        body    := '{}'::jsonb
      )
    $job$
  );

  -- payouts-15-30
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'payouts-15-30') THEN
    PERFORM cron.unschedule('payouts-15-30');
  END IF;
  PERFORM cron.schedule(
    'payouts-15-30',
    '0 2 15,28,30 * *',
    $job$
      SELECT net.http_post(
        url     := (SELECT value FROM public.platform_settings WHERE key = 'supabase_functions_url') || '/process-payouts',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || public._cron_service_key()
        ),
        body    := '{}'::jsonb
      )
    $job$
  );

  -- consultation-reminders — já lia do cofre; passa a usar o mesmo ponto
  -- único, ganhando o erro explícito quando a chave falta.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'consultation-reminders') THEN
    PERFORM cron.unschedule('consultation-reminders');
  END IF;
  PERFORM cron.schedule(
    'consultation-reminders',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url     := (SELECT value FROM public.platform_settings WHERE key = 'supabase_functions_url') || '/send-consultation-reminders',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || public._cron_service_key()
        ),
        body    := '{}'::jsonb
      )
    $job$
  );

  -- generate-empirical-cases-monthly — vem de um script avulso na raiz
  -- (supabase-empirical-cases-cron.sql), que pode nunca ter sido rodado.
  -- Só reagenda se JÁ existe: criar aqui um job que o banco não tinha seria
  -- ligar uma rotina por efeito colateral de uma migration de segurança.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-empirical-cases-monthly') THEN
    PERFORM cron.unschedule('generate-empirical-cases-monthly');
    PERFORM cron.schedule(
      'generate-empirical-cases-monthly',
      '15 3 1 * *',
      $job$
        SELECT net.http_post(
          url     := (SELECT value FROM public.platform_settings WHERE key = 'supabase_functions_url') || '/generate-empirical-cases',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || public._cron_service_key()
          ),
          body    := '{}'::jsonb
        )
      $job$
    );
  END IF;
END $$;


-- ── 4. Só agora apagar da tabela ─────────────────────────────────
-- Guardado por verificação explícita: se o cofre não devolver a chave,
-- ABORTA e a transação inteira volta atrás — nada é perdido.
DO $$
DECLARE v TEXT;
BEGIN
  SELECT decrypted_secret INTO v
  FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron';

  IF COALESCE(v, '') = '' THEN
    RAISE EXCEPTION 'Vault não devolveu a chave — nada será removido de platform_settings.';
  END IF;

  DELETE FROM public.platform_settings WHERE key = 'service_role_key_for_cron';
  RAISE NOTICE 'service_role_key_for_cron removida de platform_settings.';
END $$;


-- ── 5. Conferência ───────────────────────────────────────────────
-- Deve retornar: no_vault = true, na_tabela = 0, jobs_com_chave_exposta = 0.
SELECT
  EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron')
    AS no_vault,
  (SELECT count(*) FROM public.platform_settings WHERE key = 'service_role_key_for_cron')
    AS na_tabela,
  (SELECT count(*) FROM cron.job WHERE command LIKE '%service_role_key_for_cron%')
    AS jobs_com_chave_exposta;
