-- =====================================================
-- Malama — O ciclo psicossocial passa a girar sozinho
-- Migration: 20260903_ciclo_psicossocial_automatico.sql
--
-- Aplicar via SQL Editor, depois de 20260902_memoria_do_ciclo_psicossocial.
--
-- O PROBLEMA
-- A cadência era prometida ("mensal", "trimestral") e executada à mão. Uma
-- campanha WHO-5 com janela até 31/08 seguia com status 'aberta' em 09/09,
-- exibindo selo verde de "em andamento" — e como TODA leitura agregada
-- (relatório, comparação entre ciclos, motor de hipóteses) só considera
-- campanha 'encerrada', o ciclo inteiro ficava parado em silêncio
-- esperando um clique que ninguém sabia que devia dar.
--
-- O QUE MUDA
-- Mês fechou, a coleta encerra. Mês novo começou, a próxima abre. O RH
-- deixa de precisar lembrar do calendário — que era, afinal, a promessa
-- do produto.
--
-- O QUE NÃO MUDA, DE PROPÓSITO
--   • A PRIMEIRA campanha de um instrumento continua sendo ato deliberado
--     do RH. Automação continua cadência estabelecida; não decide por uma
--     empresa que ela vai começar a medir.
--   • O recorte (setores) é herdado da última campanha, nunca inventado.
--   • Nenhuma validação é afrouxada: se a empresa não passaria pelas
--     regras de `rh_criar_campanha`, o ciclo NÃO abre sozinho — o painel
--     mostra "nova medição já era esperada" e o RH resolve a pendência.
-- =====================================================


-- =====================================================
-- 0. PREFLIGHT
-- =====================================================

DO $preflight$
DECLARE
  v_faltando TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regclass('public.psychosocial_campaigns') IS NULL THEN
    v_faltando := v_faltando || 'tabela psychosocial_campaigns (20260728_psychosocial_campaign_engine.sql)';
  END IF;
  IF to_regclass('public.psychosocial_setor_links') IS NULL THEN
    v_faltando := v_faltando || 'tabela psychosocial_setor_links (20260803_link_por_setor.sql)';
  END IF;
  IF to_regclass('public.empresa_setores') IS NULL THEN
    v_faltando := v_faltando || 'tabela empresa_setores (20260824_empresa_setores.sql)';
  END IF;
  IF to_regprocedure('public.gerar_token_campanha()') IS NULL THEN
    v_faltando := v_faltando || 'função gerar_token_campanha() (20260803_link_por_setor.sql)';
  END IF;
  IF array_length(v_faltando, 1) > 0 THEN
    RAISE EXCEPTION E'Faltam pré-requisitos para o ciclo automático:\n  - %\n\nNada foi criado.',
      array_to_string(v_faltando, E'\n  - ');
  END IF;
END;
$preflight$;


-- =====================================================
-- 1. O LINK DO SETOR VIRA ENDEREÇO PERMANENTE
--
-- Este bloco NÃO é acessório da automação: sem ele, ela quebra o produto.
--
-- O token nasce preso a uma campanha (`UNIQUE (campaign_id, setor)`), e
-- `campanha_por_link_setor` respondia 'encerrada' assim que aquela campanha
-- fechava. Com o ciclo girando sozinho, todo cartaz e todo QR code colado
-- na parede morreria no primeiro dia de cada mês, e a empresa teria de
-- reimprimir tudo — o oposto de automático.
--
-- A correção é de RESOLUÇÃO, não de schema: o token deixa de responder
-- "a campanha em que fui criado" e passa a responder "a coleta ABERTA
-- deste setor, deste instrumento, desta empresa". A linha em
-- psychosocial_setor_links vira o registro histórico de onde o token
-- nasceu; quem responde é sempre o ciclo vigente.
--
-- Nada muda para quem responde: continua sem login, sem identificação, e
-- as mesmas validações de janela e status seguem aplicadas — agora sobre a
-- campanha certa.
-- =====================================================

/**
 * Campanha ABERTA que um token deve responder hoje.
 *
 * Devolve NULL quando não há ciclo vigente para aquele recorte — inclusive
 * quando existe campanha aberta mas ela não inclui este setor no alvo.
 */
CREATE OR REPLACE FUNCTION public.campanha_vigente_do_token(p_token TEXT)
RETURNS TABLE (
  campaign_id   UUID,
  empresa_id    UUID,
  instrument    TEXT,
  setor         TEXT,
  janela_inicio DATE,
  janela_fim    DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH origem AS (
    SELECT l.setor, c.empresa_id, c.instrument
    FROM public.psychosocial_setor_links l
    JOIN public.psychosocial_campaigns c ON c.id = l.campaign_id
    WHERE l.token = p_token
  )
  SELECT c.id, c.empresa_id, c.instrument, o.setor, c.janela_inicio, c.janela_fim
  FROM origem o
  JOIN public.psychosocial_campaigns c
    ON c.empresa_id = o.empresa_id
   AND c.instrument = o.instrument
   AND c.status = 'aberta'
   -- Campanha com recorte definido só aceita os setores do recorte.
   -- `setores` NULL significa empresa inteira.
   AND (
     c.setores IS NULL
     OR EXISTS (
       SELECT 1 FROM unnest(c.setores) alvo
       WHERE lower(trim(alvo)) = lower(trim(o.setor))
     )
   )
  -- Duas campanhas abertas do mesmo instrumento não deveriam coexistir
  -- (rh_criar_campanha recusa sobreposição), mas ordenar torna a escolha
  -- determinística mesmo se um dado antigo violar isso.
  ORDER BY c.janela_fim DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.campanha_vigente_do_token(TEXT) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.campanha_por_link_setor(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        RECORD;
  v_existe BOOLEAN;
BEGIN
  -- Token existe? Distinguir "link inválido" de "sem ciclo aberto" importa:
  -- a tela diz coisas diferentes, e "link quebrado" assusta quem só pegou
  -- o cartaz fora da janela.
  SELECT EXISTS (SELECT 1 FROM psychosocial_setor_links WHERE token = p_token) INTO v_existe;
  IF NOT v_existe THEN
    RETURN jsonb_build_object('estado', 'invalido');
  END IF;

  SELECT t.campaign_id, t.instrument, t.setor, t.janela_inicio, t.janela_fim,
         i.nome AS instrument_nome, e.nome AS empresa_nome
    INTO v
  FROM campanha_vigente_do_token(p_token) t
  JOIN psychosocial_instruments i ON i.code = t.instrument
  JOIN empresas e                 ON e.id = t.empresa_id;

  -- Sem ciclo aberto para este recorte: a coleta anterior encerrou e a
  -- próxima ainda não começou.
  IF v.campaign_id IS NULL THEN
    RETURN jsonb_build_object('estado', 'encerrada');
  END IF;

  IF CURRENT_DATE < v.janela_inicio OR CURRENT_DATE > v.janela_fim THEN
    RETURN jsonb_build_object('estado', 'fora_da_janela', 'janela_fim', v.janela_fim);
  END IF;

  -- Sem 'ja_respondeu': o link é do setor, não da pessoa. Responder duas
  -- vezes é possível e é o preço aceito pelo anonimato.
  RETURN jsonb_build_object(
    'estado',          'ok',
    'instrument',      v.instrument,
    'instrument_nome', v.instrument_nome,
    'empresa_nome',    v.empresa_nome,
    'setor',           v.setor,
    'janela_fim',      v.janela_fim
  );
END;
$$;

REVOKE ALL ON FUNCTION public.campanha_por_link_setor(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.campanha_por_link_setor(TEXT) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.responder_por_link_setor(
  p_token     TEXT,
  p_answers   JSONB,
  p_raw_score INT,
  p_score     INT,
  p_subscores JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign UUID;
  v_setor    TEXT;
  v_instr    TEXT;
  v_cadencia INT;
  v_inicio   DATE;
  v_fim      DATE;
BEGIN
  SELECT t.campaign_id, t.setor, t.instrument, i.cadencia_meses,
         t.janela_inicio, t.janela_fim
    INTO v_campaign, v_setor, v_instr, v_cadencia, v_inicio, v_fim
  FROM campanha_vigente_do_token(p_token) t
  JOIN psychosocial_instruments i ON i.code = t.instrument;

  IF v_campaign IS NULL THEN
    -- Cobre as duas situações: token inexistente e ciclo já encerrado. A
    -- mensagem fala do prazo porque é o caso real de quem tenta responder.
    RETURN jsonb_build_object('ok', false, 'error', 'Esta pesquisa já foi encerrada.');
  END IF;

  -- A campanha anônima não passa pelo trigger de psychosocial_assessments,
  -- então a janela é validada aqui. (O status já foi filtrado na resolução.)
  IF CURRENT_DATE < v_inicio OR CURRENT_DATE > v_fim THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O prazo para responder terminou.');
  END IF;

  INSERT INTO psychosocial_anonymous_responses
    (campaign_id, setor, instrument, reference_month,
     answers, raw_score, score, subscores)
  VALUES
    (v_campaign, v_setor, v_instr,
     CASE WHEN v_cadencia = 1 THEN date_trunc('month', CURRENT_DATE)::date ELSE NULL END,
     p_answers, p_raw_score, p_score, p_subscores);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.responder_por_link_setor(TEXT, JSONB, INT, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_por_link_setor(TEXT, JSONB, INT, INT, JSONB) TO anon, authenticated;


-- =====================================================
-- 2. A LISTA DO RH DEVOLVE O TOKEN ESTÁVEL
--
-- Antes, cada campanha ganhava tokens novos. Com o ciclo girando sozinho,
-- isso faria a tela mostrar um link diferente do que está impresso no
-- cartaz todo mês — os dois funcionariam (ver bloco 1), mas o RH não teria
-- como saber disso e reimprimiria por precaução.
--
-- Agora o token é criado UMA vez por (empresa, instrumento, setor) e
-- reaproveitado nos ciclos seguintes. `campaign_id` na linha do link passa
-- a significar "campanha em que este token nasceu", não "campanha que ele
-- responde" — quem responde é sempre o ciclo vigente.
-- =====================================================

DROP FUNCTION IF EXISTS public.rh_campanha_links_setor__base(UUID);

CREATE OR REPLACE FUNCTION public.rh_campanha_links_setor__base(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_camp       RECORD;
  v_links      JSONB;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem empresa vinculada');
  END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns
  WHERE id = p_campaign_id AND empresa_id = v_empresa_id;

  IF v_camp.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campanha não encontrada');
  END IF;

  -- Setores do público-alvo: quem tem gente cadastrada, mais os setores
  -- ativos do recorte (modo Compliance não cadastra pessoas, e sem isto
  -- ficaria sem link nenhum).
  WITH alvo AS (
    SELECT DISTINCT COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
    UNION
    SELECT es.nome
    FROM empresa_setores es
    WHERE es.empresa_id = v_camp.empresa_id
      AND es.ativo
      AND (
        v_camp.setores IS NULL
        OR EXISTS (SELECT 1 FROM unnest(v_camp.setores) s
                   WHERE lower(trim(s)) = lower(trim(es.nome)))
      )
  )
  -- Só cria token para setor que ainda não tem um NESTA empresa, NESTE
  -- instrumento — em qualquer campanha, não só nesta. É o que mantém o
  -- cartaz da parede válido de um ciclo para o outro.
  INSERT INTO psychosocial_setor_links (token, campaign_id, setor)
  SELECT gerar_token_campanha(), p_campaign_id, a.setor
  FROM alvo a
  WHERE NOT EXISTS (
    SELECT 1
    FROM psychosocial_setor_links l
    JOIN psychosocial_campaigns c ON c.id = l.campaign_id
    WHERE c.empresa_id = v_camp.empresa_id
      AND c.instrument = v_camp.instrument
      AND lower(trim(l.setor)) = lower(trim(a.setor))
  )
  ON CONFLICT (campaign_id, setor) DO NOTHING;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'setor'), '[]'::jsonb) INTO v_links
  FROM (
    SELECT jsonb_build_object(
      'setor', l.setor,
      'token', l.token,
      'colaboradores', (
        SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int
        FROM empresa_colaboradores ec
        WHERE ec.empresa_id = v_camp.empresa_id
          AND ec.status IN ('ativo', 'convidado')
          AND COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') = l.setor
      )
    ) AS x
    -- Todos os tokens desta empresa/instrumento que servem ao recorte
    -- desta campanha, tenham nascido nela ou num ciclo anterior.
    FROM psychosocial_setor_links l
    JOIN psychosocial_campaigns c ON c.id = l.campaign_id
    WHERE c.empresa_id = v_camp.empresa_id
      AND c.instrument = v_camp.instrument
      AND (
        v_camp.setores IS NULL
        OR EXISTS (SELECT 1 FROM unnest(v_camp.setores) s
                   WHERE lower(trim(s)) = lower(trim(l.setor)))
      )
  ) s;

  RETURN jsonb_build_object(
    'ok',         true,
    'janela_fim', v_camp.janela_fim,
    'links',      v_links
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_campanha_links_setor__base(UUID) FROM PUBLIC, anon, authenticated;

-- Recria o wrapper com gate de módulo (padrão de 20260901_correcoes_auditoria).
CREATE OR REPLACE FUNCTION public.rh_campanha_links_setor(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_campanha_links_setor__base(p_campaign_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_campanha_links_setor(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_campanha_links_setor(UUID) TO authenticated;


-- =====================================================
-- 3. O MOTOR DO CICLO
--
-- Roda sem usuário logado (é o cron quem chama), então NÃO usa auth.uid()
-- em lugar nenhum: toda decisão sai de empresa, instrumento e calendário.
--
-- Idempotente por construção: encerrar já filtra por janela vencida, e
-- abrir só age quando não existe campanha do ciclo corrente. Rodar dez
-- vezes no mesmo dia tem o mesmo efeito de rodar uma.
-- =====================================================

CREATE OR REPLACE FUNCTION public.psicossocial_girar_ciclo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encerradas INT := 0;
  v_abertas    INT := 0;
  v_ignoradas  JSONB := '[]'::jsonb;
  r            RECORD;
  v_inicio     DATE;
  v_fim        DATE;
  v_setores    TEXT[];
  v_pendencia  TEXT;
BEGIN
  -- ── 3a. Encerrar o que a janela já fechou ──
  -- Seguro por construção: responder_por_link_setor já recusava resposta
  -- após janela_fim, então encerrar só formaliza o que o banco garantia.
  -- `encerrada_em` é a âncora que o painel usa para calcular a próxima
  -- medição, por isso recebe o fim da janela e não now(): o ciclo pertence
  -- ao mês em que foi coletado, não ao dia em que o cron passou.
  WITH fechadas AS (
    UPDATE psychosocial_campaigns
    SET status = 'encerrada',
        encerrada_em = (janela_fim + INTERVAL '1 day' - INTERVAL '1 second')
    WHERE status = 'aberta'
      AND janela_fim < CURRENT_DATE
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_encerradas FROM fechadas;

  -- ── 3b. Abrir o ciclo corrente ──
  FOR r IN
    SELECT
      c.empresa_id,
      c.instrument,
      i.cadencia_meses,
      -- Recorte herdado da última campanha: automação continua a decisão
      -- do RH, não cria uma nova.
      (SELECT ult.setores
         FROM psychosocial_campaigns ult
        WHERE ult.empresa_id = c.empresa_id
          AND ult.instrument = c.instrument
          AND ult.status = 'encerrada'
        ORDER BY ult.janela_fim DESC
        LIMIT 1) AS setores_anteriores
    FROM psychosocial_campaigns c
    JOIN psychosocial_instruments i ON i.code = c.instrument
    JOIN empresas e                 ON e.id = c.empresa_id
    WHERE i.ativo
      AND i.cadencia_meses IN (1, 3)
      AND e.status = 'ativa'
      -- Empresa que faz ciclo psicossocial. Metabólico sozinho não mede
      -- risco psicossocial e não deve receber campanha automática.
      AND (COALESCE(e.modo_compliance, false) OR COALESCE(e.modo_mental, false))
      -- Cadência ESTABELECIDA: existe ao menos uma coleta concluída. A
      -- primeira campanha de um instrumento continua sendo decisão humana.
      AND c.status = 'encerrada'
    GROUP BY c.empresa_id, c.instrument, i.cadencia_meses
  LOOP
    -- Janela do ciclo de calendário corrente (mesma aritmética de
    -- rh_criar_campanha, para as duas rotas nunca discordarem).
    v_inicio := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::INT,
      ((EXTRACT(MONTH FROM CURRENT_DATE)::INT - 1) / r.cadencia_meses) * r.cadencia_meses + 1,
      1
    );
    v_fim := (v_inicio + r.cadencia_meses * INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Já existe campanha deste instrumento cobrindo o ciclo corrente?
    -- Inclui 'cancelada': se o RH cancelou o ciclo deste mês, foi decisão
    -- dele — o motor não a desfaz.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM psychosocial_campaigns x
      WHERE x.empresa_id = r.empresa_id
        AND x.instrument = r.instrument
        AND x.janela_inicio <= v_fim
        AND x.janela_fim    >= v_inicio
    );

    -- Recorte válido HOJE: setor arquivado desde o ciclo anterior sai da
    -- lista, senão a campanha nasceria apontando para setor inexistente.
    IF r.setores_anteriores IS NULL THEN
      v_setores := NULL;  -- empresa inteira
    ELSE
      SELECT array_agg(es.nome ORDER BY es.nome) INTO v_setores
      FROM empresa_setores es
      WHERE es.empresa_id = r.empresa_id
        AND es.ativo
        AND EXISTS (SELECT 1 FROM unnest(r.setores_anteriores) s
                    WHERE lower(trim(s)) = lower(trim(es.nome)));
      IF COALESCE(cardinality(v_setores), 0) = 0 THEN
        v_ignoradas := v_ignoradas || jsonb_build_object(
          'empresa_id', r.empresa_id, 'instrumento', r.instrument,
          'motivo', 'nenhum setor do recorte anterior continua ativo');
        CONTINUE;
      END IF;
    END IF;

    -- As MESMAS regras de rh_criar_campanha. Automação não afrouxa
    -- validação: campanha aberta com setor sem efetivo nasce com
    -- denominador quebrado e contamina a taxa de adesão do relatório.
    SELECT string_agg(nome, ', ' ORDER BY nome) INTO v_pendencia
    FROM (
      SELECT es.nome
      FROM empresa_setores es
      WHERE es.empresa_id = r.empresa_id
        AND es.ativo
        AND (v_setores IS NULL
             OR EXISTS (SELECT 1 FROM unnest(v_setores) s
                        WHERE lower(trim(s)) = lower(trim(es.nome))))
        AND GREATEST(
              COALESCE(es.efetivo, 0),
              (SELECT COUNT(*)::int FROM empresa_colaboradores ec
                WHERE ec.empresa_id = es.empresa_id
                  AND ec.status IN ('ativo', 'convidado')
                  AND lower(trim(ec.setor)) = lower(trim(es.nome)))
            ) <= 0
    ) sem_numero;

    IF v_pendencia IS NOT NULL THEN
      -- Não abre e não falha: o painel já mostra "nova medição já era
      -- esperada", e é o RH que resolve a pendência de cadastro.
      v_ignoradas := v_ignoradas || jsonb_build_object(
        'empresa_id', r.empresa_id, 'instrumento', r.instrument,
        'motivo', 'setor sem efetivo informado: ' || v_pendencia);
      CONTINUE;
    END IF;

    -- criada_por NULL: foi o sistema, e o registro precisa dizer isso.
    INSERT INTO psychosocial_campaigns
      (empresa_id, instrument, janela_inicio, janela_fim, setores, criada_por)
    VALUES
      (r.empresa_id, r.instrument, v_inicio, v_fim, v_setores, NULL);

    v_abertas := v_abertas + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'encerradas', v_encerradas,
    'abertas', v_abertas,
    'nao_abertas', v_ignoradas,
    'executado_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.psicossocial_girar_ciclo() FROM PUBLIC, anon, authenticated;


-- =====================================================
-- 4. AGENDAMENTO
--
-- Diário, de madrugada. Não precisa ser mais frequente: a virada é de
-- calendário, e rodar todo dia garante que uma falha isolada se corrija
-- sozinha no dia seguinte, sem intervenção.
--
-- Chamada direta à função SQL — sem net.http_post e sem service key: não
-- há Edge Function no caminho, então não há segredo a vazar.
-- =====================================================

DO $agenda$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron não está habilitado neste banco.';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'psicossocial-girar-ciclo') THEN
    PERFORM cron.unschedule('psicossocial-girar-ciclo');
  END IF;

  -- 03:10 UTC = 00:10 em Brasília. Depois da virada do dia no fuso do
  -- cliente, para o ciclo do mês novo já existir no primeiro acesso.
  PERFORM cron.schedule(
    'psicossocial-girar-ciclo',
    '10 3 * * *',
    $cron$SELECT public.psicossocial_girar_ciclo();$cron$
  );
END;
$agenda$;


-- =====================================================
-- 5. PRIMEIRA EXECUÇÃO
--
-- Roda agora para encerrar o que já venceu e abrir o ciclo corrente, sem
-- esperar a madrugada. É o que corrige, na aplicação desta migração, as
-- campanhas que ficaram penduradas.
-- =====================================================

SELECT public.psicossocial_girar_ciclo();
