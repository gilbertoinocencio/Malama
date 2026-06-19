-- =====================================================
-- Malama — Resultados de bem-estar (agregados) para o painel RH
-- Migration: 20260623_bemestar_metricas.sql
--
-- Duas RPCs SECURITY DEFINER que devolvem SÓ números agregados da empresa
-- do RH logado (resolvido via rh_usuarios). Nunca expõem dado individual.
-- O piso de privacidade (ocultar % abaixo de 5 colaboradores com dados) é
-- aplicado na UI; aqui devolvemos as contagens cruas.
-- Aplicar via SQL Editor.
-- =====================================================

-- =====================================================
-- 1. RPC: rh_metricas_bemestar()
--    Janela de 60 dias: 1ª metade [-60d,-30d), 2ª metade [-30d, hoje].
--    "Melhorou" = média/score da 2ª metade > 1ª metade.
-- =====================================================

DROP FUNCTION IF EXISTS rh_metricas_bemestar();

CREATE OR REPLACE FUNCTION rh_metricas_bemestar()
RETURNS TABLE (
  agua_com_dados       INT,
  agua_melhoraram      INT,
  proteina_com_dados   INT,
  proteina_melhoraram  INT,
  atividade_com_dados  INT,
  atividade_melhoraram INT,
  ativos_total         INT,
  ativos_engajados     INT,
  dias_em_flow         INT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  ),
  janela AS (
    SELECT (current_date - 60) AS d0, (current_date - 30) AS dmid, current_date AS d1
  ),
  colabs AS (
    SELECT user_id FROM empresa_colaboradores
    WHERE empresa_id = (SELECT empresa_id FROM emp)
      AND status = 'ativo' AND user_id IS NOT NULL
  ),
  -- ÁGUA: média por colaborador em cada metade (daily_logs.water_intake)
  agua AS (
    SELECT dl.user_id,
      AVG(dl.water_intake) FILTER (
        WHERE dl.date >= (SELECT d0 FROM janela) AND dl.date < (SELECT dmid FROM janela)) AS a1,
      AVG(dl.water_intake) FILTER (
        WHERE dl.date >= (SELECT dmid FROM janela) AND dl.date <= (SELECT d1 FROM janela)) AS a2
    FROM daily_logs dl
    JOIN colabs c ON c.user_id = dl.user_id
    WHERE dl.date >= (SELECT d0 FROM janela) AND dl.date <= (SELECT d1 FROM janela)
    GROUP BY dl.user_id
  ),
  -- PROTEÍNA: média por colaborador em cada metade (flow_stats.protein_consumed)
  prot AS (
    SELECT fs.user_id,
      AVG(fs.protein_consumed) FILTER (
        WHERE fs.date >= (SELECT d0 FROM janela) AND fs.date < (SELECT dmid FROM janela)) AS p1,
      AVG(fs.protein_consumed) FILTER (
        WHERE fs.date >= (SELECT dmid FROM janela) AND fs.date <= (SELECT d1 FROM janela)) AS p2
    FROM flow_stats fs
    JOIN colabs c ON c.user_id = fs.user_id
    WHERE fs.date >= (SELECT d0 FROM janela) AND fs.date <= (SELECT d1 FROM janela)
    GROUP BY fs.user_id
  ),
  -- ATIVIDADE: minutos ativos (daily_logs) + nº de atividades (activities) por metade
  ativ AS (
    SELECT c.user_id,
      COALESCE((SELECT SUM(COALESCE(dl.active_minutes,0)) FROM daily_logs dl
        WHERE dl.user_id = c.user_id
          AND dl.date >= (SELECT d0 FROM janela) AND dl.date < (SELECT dmid FROM janela)), 0)
      + COALESCE((SELECT COUNT(*) FROM activities a
        WHERE a.user_id = c.user_id
          AND a.activity_date >= (SELECT d0 FROM janela) AND a.activity_date < (SELECT dmid FROM janela)), 0) AS s1,
      COALESCE((SELECT SUM(COALESCE(dl.active_minutes,0)) FROM daily_logs dl
        WHERE dl.user_id = c.user_id
          AND dl.date >= (SELECT dmid FROM janela) AND dl.date <= (SELECT d1 FROM janela)), 0)
      + COALESCE((SELECT COUNT(*) FROM activities a
        WHERE a.user_id = c.user_id
          AND a.activity_date >= (SELECT dmid FROM janela) AND a.activity_date <= (SELECT d1 FROM janela)), 0) AS s2
    FROM colabs c
  ),
  -- ENGAJAMENTO: registrou qualquer coisa nos últimos 30 dias
  engaj AS (
    SELECT c.user_id,
      (   EXISTS(SELECT 1 FROM daily_logs dl WHERE dl.user_id = c.user_id AND dl.date >= (SELECT dmid FROM janela))
       OR EXISTS(SELECT 1 FROM meals m       WHERE m.user_id  = c.user_id AND m.created_at >= (SELECT dmid FROM janela))
       OR EXISTS(SELECT 1 FROM weight_logs wl WHERE wl.user_id = c.user_id AND wl.logged_at >= (SELECT dmid FROM janela))
       OR EXISTS(SELECT 1 FROM activities a  WHERE a.user_id  = c.user_id AND a.activity_date >= (SELECT dmid FROM janela))
      ) AS engajado
    FROM colabs c
  ),
  flow AS (
    SELECT COUNT(*) AS dias
    FROM flow_stats fs
    JOIN colabs c ON c.user_id = fs.user_id
    WHERE fs.in_flow = true
      AND fs.date >= (SELECT d0 FROM janela) AND fs.date <= (SELECT d1 FROM janela)
  )
  SELECT
    (SELECT COUNT(*)::INT FROM agua WHERE a1 IS NOT NULL AND a2 IS NOT NULL),
    (SELECT COUNT(*)::INT FROM agua WHERE a1 IS NOT NULL AND a2 IS NOT NULL AND a2 > a1),
    (SELECT COUNT(*)::INT FROM prot WHERE p1 IS NOT NULL AND p2 IS NOT NULL),
    (SELECT COUNT(*)::INT FROM prot WHERE p1 IS NOT NULL AND p2 IS NOT NULL AND p2 > p1),
    (SELECT COUNT(*)::INT FROM ativ WHERE s1 > 0 OR s2 > 0),
    (SELECT COUNT(*)::INT FROM ativ WHERE (s1 > 0 OR s2 > 0) AND s2 > s1),
    (SELECT COUNT(*)::INT FROM colabs),
    (SELECT COUNT(*)::INT FROM engaj WHERE engajado),
    (SELECT COALESCE(dias,0)::INT FROM flow);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_metricas_bemestar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_metricas_bemestar() TO authenticated;

-- =====================================================
-- 2. RPC: rh_evolucao_bemestar()
--    Médias mensais por colaborador ativo nos últimos 6 meses.
--    n_contribuintes = nº de colaboradores com ≥1 registro no mês.
-- =====================================================

DROP FUNCTION IF EXISTS rh_evolucao_bemestar();

CREATE OR REPLACE FUNCTION rh_evolucao_bemestar()
RETURNS TABLE (
  mes             DATE,
  n_contribuintes INT,
  media_agua      NUMERIC,
  media_proteina  NUMERIC,
  media_minutos   NUMERIC
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  ),
  colabs AS (
    SELECT user_id FROM empresa_colaboradores
    WHERE empresa_id = (SELECT empresa_id FROM emp)
      AND status = 'ativo' AND user_id IS NOT NULL
  ),
  meses AS (
    SELECT (date_trunc('month', current_date) - (interval '1 month' * g))::date AS m
    FROM generate_series(0, 5) g
  ),
  per_user AS (
    SELECT c.user_id, mm.m AS mes,
      (SELECT AVG(dl.water_intake)   FROM daily_logs dl WHERE dl.user_id = c.user_id AND date_trunc('month', dl.date)::date = mm.m) AS agua,
      (SELECT AVG(fs.protein_consumed) FROM flow_stats fs WHERE fs.user_id = c.user_id AND date_trunc('month', fs.date)::date = mm.m) AS prot,
      (SELECT AVG(dl.active_minutes)  FROM daily_logs dl WHERE dl.user_id = c.user_id AND date_trunc('month', dl.date)::date = mm.m) AS minutos
    FROM colabs c CROSS JOIN meses mm
  )
  SELECT
    mes,
    COUNT(*) FILTER (WHERE agua IS NOT NULL OR prot IS NOT NULL OR minutos IS NOT NULL)::INT AS n_contribuintes,
    ROUND(AVG(agua), 0)    AS media_agua,
    ROUND(AVG(prot), 0)    AS media_proteina,
    ROUND(AVG(minutos), 0) AS media_minutos
  FROM per_user
  GROUP BY mes
  ORDER BY mes;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_evolucao_bemestar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_evolucao_bemestar() TO authenticated;
