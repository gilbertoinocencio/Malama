-- =====================================================
-- Malama — Link por SETOR (substitui o link por pessoa)
-- Migration: 20260803_link_por_setor.sql
--
-- Aplicar depois de 20260803_corrige_duplicata_colaborador.
--
-- POR QUE TROCAR O MODELO
--   O link por pessoa resolvia dedup e setor, mas tinha dois defeitos que
--   inviabilizavam o produto:
--     1. ESCALA — empresa de mil colaboradores exigia mil links. Não há como
--        distribuir isso sem um disparo automatizado.
--     2. CONFIANÇA — o RH ficava com o link de cada um. Mesmo sem uma lista
--        de "quem respondeu", dava para abrir o link de alguém e ver o
--        estado, ou responder no lugar. Numa pesquisa de saúde mental a
--        DESCONFIANÇA é suficiente para derrubar a adesão, mesmo que o
--        vazamento nunca aconteça.
--
--   Agora: UM link por setor. Empresa com 10 setores gera 10 links, não mil.
--   Ninguém se identifica. O setor vem embutido no link, então o recorte que
--   sustenta o PGR e a matriz de risco continua exato.
--
-- O QUE SE PERDE, EXPLICITAMENTE
--   Dedup por pessoa. Com link compartilhado não existe como saber que dois
--   envios vieram da mesma pessoa:
--     · IP não serve — a fábrica inteira sai por um NAT só, e o primeiro
--       respondente bloquearia os demais; em 4G o IP é compartilhado por
--       milhares.
--     · Navegador não serve como identidade — diz "mesmo aparelho", nunca
--       "quem". E em terminal compartilhado do chão de fábrica bloquearia
--       o segundo respondente legítimo.
--     · Ambos, além disso, são dado pessoal na LGPD: guardá-los junto de uma
--       resposta de saúde mental tornaria o registro MAIS identificável —
--       o oposto do objetivo.
--   O front usa um marcador de navegador apenas como freio suave (avisa, não
--   bloqueia). Consequência aceita: a adesão de um setor pode passar de 100%.
--
-- POR QUE TABELA SEPARADA PARA A RESPOSTA ANÔNIMA
--   `psychosocial_assessments` é registro clínico: tem user_id NOT NULL, é
--   lida pelo psicólogo no prontuário (psi_contexto_paciente) e alimenta o
--   loop clínico. Misturar linha anônima ali contaminaria o prontuário e
--   exigiria afrouxar o NOT NULL. A resposta anônima mora em tabela própria
--   e as duas se encontram só na leitura, pela view abaixo.
-- =====================================================

-- =====================================================
-- 1. LINKS POR SETOR
-- =====================================================

CREATE TABLE IF NOT EXISTS psychosocial_setor_links (
  token       TEXT PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES psychosocial_campaigns(id) ON DELETE CASCADE,
  -- Setor já normalizado ('Sem setor' para quem não tem), porque é o valor
  -- que vai ser gravado na resposta e comparado no relatório.
  setor       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Reemitir a lista não troca o link de um setor que já foi divulgado.
  UNIQUE (campaign_id, setor)
);

CREATE INDEX IF NOT EXISTS idx_setor_links_campaign
  ON psychosocial_setor_links(campaign_id);

ALTER TABLE psychosocial_setor_links ENABLE ROW LEVEL SECURITY;
-- Sem policy: só as funções SECURITY DEFINER abaixo tocam.


-- =====================================================
-- 2. RESPOSTAS ANÔNIMAS
--
-- Sem user_id, de propósito e para sempre. Não existe coluna de IP, de
-- fingerprint nem de e-mail: o que não é coletado não vaza, não precisa ser
-- protegido e não aparece numa ação judicial.
-- =====================================================

CREATE TABLE IF NOT EXISTS psychosocial_anonymous_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES psychosocial_campaigns(id) ON DELETE CASCADE,
  setor           TEXT NOT NULL,
  instrument      TEXT NOT NULL REFERENCES psychosocial_instruments(code),
  reference_month DATE,
  answers         JSONB NOT NULL,
  raw_score       INT  NOT NULL,
  score           INT  NOT NULL,
  subscores       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anon_resp_campaign
  ON psychosocial_anonymous_responses(campaign_id);

ALTER TABLE psychosocial_anonymous_responses ENABLE ROW LEVEL SECURITY;
-- Sem policy: nem RH, nem paciente, nem psicólogo leem direto.


-- =====================================================
-- 3. VIEW UNIFICADA DE LEITURA
--
-- Existe para que "incluir a resposta anônima" seja UMA mudança e não
-- quatro: o mesmo CTE de respostas estava copiado 4 vezes entre o relatório
-- e a matriz, e cópia é como o `/q/` foi esquecido numa das listas de rota.
--
-- `chave` é o que permite deduplicar os dois tipos na mesma consulta:
--   · identificada → 'u:<user>:<instrumento>', então DISTINCT ON mantém só a
--     resposta mais recente daquela pessoa naquele instrumento;
--   · anônima      → 'a:<id da linha>', única por definição, então cada
--     resposta conta uma vez e nenhuma é colapsada com outra.
-- =====================================================

CREATE OR REPLACE VIEW psychosocial_respostas AS
WITH colab AS (
  -- Uma linha por pessoa por empresa: empresa_colaboradores guarda histórico
  -- e o join sem isto multiplica a contagem (ver 20260803_corrige_duplicata).
  SELECT DISTINCT ON (user_id, empresa_id)
    user_id, empresa_id, setor
  FROM empresa_colaboradores
  WHERE user_id IS NOT NULL
    AND status <> 'removido'
  ORDER BY user_id, empresa_id, data_adicao DESC
)
SELECT
  'u:' || pa.user_id::text || ':' || pa.instrument       AS chave,
  c.empresa_id,
  pa.user_id,
  COALESCE(NULLIF(TRIM(c.setor), ''), 'Sem setor')       AS setor,
  pa.instrument,
  pa.score,
  pa.subscores,
  pa.reference_month,
  COALESCE(pa.reference_month, pa.created_at::date)      AS data_ref,
  pa.created_at,
  pa.campaign_id,
  false                                                  AS anonima
FROM psychosocial_assessments pa
JOIN colab c ON c.user_id = pa.user_id

UNION ALL

SELECT
  'a:' || ar.id::text,
  cp.empresa_id,
  NULL::uuid,
  COALESCE(NULLIF(TRIM(ar.setor), ''), 'Sem setor'),
  ar.instrument,
  ar.score,
  ar.subscores,
  ar.reference_month,
  COALESCE(ar.reference_month, ar.created_at::date),
  ar.created_at,
  ar.campaign_id,
  true
FROM psychosocial_anonymous_responses ar
JOIN psychosocial_campaigns cp ON cp.id = ar.campaign_id;

-- A view atravessa empresas: quem lê tem que filtrar por empresa_id. Só as
-- funções SECURITY DEFINER abaixo enxergam.
REVOKE ALL ON psychosocial_respostas FROM PUBLIC, anon, authenticated;


-- =====================================================
-- 4. RPC DO RH — emitir e listar os links por setor
-- =====================================================

DROP FUNCTION IF EXISTS rh_campanha_links_setor(UUID);

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

  -- Um link por setor que tem gente no público-alvo. Idempotente.
  INSERT INTO psychosocial_setor_links (token, campaign_id, setor)
  SELECT gerar_token_campanha(), p_campaign_id, s.setor
  FROM (
    SELECT DISTINCT COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
  ) s
  ON CONFLICT (campaign_id, setor) DO NOTHING;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'setor'), '[]'::jsonb) INTO v_links
  FROM (
    SELECT jsonb_build_object(
      'setor', l.setor,
      'token', l.token,
      -- Quantas pessoas aquele link precisa alcançar. É o denominador da
      -- adesão do setor, e o que diz ao RH onde vale imprimir cartaz.
      'colaboradores', (
        SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int
        FROM empresa_colaboradores ec
        WHERE ec.empresa_id = v_camp.empresa_id
          AND ec.status IN ('ativo', 'convidado')
          AND COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') = l.setor
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
-- 5. RPC PÚBLICA — abrir o link
-- =====================================================

DROP FUNCTION IF EXISTS campanha_por_link_setor(TEXT);

CREATE OR REPLACE FUNCTION campanha_por_link_setor(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT
    c.id AS campaign_id, c.instrument, c.status,
    c.janela_inicio, c.janela_fim,
    i.nome AS instrument_nome,
    e.nome AS empresa_nome,
    l.setor
  INTO v
  FROM psychosocial_setor_links l
  JOIN psychosocial_campaigns c   ON c.id = l.campaign_id
  JOIN psychosocial_instruments i ON i.code = c.instrument
  JOIN empresas e                 ON e.id = c.empresa_id
  WHERE l.token = p_token;

  IF v.campaign_id IS NULL THEN
    RETURN jsonb_build_object('estado', 'invalido');
  END IF;

  IF v.status <> 'aberta' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION campanha_por_link_setor(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION campanha_por_link_setor(TEXT) TO anon, authenticated;


-- =====================================================
-- 6. RPC PÚBLICA — gravar a resposta anônima
-- =====================================================

DROP FUNCTION IF EXISTS responder_por_link_setor(TEXT, JSONB, INT, INT, JSONB);

CREATE OR REPLACE FUNCTION responder_por_link_setor(
  p_token     TEXT,
  p_answers   JSONB,
  p_raw_score INT,
  p_score     INT,
  p_subscores JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_campaign UUID;
  v_setor    TEXT;
  v_instr    TEXT;
  v_cadencia INT;
  v_status   TEXT;
  v_inicio   DATE;
  v_fim      DATE;
BEGIN
  SELECT c.id, l.setor, c.instrument, i.cadencia_meses, c.status,
         c.janela_inicio, c.janela_fim
    INTO v_campaign, v_setor, v_instr, v_cadencia, v_status, v_inicio, v_fim
  FROM psychosocial_setor_links l
  JOIN psychosocial_campaigns c   ON c.id = l.campaign_id
  JOIN psychosocial_instruments i ON i.code = c.instrument
  WHERE l.token = p_token;

  IF v_campaign IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Link inválido');
  END IF;

  -- A campanha anônima não passa pelo trigger de psychosocial_assessments,
  -- então a janela e o status são validados aqui.
  IF v_status <> 'aberta' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta pesquisa já foi encerrada.');
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION responder_por_link_setor(TEXT, JSONB, INT, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION responder_por_link_setor(TEXT, JSONB, INT, INT, JSONB) TO anon, authenticated;


-- =====================================================
-- 7. LEITURAS PASSAM A ENXERGAR A RESPOSTA ANÔNIMA
-- =====================================================

-- ── 7a. Lista de campanhas: respondentes = identificados + anônimos ──
CREATE OR REPLACE FUNCTION rh_listar_campanhas()
RETURNS TABLE (
  id UUID, instrument TEXT, instrument_nome TEXT, eixo TEXT,
  janela_inicio DATE, janela_fim DATE, setores TEXT[], status TEXT,
  encerrada_em TIMESTAMPTZ, created_at TIMESTAMPTZ,
  n_convidados INT, n_respondentes INT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT
    c.id, c.instrument, i.nome, i.eixo,
    c.janela_inicio, c.janela_fim, c.setores, c.status,
    c.encerrada_em, c.created_at,
    -- DISTINCT: empresa_colaboradores guarda histórico.
    (SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int
       FROM empresa_colaboradores ec
      WHERE ec.empresa_id = c.empresa_id
        AND ec.status IN ('ativo', 'convidado')
        AND (c.setores IS NULL OR ec.setor = ANY (c.setores))),
    (SELECT COUNT(DISTINCT pa.user_id)::int
       FROM psychosocial_assessments pa
      WHERE pa.campaign_id = c.id)
    + (SELECT COUNT(*)::int
         FROM psychosocial_anonymous_responses ar
        WHERE ar.campaign_id = c.id)
  FROM psychosocial_campaigns c
  JOIN psychosocial_instruments i ON i.code = c.instrument
  WHERE c.empresa_id = (SELECT empresa_id FROM emp)
  ORDER BY c.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_listar_campanhas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_listar_campanhas() TO authenticated;


-- ── 7b. Adesão por setor (mantém o piso k de 20260731) ──
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
    SELECT DISTINCT ON (COALESCE(ec.user_id::text, ec.id::text))
      ec.user_id,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
    ORDER BY COALESCE(ec.user_id::text, ec.id::text), ec.data_adicao DESC
  ),
  convidados AS (
    SELECT setor, COUNT(*)::int AS n FROM alvo GROUP BY setor
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
    LEFT JOIN ident i ON i.setor = c.setor
    LEFT JOIN anon  x ON x.setor = c.setor
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


-- ── 7c. Relatório PGR (WHO-5) — agora lendo da view ──
CREATE OR REPLACE FUNCTION rh_relatorio_psicossocial(p_inicio DATE, p_fim DATE)
RETURNS JSONB AS $$
DECLARE
  k_min      CONSTANT INT := 5;
  v_empresa  RECORD;
  v_geral    JSONB;
  v_setores  JSONB;
  v_supr     INT;
BEGIN
  SELECT e.id, e.nome, e.cnpj INTO v_empresa
  FROM empresas e
  WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  LIMIT 1;

  IF v_empresa.id IS NULL THEN RETURN NULL; END IF;

  WITH ultima AS (
    SELECT DISTINCT ON (r.chave) r.chave, r.score, r.setor
    FROM psychosocial_respostas r
    WHERE r.empresa_id = v_empresa.id
      AND r.instrument = 'who5'
      AND r.data_ref >= date_trunc('month', p_inicio)::date
      AND r.data_ref <= p_fim
    ORDER BY r.chave, r.data_ref DESC, r.created_at DESC
  ),
  por_setor AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS score_medio,
      COUNT(*) FILTER (WHERE score < 50)::int AS faixa_reduzido,
      COUNT(*) FILTER (WHERE score <= 28)::int AS faixa_risco
    FROM ultima
    GROUP BY 1
  )
  SELECT
    (SELECT CASE WHEN COUNT(*) >= k_min THEN
      jsonb_build_object(
        'n_respondentes', COUNT(*)::int,
        'score_medio',    ROUND(AVG(score))::int,
        'faixa_reduzido', COUNT(*) FILTER (WHERE score < 50)::int,
        'faixa_risco',    COUNT(*) FILTER (WHERE score <= 28)::int
      )
     ELSE jsonb_build_object('n_respondentes', COUNT(*)::int, 'suprimido', true)
     END FROM ultima),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor', setor,
        'n_respondentes', n,
        'score_medio', score_medio,
        'faixa_reduzido', faixa_reduzido,
        'faixa_risco', faixa_risco
      ) ORDER BY setor
    ) FILTER (WHERE n >= k_min), '[]'::jsonb),
    COUNT(*) FILTER (WHERE n < k_min)::int
  INTO v_geral, v_setores, v_supr
  FROM por_setor;

  RETURN jsonb_build_object(
    'empresa_id',         v_empresa.id,
    'empresa_nome',       v_empresa.nome,
    'empresa_cnpj',       v_empresa.cnpj,
    'periodo_inicio',     p_inicio,
    'periodo_fim',        p_fim,
    'k_min',              k_min,
    'geral',              v_geral,
    'setores',            v_setores,
    'setores_suprimidos', COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_relatorio_psicossocial(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_relatorio_psicossocial(DATE, DATE) TO authenticated;


-- ── 7d. Matriz de risco — agora lendo da view ──
CREATE OR REPLACE FUNCTION rh_matriz_psicossocial(p_inicio DATE, p_fim DATE)
RETURNS JSONB AS $$
DECLARE
  k_min        CONSTANT INT := 5;
  min_setores  CONSTANT INT := 3;
  v_empresa    RECORD;
  v_med_exp    NUMERIC;
  v_med_bem    NUMERIC;
  v_setores    JSONB;
  v_supr       INT;
  v_comparaveis INT;
BEGIN
  SELECT e.id, e.nome, e.cnpj INTO v_empresa
  FROM empresas e
  WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  LIMIT 1;

  IF v_empresa.id IS NULL THEN RETURN NULL; END IF;

  WITH ultima AS (
    SELECT DISTINCT ON (r.chave) r.chave, r.instrument, r.score, r.subscores, r.setor
    FROM psychosocial_respostas r
    WHERE r.empresa_id = v_empresa.id
      AND r.data_ref BETWEEN date_trunc('month', p_inicio)::date AND p_fim
    ORDER BY r.chave, r.data_ref DESC, r.created_at DESC
  ),
  bem AS (
    SELECT setor, COUNT(*)::int AS n, ROUND(AVG(score))::int AS score_medio,
           COUNT(*) FILTER (WHERE score < 50)::int AS reduzido,
           COUNT(*) FILTER (WHERE score <= 28)::int AS risco
    FROM ultima WHERE instrument = 'who5' GROUP BY setor
  ),
  exp AS (
    SELECT setor, COUNT(*)::int AS n, ROUND(AVG(score))::int AS indice,
           ROUND(AVG((subscores ->> 'demanda')::numeric))::int  AS demanda,
           ROUND(AVG((subscores ->> 'controle')::numeric))::int AS controle,
           ROUND(AVG((subscores ->> 'apoio')::numeric))::int    AS apoio
    FROM ultima WHERE instrument = 'jss' AND subscores IS NOT NULL GROUP BY setor
  ),
  comparaveis AS (
    SELECT b.setor, b.score_medio AS bem_score, e.indice AS exp_indice
    FROM bem b JOIN exp e ON e.setor = b.setor
    WHERE b.n >= k_min AND e.n >= k_min
  )
  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY exp_indice),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY bem_score),
    COUNT(*)::int
  INTO v_med_exp, v_med_bem, v_comparaveis
  FROM comparaveis;

  IF COALESCE(v_comparaveis, 0) < min_setores THEN
    v_med_exp := NULL;
    v_med_bem := NULL;
  END IF;

  WITH ultima AS (
    SELECT DISTINCT ON (r.chave) r.chave, r.instrument, r.score, r.subscores, r.setor
    FROM psychosocial_respostas r
    WHERE r.empresa_id = v_empresa.id
      AND r.data_ref BETWEEN date_trunc('month', p_inicio)::date AND p_fim
    ORDER BY r.chave, r.data_ref DESC, r.created_at DESC
  ),
  bem AS (
    SELECT setor, COUNT(*)::int AS n, ROUND(AVG(score))::int AS score_medio,
           COUNT(*) FILTER (WHERE score < 50)::int AS reduzido,
           COUNT(*) FILTER (WHERE score <= 28)::int AS risco
    FROM ultima WHERE instrument = 'who5' GROUP BY setor
  ),
  exp AS (
    SELECT setor, COUNT(*)::int AS n, ROUND(AVG(score))::int AS indice,
           ROUND(AVG((subscores ->> 'demanda')::numeric))::int  AS demanda,
           ROUND(AVG((subscores ->> 'controle')::numeric))::int AS controle,
           ROUND(AVG((subscores ->> 'apoio')::numeric))::int    AS apoio
    FROM ultima WHERE instrument = 'jss' AND subscores IS NOT NULL GROUP BY setor
  ),
  setores AS (
    SELECT COALESCE(b.setor, e.setor) AS setor, b, e
    FROM bem b FULL OUTER JOIN exp e ON e.setor = b.setor
  ),
  montado AS (
    SELECT
      s.setor,
      CASE WHEN (s.b).n >= k_min THEN
        jsonb_build_object(
          'n_respondentes', (s.b).n, 'score_medio', (s.b).score_medio,
          'faixa_reduzido', (s.b).reduzido, 'faixa_risco', (s.b).risco)
      END AS bemestar,
      CASE WHEN (s.e).n >= k_min THEN
        jsonb_build_object(
          'n_respondentes', (s.e).n, 'indice', (s.e).indice,
          'demanda', (s.e).demanda, 'controle', (s.e).controle, 'apoio', (s.e).apoio)
      END AS exposicao,
      CASE
        WHEN v_med_exp IS NULL OR v_med_bem IS NULL THEN NULL
        WHEN COALESCE((s.b).n, 0) < k_min OR COALESCE((s.e).n, 0) < k_min THEN NULL
        WHEN (s.e).indice >= v_med_exp AND (s.b).score_medio <= v_med_bem THEN 'risco_ocupacional'
        WHEN (s.e).indice <  v_med_exp AND (s.b).score_medio <= v_med_bem THEN 'fator_externo'
        WHEN (s.e).indice >= v_med_exp AND (s.b).score_medio >  v_med_bem THEN 'risco_latente'
        ELSE 'estavel'
      END AS quadrante
    FROM setores s
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object('setor', setor, 'bemestar', bemestar,
                         'exposicao', exposicao, 'quadrante', quadrante)
      ORDER BY setor
    ) FILTER (WHERE bemestar IS NOT NULL OR exposicao IS NOT NULL), '[]'::jsonb),
    COUNT(*) FILTER (WHERE bemestar IS NULL AND exposicao IS NULL)::int
  INTO v_setores, v_supr
  FROM montado;

  RETURN jsonb_build_object(
    'empresa_id',          v_empresa.id,
    'empresa_nome',        v_empresa.nome,
    'empresa_cnpj',        v_empresa.cnpj,
    'periodo_inicio',      p_inicio,
    'periodo_fim',         p_fim,
    'k_min',               k_min,
    'min_setores',         min_setores,
    'setores_comparaveis', COALESCE(v_comparaveis, 0),
    'mediana_exposicao',   CASE WHEN v_med_exp IS NULL THEN NULL ELSE ROUND(v_med_exp)::int END,
    'mediana_bemestar',    CASE WHEN v_med_bem IS NULL THEN NULL ELSE ROUND(v_med_bem)::int END,
    'setores',             v_setores,
    'setores_suprimidos',  COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_matriz_psicossocial(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_matriz_psicossocial(DATE, DATE) TO authenticated;


-- =====================================================
-- 8. APOSENTA O FLUXO DE TOKEN POR PESSOA
--
-- Removido em vez de deixado inerte: dois mecanismos de link convivendo num
-- módulo que promete anonimato é convite para alguém reativar o errado.
-- Os tokens existentes eram de teste e nenhuma resposta dependia deles —
-- `psychosocial_assessments` nunca referenciou a tabela.
-- =====================================================

DROP FUNCTION IF EXISTS rh_campanha_links(UUID);
DROP FUNCTION IF EXISTS campanha_por_token(TEXT);
DROP FUNCTION IF EXISTS responder_por_token(TEXT, JSONB, INT, INT, JSONB);
DROP TABLE IF EXISTS psychosocial_campaign_tokens;
