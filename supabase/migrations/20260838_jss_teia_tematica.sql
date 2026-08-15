-- =====================================================
-- Malama — Teia temática do JSS
--
-- Desdobra as 17 perguntas em seis temas gerenciais. Não altera as três
-- dimensões validadas do instrumento (demanda, controle e apoio).
-- Todos os valores retornados usam a mesma direção: 0 = menor atenção,
-- 100 = maior atenção. Somente médias agregadas com k >= 5 são publicadas.
-- =====================================================

CREATE OR REPLACE FUNCTION public.rh_jss_teia_temas(
  p_inicio DATE,
  p_fim DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k_min CONSTANT INT := 5;
  v_empresa UUID;
  v_geral JSONB;
  v_setores JSONB;
  v_suprimidos INT;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM public.rh_usuarios
  WHERE user_id = auth.uid()
    AND ativo
    AND (principal OR 'saude_mental' = ANY(permissoes))
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para visualizar a teia temática do JSS';
  END IF;

  WITH colab AS (
    SELECT DISTINCT ON (ec.user_id)
      ec.user_id,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM public.empresa_colaboradores ec
    WHERE ec.empresa_id = v_empresa
      AND ec.user_id IS NOT NULL
      AND ec.status <> 'removido'
    ORDER BY ec.user_id, ec.data_adicao DESC
  ),
  respostas AS (
    SELECT
      'u:' || pa.user_id::text || ':' || pa.instrument AS chave,
      c.setor,
      pa.answers,
      COALESCE(pa.reference_month, pa.created_at::date) AS data_ref,
      pa.created_at
    FROM public.psychosocial_assessments pa
    JOIN colab c ON c.user_id = pa.user_id
    JOIN public.psychosocial_campaigns cp_i
      ON cp_i.id = pa.campaign_id AND cp_i.empresa_id = v_empresa
    WHERE pa.instrument = 'jss'
      AND pa.subscores IS NOT NULL
      AND pa.answers IS NOT NULL

    UNION ALL

    SELECT
      'a:' || ar.id::text,
      COALESCE(NULLIF(TRIM(ar.setor), ''), 'Sem setor'),
      ar.answers,
      COALESCE(ar.reference_month, ar.created_at::date),
      ar.created_at
    FROM public.psychosocial_anonymous_responses ar
    JOIN public.psychosocial_campaigns cp ON cp.id = ar.campaign_id
    WHERE cp.empresa_id = v_empresa
      AND ar.instrument = 'jss'
      AND ar.subscores IS NOT NULL
      AND ar.answers IS NOT NULL
  ),
  ultima AS (
    SELECT DISTINCT ON (chave)
      chave, setor, answers
    FROM respostas
    WHERE data_ref >= date_trunc('month', p_inicio)::date
      AND data_ref <= p_fim
    ORDER BY chave, data_ref DESC, created_at DESC
  ),
  itens AS (
    SELECT
      setor,
      (4 - (answers ->> 'a')::numeric) * 100 / 3 AS a,
      (4 - (answers ->> 'b')::numeric) * 100 / 3 AS b,
      (4 - (answers ->> 'c')::numeric) * 100 / 3 AS c,
      ((answers ->> 'd')::numeric - 1) * 100 / 3 AS d,
      (4 - (answers ->> 'e')::numeric) * 100 / 3 AS e,
      ((answers ->> 'f')::numeric - 1) * 100 / 3 AS f,
      ((answers ->> 'g')::numeric - 1) * 100 / 3 AS g,
      ((answers ->> 'h')::numeric - 1) * 100 / 3 AS h,
      (4 - (answers ->> 'i')::numeric) * 100 / 3 AS i,
      ((answers ->> 'j')::numeric - 1) * 100 / 3 AS j,
      ((answers ->> 'k')::numeric - 1) * 100 / 3 AS k,
      ((answers ->> 'l')::numeric - 1) * 100 / 3 AS l,
      ((answers ->> 'm')::numeric - 1) * 100 / 3 AS m,
      ((answers ->> 'n')::numeric - 1) * 100 / 3 AS n,
      ((answers ->> 'o')::numeric - 1) * 100 / 3 AS o,
      ((answers ->> 'p')::numeric - 1) * 100 / 3 AS p,
      ((answers ->> 'q')::numeric - 1) * 100 / 3 AS q
    FROM ultima
  ),
  temas AS (
    SELECT
      setor,
      (a + b + c) / 3 AS ritmo_volume,
      (d + e) / 2 AS organizacao,
      (f + g + i) / 3 AS competencias,
      (h + j + k) / 3 AS autonomia,
      (l + m + q) / 3 AS clima,
      (n + o + p) / 3 AS apoio_lideranca
    FROM itens
  ),
  por_setor AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(ritmo_volume))::int AS ritmo_volume,
      ROUND(AVG(organizacao))::int AS organizacao,
      ROUND(AVG(competencias))::int AS competencias,
      ROUND(AVG(autonomia))::int AS autonomia,
      ROUND(AVG(clima))::int AS clima,
      ROUND(AVG(apoio_lideranca))::int AS apoio_lideranca
    FROM temas
    GROUP BY setor
  )
  SELECT
    CASE WHEN COUNT(*) >= k_min THEN jsonb_build_object(
      'n_respondentes', COUNT(*)::int,
      'ritmo_volume', ROUND(AVG(ritmo_volume))::int,
      'organizacao', ROUND(AVG(organizacao))::int,
      'competencias', ROUND(AVG(competencias))::int,
      'autonomia', ROUND(AVG(autonomia))::int,
      'clima', ROUND(AVG(clima))::int,
      'apoio_lideranca', ROUND(AVG(apoio_lideranca))::int
    ) ELSE jsonb_build_object(
      'n_respondentes', COUNT(*)::int,
      'suprimido', true
    ) END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'setor', setor,
        'n_respondentes', n,
        'ritmo_volume', ritmo_volume,
        'organizacao', organizacao,
        'competencias', competencias,
        'autonomia', autonomia,
        'clima', clima,
        'apoio_lideranca', apoio_lideranca
      ) ORDER BY setor)
      FROM por_setor
      WHERE n >= k_min
    ), '[]'::jsonb),
    COALESCE((SELECT COUNT(*)::int FROM por_setor WHERE n < k_min), 0)
  INTO v_geral, v_setores, v_suprimidos
  FROM temas;

  RETURN jsonb_build_object(
    'empresa_id', v_empresa,
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'k_min', k_min,
    'geral', v_geral,
    'setores', v_setores,
    'setores_suprimidos', v_suprimidos,
    'sentido', 'maior_mais_atencao',
    'natureza', 'leitura_tematica_gestao'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_jss_teia_temas(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_jss_teia_temas(DATE, DATE) TO authenticated;
