-- =====================================================================
-- Malama — Mantém a API do Caramel acordada (pg_cron + pg_net)
--
-- PROBLEMA (PRECISA SER RE-MEDIDO — ver abaixo)
--   A premissa era: o host do Caramel hiberna após ~15 min sem tráfego.
--   Medido em 02/08/2026: a primeira chamada depois de ocioso levou 48s de
--   relógio, sendo que o próprio Caramel reportou latencia_total_ms=6629 —
--   ou seja, ~42s foram só subir o container.
--
-- !! ESSA MEDIÇÃO É SUSPEITA !!
--   Ela foi feita a partir do .env.local, que apontava para o host ANTIGO
--   (Render free tier, que de fato hiberna). A produção hoje é AWS/Coolify,
--   onde compose.coolify.yaml sobe o container com `restart: unless-stopped`
--   e um sla-monitor interno sondando /pronto a cada 60s — ou seja, não há
--   ociosidade nem hibernação de plataforma. É bem provável que este cron
--   resolva um problema que não existe mais.
--
--   ANTES DE RODAR: deixe a produção ociosa e meça o primeiro GET em
--   /saude contra o host abaixo. Se responder rápido, não agende nada.
--
--   (O sintoma que motivou este arquivo — "Não consegui ler essa foto
--   agora" — tinha outra causa: QWEN_VL_API_KEY não foi cadastrada na
--   migração pro AWS, então imagem levava 400 vision_unavailable, que a
--   Edge Function devolvia como 502. Não era cold start.)
--
-- SOLUÇÃO (se a re-medição confirmar hibernação)
--   Um GET periódico em /v1/models. O endpoint responde 200 SEM chave de
--   API (verificado), então este job não precisa de nenhum segredo — o
--   objetivo é só fazer o roteador subir o container.
--
--   A URL fica em platform_settings sob uma chave contendo "api": a policy
--   "Read non-sensitive settings" (20260811_segredos_e_integracao) já
--   restringe essas chaves ao super admin, então o host do Caramel não
--   vaza para usuário comum. O cron roda como superusuário e lê normalmente.
--
-- JANELA
--   05:00–23:59 (Brasília) = 08:00–02:59 UTC, a cada 10 min. A faixa
--   reduzida era para poupar as horas gratuitas do Render; no AWS/Coolify
--   a instância é paga por tempo ligado de qualquer jeito, então se o cron
--   se provar necessário, use '*' no campo de hora.
--
--   Requer pg_cron + pg_net habilitados. Rodar no SQL Editor.
-- =====================================================================

-- Host de produção AWS/Coolify, confirmado em 02/08/2026 comparando o
-- SHA256 desta string com o digest do secret CARAMELO_API_URL da Edge
-- Function (`supabase secrets list`) — bate exato. O `sslip.io` é temporário
-- até haver domínio próprio; quando trocar, atualizar aqui também, senão o
-- cron esquenta um serviço que ninguém chama e falha em silêncio (o job
-- roda "com sucesso" apontando para o lugar errado).
INSERT INTO platform_settings (key, value)
VALUES ('caramel_api_url', 'https://git-caramel.177.71.153.169.sslip.io')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $$
DECLARE configurado text;
BEGIN
  SELECT value INTO configurado FROM platform_settings WHERE key = 'caramel_api_url';
  RAISE NOTICE 'Cron vai pingar: %  <- confirme que bate com o secret CARAMELO_API_URL', configurado;
END $$;

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
        -- demora ~40s. Mesmo que estoure, o host já foi acordado — a
        -- requisição chegou ao roteador, que é o que importa aqui.
        timeout_milliseconds := 30000
      )
    $job$
  );

  RAISE NOTICE 'Cron caramel-keep-warm agendado (a cada 10 min, 08:00-02:59 UTC).';
END $$;

-- Conferência: deve listar o job com o schedule acima.
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'caramel-keep-warm';
