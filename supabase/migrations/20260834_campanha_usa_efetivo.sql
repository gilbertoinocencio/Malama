-- =====================================================
-- Malama — Campanha passa a considerar o efetivo do setor
-- Migration: 20260834_campanha_usa_efetivo.sql
--
-- Aplicar via SQL Editor, depois de 20260833.
--
-- O QUE O RH VIU
--   Setor "Marketing" criado com efetivo 5 aparecia como "Marketing (0)" no
--   público-alvo da campanha. O número do chip vinha de `rh_setores()`, que
--   conta COLABORADORES COM ASSENTO — e ninguém do Marketing tem app.
--
-- POR QUE TROCAR SÓ O NÚMERO DA TELA SERIA PIOR QUE DEIXAR ERRADO
--   Havia mais duas camadas contando a mesma coisa errada, e as três
--   precisam mudar juntas, senão a tela promete alcance que o sistema não
--   entrega:
--
--   1. `rh_campanha_links_setor` monta a lista de links a partir de
--      empresa_colaboradores. Setor sem ninguém cadastrado NÃO GERA LINK.
--      A campanha sairia, o chip diria "5", e não existiria por onde as 5
--      pessoas responderem.
--
--   2. `rh_campanha_participacao` monta `convidados` da mesma fonte, e o
--      relatório parte dessa CTE. Setor sem assento não apareceria na quebra
--      — e, pior, as respostas anônimas dele seriam descartadas até do total
--      da campanha. Adesão real ficaria invisível.
--
--   Depois desta migration, o efetivo declarado é o denominador do alcance
--   nas três: quem tem link, quantas pessoas o link precisa alcançar e sobre
--   quantas se mede adesão.
--
-- SOBRE O PISO k
--   O piso continua 5 e continua sendo o TAMANHO DA COORTE — só passa a ser
--   medido sobre o efetivo real em vez do número de assentos. Isso não
--   afrouxa privacidade: assentos SUBESTIMAVAM a coorte, então setores de 6
--   pessoas reais com 2 assentos eram suprimidos sem necessidade. O que a
--   regra sempre quis dizer é "não mostre recorte de menos de 5 pessoas", e
--   agora ela mede as pessoas certas.
--
-- ESCOPO
--   Só o fluxo de campanha. Absenteísmo, ambulatório e matriz seguem com o
--   denominador de assentos — mexer neles altera números que podem já ter
--   ido para dentro de um PGR assinado, e é decisão à parte.
-- =====================================================

-- =====================================================
-- 1. rh_setores() devolve o efetivo
--
-- Assinatura muda (ganha coluna), por isso o DROP.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setores();

CREATE OR REPLACE FUNCTION rh_setores()
RETURNS TABLE (setor TEXT, n INT, efetivo INT) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()
  ),
  colab AS (
    SELECT lower(TRIM(ec.setor))  AS chave,
           MIN(TRIM(ec.setor))    AS nome,
           COUNT(*)::int          AS qtd
      FROM empresa_colaboradores ec
     WHERE ec.empresa_id IN (SELECT empresa_id FROM emp)
       AND ec.status IN ('ativo', 'convidado')
       AND NULLIF(TRIM(ec.setor), '') IS NOT NULL
     GROUP BY lower(TRIM(ec.setor))
  ),
  reg AS (
    SELECT lower(TRIM(s.nome)) AS chave, s.nome, s.efetivo AS declarado
      FROM empresa_setores s
     WHERE s.empresa_id IN (SELECT empresa_id FROM emp)
       AND s.ativo
  ),
  uniao AS (
    SELECT DISTINCT ON (t.chave) t.chave, t.nome, t.declarado, t.prio
      FROM (
        SELECT r.chave, r.nome, r.declarado, 0 AS prio FROM reg r
        UNION ALL
        SELECT c.chave, c.nome, NULL::int AS declarado, 1 AS prio FROM colab c
      ) t
     ORDER BY t.chave, t.prio
  )
  SELECT u.nome, COALESCE(c.qtd, 0), u.declarado
    FROM uniao u
    LEFT JOIN colab c ON c.chave = u.chave
   ORDER BY 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_setores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setores() TO authenticated;


-- =====================================================
-- 2. Links: setor com efetivo declarado também recebe link
-- =====================================================

CREATE OR REPLACE FUNCTION rh_campanha_links_setor(p_campaign_id UUID)
RETURNS JSONB AS $$
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

  -- Um link por setor do público-alvo. Idempotente.
  INSERT INTO psychosocial_setor_links (token, campaign_id, setor)
  SELECT gerar_token_campanha(), p_campaign_id, s.setor
  FROM (
    -- Setores que têm gente cadastrada.
    SELECT DISTINCT COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))

    UNION

    -- Setores com efetivo declarado e nenhum cadastro. Sem esta parte, o
    -- setor entrava no público-alvo e ficava sem link — a campanha existia
    -- para ele no papel e não chegava a ninguém.
    SELECT es.nome
    FROM empresa_setores es
    WHERE es.empresa_id = v_camp.empresa_id
      AND es.ativo
      AND COALESCE(es.efetivo, 0) > 0
      AND (v_camp.setores IS NULL OR es.nome = ANY (v_camp.setores))
  ) s
  ON CONFLICT (campaign_id, setor) DO NOTHING;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'setor'), '[]'::jsonb) INTO v_links
  FROM (
    SELECT jsonb_build_object(
      'setor', l.setor,
      'token', l.token,
      -- Quantas pessoas aquele link precisa alcançar: o efetivo declarado
      -- quando houver, nunca menos que o número de cadastrados.
      'colaboradores', GREATEST(
        (
          SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int
          FROM empresa_colaboradores ec
          WHERE ec.empresa_id = v_camp.empresa_id
            AND ec.status IN ('ativo', 'convidado')
            AND COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') = l.setor
        ),
        COALESCE((
          SELECT es.efetivo
          FROM empresa_setores es
          WHERE es.empresa_id = v_camp.empresa_id
            AND lower(TRIM(es.nome)) = lower(TRIM(l.setor))
          LIMIT 1
        ), 0)
      )
    ) AS x
    FROM psychosocial_setor_links l
    WHERE l.campaign_id = p_campaign_id
  ) s;

  RETURN jsonb_build_object(
    'ok',         true,
    'janela_fim', v_camp.janela_fim,
    'links',      v_links
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_campanha_links_setor(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_links_setor(UUID) TO authenticated;


-- =====================================================
-- 3. Participação: convidados = efetivo, com piso no nº de cadastrados
-- =====================================================

CREATE OR REPLACE FUNCTION rh_campanha_participacao(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id  UUID;
  v_camp        RECORD;
  v_min         CONSTANT INT := 5;
  v_setores     JSONB;
  v_conv        INT;
  v_resp        INT;
  v_balde_conv  INT;
  v_balde_resp  INT;
  v_balde_n     INT;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns
  WHERE id = p_campaign_id AND empresa_id = v_empresa_id;

  IF v_camp.id IS NULL THEN RETURN NULL; END IF;

  WITH alvo AS (
    -- Uma linha por PESSOA COM CADASTRO. Continua sendo a base do respondente
    -- identificado: só quem tem conta responde pelo app.
    SELECT DISTINCT ON (COALESCE(ec.user_id::text, ec.id::text))
      ec.user_id,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
    ORDER BY COALESCE(ec.user_id::text, ec.id::text), ec.data_adicao DESC
  ),
  assentos AS (
    SELECT a.setor, COUNT(*)::int AS n FROM alvo a GROUP BY a.setor
  ),
  declarados AS (
    SELECT es.nome AS setor, es.efetivo::int AS n
    FROM empresa_setores es
    WHERE es.empresa_id = v_camp.empresa_id
      AND es.ativo
      AND COALESCE(es.efetivo, 0) > 0
      AND (v_camp.setores IS NULL OR es.nome = ANY (v_camp.setores))
  ),
  -- FULL JOIN: entra quem tem cadastro, quem tem só efetivo declarado, e
  -- quem tem os dois — neste caso vence o maior, que é o tamanho real.
  convidados AS (
    SELECT
      COALESCE(a.setor, d.setor) AS setor,
      GREATEST(COALESCE(a.n, 0), COALESCE(d.n, 0)) AS n
    FROM assentos a
    FULL JOIN declarados d ON lower(TRIM(d.setor)) = lower(TRIM(a.setor))
  ),
  -- Respondentes identificados (app, com login), mapeados ao setor do alvo.
  ident AS (
    SELECT a.setor, COUNT(DISTINCT pa.user_id)::int AS n
    FROM psychosocial_assessments pa
    JOIN alvo a ON a.user_id = pa.user_id
    WHERE pa.campaign_id = p_campaign_id
    GROUP BY a.setor
  ),
  -- Respondentes anônimos (link do setor). Sem dedup por pessoa — é o preço
  -- do anonimato, e por isso a taxa pode passar de 100%.
  anon AS (
    SELECT ar.setor, COUNT(*)::int AS n
    FROM psychosocial_anonymous_responses ar
    WHERE ar.campaign_id = p_campaign_id
    GROUP BY ar.setor
  ),
  por_setor AS (
    SELECT
      c.setor,
      c.n AS convidados,
      COALESCE(i.n, 0) + COALESCE(x.n, 0) AS respondentes
    FROM convidados c
    LEFT JOIN ident i ON lower(TRIM(i.setor)) = lower(TRIM(c.setor))
    LEFT JOIN anon  x ON lower(TRIM(x.setor)) = lower(TRIM(c.setor))
  ),
  grandes AS (SELECT * FROM por_setor WHERE convidados >= v_min),
  pequenos AS (SELECT * FROM por_setor WHERE convidados < v_min)
  SELECT
    (SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'setor',        g.setor,
          'convidados',   g.convidados,
          'respondentes', g.respondentes,
          -- Teto de 100: sem dedup a taxa pode estourar, e barra passando de
          -- 100% parece defeito para quem lê.
          'taxa',         LEAST(100, CASE WHEN g.convidados > 0
                                          THEN ROUND(g.respondentes * 100.0 / g.convidados)::int
                                          ELSE 0 END),
          'agrupado',     false
        ) ORDER BY g.setor
      ), '[]'::jsonb) FROM grandes g),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM pequenos),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM pequenos),
    (SELECT COUNT(*)::int                        FROM pequenos),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM por_setor),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM por_setor)
  INTO v_setores, v_balde_conv, v_balde_resp, v_balde_n, v_conv, v_resp;

  IF v_balde_conv >= v_min THEN
    v_setores := v_setores || jsonb_build_array(jsonb_build_object(
      'setor',        'Demais setores',
      'convidados',   v_balde_conv,
      'respondentes', v_balde_resp,
      'taxa',         LEAST(100, ROUND(v_balde_resp * 100.0 / v_balde_conv)::int),
      'agrupado',     true
    ));
    v_balde_n    := 0;
    v_balde_conv := 0;
  END IF;

  RETURN jsonb_build_object(
    'campaign_id',        p_campaign_id,
    'convidados',         v_conv,
    'respondentes',       v_resp,
    'taxa',               LEAST(100, CASE WHEN v_conv > 0
                                          THEN ROUND(v_resp * 100.0 / v_conv)::int
                                          ELSE 0 END),
    'setores',            v_setores,
    'min_coorte',         v_min,
    'ocultos_setores',    v_balde_n,
    'ocultos_convidados', v_balde_conv
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_campanha_participacao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_participacao(UUID) TO authenticated;


-- =====================================================
-- 4. rh_alvo_total(): "toda a empresa" também conta o efetivo
--
-- É o número que a tela mostra para o alvo "Toda a empresa". Ficaria
-- contraditório somar 5 ao escolher Marketing e ignorar as mesmas 5 pessoas
-- ao escolher a empresa inteira.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_alvo_total()
RETURNS INT AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()
  ),
  assentos AS (
    SELECT COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor,
           COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int AS n
      FROM empresa_colaboradores ec
     WHERE ec.empresa_id IN (SELECT empresa_id FROM emp)
       AND ec.status IN ('ativo', 'convidado')
     GROUP BY COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor')
  ),
  declarados AS (
    SELECT es.nome AS setor, es.efetivo::int AS n
      FROM empresa_setores es
     WHERE es.empresa_id IN (SELECT empresa_id FROM emp)
       AND es.ativo
       AND COALESCE(es.efetivo, 0) > 0
  )
  SELECT COALESCE(SUM(GREATEST(COALESCE(a.n, 0), COALESCE(d.n, 0))), 0)::int
    FROM assentos a
    FULL JOIN declarados d ON lower(TRIM(d.setor)) = lower(TRIM(a.setor));
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_alvo_total() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_alvo_total() TO authenticated;
