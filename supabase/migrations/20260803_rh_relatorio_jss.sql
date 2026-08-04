-- =====================================================
-- Malama — Relatório de exposição ocupacional (JSS) para o PGR
-- Migration: 20260803_rh_relatorio_jss.sql
--
-- Aplicar depois de 20260803_link_por_setor.sql (usa a view
-- psychosocial_respostas e o mesmo padrão de rh_relatorio_psicossocial).
--
-- POR QUE UM RELATÓRIO SEPARADO DO WHO-5
-- O relatório de bem-estar (rh_relatorio_psicossocial) documenta COMO o
-- colaborador está. Este documenta O QUE NO TRABALHO expõe a risco —
-- demanda, controle e apoio, modelo Karasek/Theorell (JSS). São duas
-- evidências de natureza diferente para o PGR/NR-1 e o RH pode precisar
-- anexar uma sem a outra (ex.: JSS é semestral, WHO-5 é mensal — os
-- períodos raramente coincidem exatamente).
--
-- Mesmo padrão de k-anonimato de rh_relatorio_psicossocial: só publica
-- recorte (geral ou por setor) com >= k_min respondentes; abaixo disso
-- vira 'suprimido'. Lê da view psychosocial_respostas para enxergar tanto
-- respostas identificadas (psychosocial_assessments) quanto anônimas por
-- link de setor (psychosocial_anonymous_responses) — ver 20260803_link_por_setor.
-- =====================================================

DROP FUNCTION IF EXISTS rh_relatorio_jss(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_relatorio_jss(
  p_inicio DATE,
  p_fim    DATE
)
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

  IF v_empresa.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Uma resposta por chave (pessoa ou anônima) — a mais recente do período.
  -- Ver comentário de 'chave' na view: identificada colapsa pela pessoa,
  -- anônima nunca colapsa (cada link-resposta conta uma vez).
  WITH ultima AS (
    SELECT DISTINCT ON (r.chave)
      r.score, r.subscores, r.setor
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
      jsonb_build_object(
        'n_respondentes', COUNT(*)::int,
        'indice_medio',   ROUND(AVG(score))::int,
        'demanda_medio',  ROUND(AVG((subscores ->> 'demanda')::numeric))::int,
        'controle_medio', ROUND(AVG((subscores ->> 'controle')::numeric))::int,
        'apoio_medio',    ROUND(AVG((subscores ->> 'apoio')::numeric))::int
      )
    ELSE
      jsonb_build_object('n_respondentes', COUNT(*)::int, 'suprimido', true)
    END
  INTO v_geral
  FROM ultima;

  WITH ultima AS (
    SELECT DISTINCT ON (r.chave)
      r.score, r.subscores, r.setor
    FROM psychosocial_respostas r
    WHERE r.empresa_id = v_empresa.id
      AND r.instrument = 'jss'
      AND r.subscores IS NOT NULL
      AND r.data_ref >= date_trunc('month', p_inicio)::date
      AND r.data_ref <= p_fim
    ORDER BY r.chave, r.data_ref DESC, r.created_at DESC
  ),
  por_setor AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS indice,
      ROUND(AVG((subscores ->> 'demanda')::numeric))::int  AS demanda,
      ROUND(AVG((subscores ->> 'controle')::numeric))::int AS controle,
      ROUND(AVG((subscores ->> 'apoio')::numeric))::int    AS apoio
    FROM ultima
    GROUP BY 1
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor', setor,
        'n_respondentes', n,
        'indice', indice,
        'demanda', demanda,
        'controle', controle,
        'apoio', apoio
      ) ORDER BY setor
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
    'setores',            v_setores,
    'setores_suprimidos', COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_relatorio_jss(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_relatorio_jss(DATE, DATE) TO authenticated;
