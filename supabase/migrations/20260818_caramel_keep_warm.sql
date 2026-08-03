-- =====================================================================
-- Malama — Mantém a API do Caramel acordada (pg_cron + pg_net)
--
-- PROBLEMA
--   O host do Caramel hiberna após ~15 min sem tráfego. Medido em
--   02/08/2026: a primeira chamada depois de ocioso levou 48s de relógio,
--   sendo que o próprio Caramel reportou latencia_total_ms=6629 — ou seja,
--   ~42s foram só subir o container. O scan de foto (visão, mais lenta que
--   texto) estourava o timeout do caramel-proxy e o usuário via
--   "Não consegui ler essa foto agora".
--
-- SOLUÇÃO
--   Um GET periódico em /v1/models. O endpoint responde 200 SEM chave de
--   API (verificado), então este job não precisa de nenhum segredo — o
--   objetivo é só fazer o roteador do Render subir o container.
--
--   A URL fica em platform_settings sob uma chave contendo "api": a policy
--   "Read non-sensitive settings" (20260811_segredos_e_integracao) já
--   restringe essas chaves ao super admin, então o host do Caramel não
--   vaza para usuário comum. O cron roda como superusuário e lê normalmente.
--
-- JANELA
--   05:00–23:59 (Brasília) = 08:00–02:59 UTC, a cada 10 min (< os 15 min
--   de ociosidade que derrubam o container). Fora dessa faixa ele dorme de
--   propósito: manter 24/7 consumiria ~730h/mês, praticamente toda a cota
--   de horas gratuitas do Render. Para 24/7, troque o campo de hora por '*'.
--
--   Requer pg_cron + pg_net habilitados. Rodar no SQL Editor.
-- =====================================================================

-- A URL não vem daqui por padrão: cada ambiente aponta para o seu Caramel.
-- Ajuste o valor abaixo se o host mudar.
INSERT INTO platform_settings (key, value)
VALUES ('caramel_api_url', 'https://caramelo-api.onrender.com')
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron não habilitado — habilite a extensão antes de rodar este script.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net não habilitado — habilite a extensão antes de rodar este script.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'caramel-keep-warm') THEN
    PERFORM cron.unschedule('caramel-keep-warm');
  END IF;

  PERFORM cron.schedule(
    'caramel-keep-warm',
    '*/10 0-2,8-23 * * *',  -- a cada 10 min, 05:00–23:59 em Brasília
    $job$
      SELECT net.http_get(
        url                  := (SELECT value FROM platform_settings WHERE key = 'caramel_api_url') || '/v1/models',
        -- Generoso de propósito: quando o container está frio a resposta
        -- demora ~40s. Mesmo que estoure, o Render já foi acordado — a
        -- requisição chegou ao roteador, que é o que importa aqui.
        timeout_milliseconds := 30000
      )
    $job$
  );

  RAISE NOTICE 'Cron caramel-keep-warm agendado (a cada 10 min, 08:00-02:59 UTC).';
END $$;

-- Conferência: deve listar o job com o schedule acima.
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'caramel-keep-warm';
