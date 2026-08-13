-- =====================================================
-- Malama — diagnóstico JSS acionável por setor
--
-- Mantém o relatório estritamente agregado (k >= 5), mas acrescenta:
--   · cortes relativos das dimensões (mediana dos respondentes no período);
--   · quadrante clássico demanda × controle por setor;
--   · contribuição adversa média de cada item (0–100), para explicar quais
--     condições de trabalho puxaram o resultado.
--
-- Nenhuma resposta individual é devolvida. `answers` só é lido dentro desta
-- função SECURITY DEFINER e cada setor abaixo do piso continua suprimido.
-- =====================================================

DROP FUNCTION IF EXISTS rh_relatorio_jss(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_relatorio_jss(
  p_inicio DATE,
  p_fim    DATE
)
RETURNS JSONB AS $$
DECLARE
  k_min          CONSTANT INT := 5;
  v_empresa      RECORD;
  v_geral        JSONB;
  v_setores      JSONB;
  v_supr         INT;
  v_corte_dem    NUMERIC;
  v_corte_con    NUMERIC;
  v_corte_apo    NUMERIC;
BEGIN
  SELECT e.id, e.nome, e.cnpj INTO v_empresa
  FROM empresas e
  WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  LIMIT 1;

  IF v_empresa.id IS NULL THEN RETURN NULL; END IF;

  -- Cortes do modelo demanda-controle-apoio. A mediana é calculada sobre
  -- respondentes, não sobre médias de setores, evitando dar o mesmo peso a
  -- coortes de tamanhos diferentes.
  WITH ultima AS (
    SELECT DISTINCT ON (r.chave)
      r.chave, r.subscores
    FROM psychosocial_respostas r
    WHERE r.empresa_id = v_empresa.id
      AND r.instrument = 'jss'
      AND r.subscores IS NOT NULL
      AND r.data_ref >= date_trunc('month', p_inicio)::date
      AND r.data_ref <= p_fim
    ORDER BY r.chave, r.data_ref DESC, r.created_at DESC
  )
  SELECT
    CASE WHEN COUNT(*) >= k_min THEN
      percentile_cont(0.5) WITHIN GROUP (ORDER BY (subscores ->> 'demanda')::numeric)
    END,
    CASE WHEN COUNT(*) >= k_min THEN
      percentile_cont(0.5) WITHIN GROUP (ORDER BY (subscores ->> 'controle')::numeric)
    END,
    CASE WHEN COUNT(*) >= k_min THEN
      percentile_cont(0.5) WITHIN GROUP (ORDER BY (subscores ->> 'apoio')::numeric)
    END
  INTO v_corte_dem, v_corte_con, v_corte_apo
  FROM ultima;

  -- Panorama geral, compatível com o contrato anterior.
  WITH ultima AS (
    SELECT DISTINCT ON (r.chave)
      r.chave, r.score, r.subscores
    FROM psychosocial_respostas r
    WHERE r.empresa_id = v_empresa.id
      AND r.instrument = 'jss'
      AND r.subscores IS NOT NULL
      AND r.data_ref >= date_trunc('month', p_inicio)::date
      AND r.data_ref <= p_fim
    ORDER BY r.chave, r.data_ref DESC, r.created_at DESC
  )
  SELECT CASE WHEN COUNT(*) >= k_min THEN
    jsonb_build_object(
      'n_respondentes', COUNT(*)::int,
      'indice_medio',   ROUND(AVG(score))::int,
      'demanda_medio',  ROUND(AVG((subscores ->> 'demanda')::numeric))::int,
      'controle_medio', ROUND(AVG((subscores ->> 'controle')::numeric))::int,
      'apoio_medio',    ROUND(AVG((subscores ->> 'apoio')::numeric))::int
    )
  ELSE jsonb_build_object('n_respondentes', COUNT(*)::int, 'suprimido', true)
  END
  INTO v_geral
  FROM ultima;

  -- Para explicar os fatores, a união abaixo inclui `answers` somente dentro
  -- da função. A regra de deduplicação é a mesma da view protegida:
  -- identificado = resposta mais recente da pessoa; anônimo = uma linha.
  WITH colab AS (
    SELECT DISTINCT ON (ec.user_id)
      ec.user_id, COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_empresa.id
      AND ec.user_id IS NOT NULL
      AND ec.status <> 'removido'
    ORDER BY ec.user_id, ec.data_adicao DESC
  ),
  respostas AS (
    SELECT
      'u:' || pa.user_id::text || ':' || pa.instrument AS chave,
      c.setor,
      pa.score,
      pa.subscores,
      pa.answers,
      COALESCE(pa.reference_month, pa.created_at::date) AS data_ref,
      pa.created_at
    FROM psychosocial_assessments pa
    JOIN colab c ON c.user_id = pa.user_id
    JOIN psychosocial_campaigns cp_i
      ON cp_i.id = pa.campaign_id AND cp_i.empresa_id = v_empresa.id
    WHERE pa.instrument = 'jss'
      AND pa.subscores IS NOT NULL

    UNION ALL

    SELECT
      'a:' || ar.id::text,
      COALESCE(NULLIF(TRIM(ar.setor), ''), 'Sem setor'),
      ar.score,
      ar.subscores,
      ar.answers,
      COALESCE(ar.reference_month, ar.created_at::date),
      ar.created_at
    FROM psychosocial_anonymous_responses ar
    JOIN psychosocial_campaigns cp ON cp.id = ar.campaign_id
    WHERE cp.empresa_id = v_empresa.id
      AND ar.instrument = 'jss'
      AND ar.subscores IS NOT NULL
  ),
  ultima AS (
    SELECT DISTINCT ON (chave)
      chave, setor, score, subscores, answers
    FROM respostas
    WHERE data_ref >= date_trunc('month', p_inicio)::date
      AND data_ref <= p_fim
    ORDER BY chave, data_ref DESC, created_at DESC
  ),
  por_setor AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS indice,
      ROUND(AVG((subscores ->> 'demanda')::numeric))::int AS demanda,
      ROUND(AVG((subscores ->> 'controle')::numeric))::int AS controle,
      ROUND(AVG((subscores ->> 'apoio')::numeric))::int AS apoio,
      jsonb_build_object(
        -- Demanda: a/b/c/e são adversos quando frequentes; d quando falta tempo.
        'a', ROUND(AVG((4 - (answers ->> 'a')::numeric) * 100 / 3))::int,
        'b', ROUND(AVG((4 - (answers ->> 'b')::numeric) * 100 / 3))::int,
        'c', ROUND(AVG((4 - (answers ->> 'c')::numeric) * 100 / 3))::int,
        'd', ROUND(AVG(((answers ->> 'd')::numeric - 1) * 100 / 3))::int,
        'e', ROUND(AVG((4 - (answers ->> 'e')::numeric) * 100 / 3))::int,
        -- Controle: risco é o inverso do construto; i já tem redação negativa.
        'f', ROUND(AVG(((answers ->> 'f')::numeric - 1) * 100 / 3))::int,
        'g', ROUND(AVG(((answers ->> 'g')::numeric - 1) * 100 / 3))::int,
        'h', ROUND(AVG(((answers ->> 'h')::numeric - 1) * 100 / 3))::int,
        'i', ROUND(AVG((4 - (answers ->> 'i')::numeric) * 100 / 3))::int,
        'j', ROUND(AVG(((answers ->> 'j')::numeric - 1) * 100 / 3))::int,
        'k', ROUND(AVG(((answers ->> 'k')::numeric - 1) * 100 / 3))::int,
        -- Apoio: discordância aumenta a contribuição adversa.
        'l', ROUND(AVG(((answers ->> 'l')::numeric - 1) * 100 / 3))::int,
        'm', ROUND(AVG(((answers ->> 'm')::numeric - 1) * 100 / 3))::int,
        'n', ROUND(AVG(((answers ->> 'n')::numeric - 1) * 100 / 3))::int,
        'o', ROUND(AVG(((answers ->> 'o')::numeric - 1) * 100 / 3))::int,
        'p', ROUND(AVG(((answers ->> 'p')::numeric - 1) * 100 / 3))::int,
        'q', ROUND(AVG(((answers ->> 'q')::numeric - 1) * 100 / 3))::int
      ) AS itens_risco
    FROM ultima
    GROUP BY setor
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor', setor,
        'n_respondentes', n,
        'indice', indice,
        'demanda', demanda,
        'controle', controle,
        'apoio', apoio,
        'classificacao', CASE
          WHEN demanda >= v_corte_dem AND controle < v_corte_con THEN 'alta_exigencia'
          WHEN demanda >= v_corte_dem AND controle >= v_corte_con THEN 'trabalho_ativo'
          WHEN demanda < v_corte_dem AND controle < v_corte_con THEN 'trabalho_passivo'
          ELSE 'baixa_exigencia'
        END,
        'itens_risco', itens_risco
      ) ORDER BY indice DESC, setor
    ) FILTER (WHERE n >= k_min), '[]'::jsonb),
    COUNT(*) FILTER (WHERE n < k_min)::int
  INTO v_setores, v_supr
  FROM por_setor;

  RETURN jsonb_build_object(
    'empresa_id',         v_empresa.id,
    'empresa_nome',       v_empresa.nome,
    'empresa_cnpj',       v_empresa.cnpj,
    'periodo_inicio',     p_inicio,
    'periodo_fim',        p_fim,
    'k_min',              k_min,
    'geral',              v_geral,
    'cortes',             CASE WHEN v_corte_dem IS NULL THEN NULL ELSE
      jsonb_build_object(
        'demanda', ROUND(v_corte_dem)::int,
        'controle', ROUND(v_corte_con)::int,
        'apoio', ROUND(v_corte_apo)::int,
        'referencia', 'mediana_respondentes_periodo'
      ) END,
    'setores',            v_setores,
    'setores_suprimidos', COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_relatorio_jss(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_relatorio_jss(DATE, DATE) TO authenticated;
