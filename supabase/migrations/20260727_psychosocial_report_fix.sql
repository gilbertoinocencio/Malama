-- =====================================================
-- Malama — Correção do relatório psicossocial agregado (NR-1/PGR)
-- Migration: 20260727_psychosocial_report_fix.sql
--
-- BUG CORRIGIDO (crítico para a validade do documento no PGR):
-- a CTE "ultima" prometia usar a resposta MAIS RECENTE do colaborador
-- no período, mas usava:
--
--   SELECT DISTINCT ON (user_id) ...
--   FROM (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY user_id
--                                        ORDER BY score) AS rn FROM respostas r) x
--   ORDER BY user_id
--
-- O ROW_NUMBER era calculado e descartado (rn nunca filtrado), e o
-- DISTINCT ON não tinha critério de desempate — o Postgres devolvia a
-- linha que aparecesse primeiro no scan. Resultado: para quem respondeu
-- mais de um mês dentro do período, o score escolhido era ARBITRÁRIO e
-- a mesma consulta podia devolver números diferentes entre execuções.
-- Num relatório anexado ao PGR isso é inaceitável.
--
-- Correção: trazer reference_month para a CTE e ordenar por
-- (user_id, reference_month DESC). O UNIQUE (user_id, instrument,
-- reference_month) da tabela garante no máximo uma linha por mês, logo
-- o desempate é totalmente determinístico.
--
-- Contrato de saída (shape do JSONB) INALTERADO — nenhuma mudança
-- necessária no frontend.
--
-- Aplicar via SQL Editor, depois de 20260723_psychosocial_rh_report.
-- =====================================================

DROP FUNCTION IF EXISTS rh_relatorio_psicossocial(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_relatorio_psicossocial(
  p_inicio DATE,
  p_fim    DATE
)
RETURNS JSONB AS $$
DECLARE
  k_min      CONSTANT INT := 5;   -- piso de k-anonimato por recorte
  v_empresa  RECORD;
  v_geral    JSONB;
  v_setores  JSONB;
  v_supr     INT;
BEGIN
  -- Empresa do RH logado (uma linha; RH sem empresa → NULL → sai vazio)
  SELECT e.id, e.nome, e.cnpj
    INTO v_empresa
  FROM empresas e
  WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  LIMIT 1;

  IF v_empresa.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- ── Agregado geral ────────────────────────────────────
  -- (os dois blocos abaixo compartilham as mesmas CTEs respostas/ultima;
  --  se alterar um, alterar o outro.)
  WITH respostas AS (
    SELECT pa.user_id, pa.score, pa.reference_month, ec.setor
    FROM psychosocial_assessments pa
    JOIN empresa_colaboradores ec
      ON ec.user_id = pa.user_id
     AND ec.empresa_id = v_empresa.id
     AND ec.status <> 'removido'
    WHERE pa.instrument = 'who5'
      AND pa.reference_month >= date_trunc('month', p_inicio)::date
      AND pa.reference_month <= p_fim
  ),
  -- Uma resposta por colaborador — a MAIS RECENTE do período — para não
  -- pesar duplo quem respondeu vários meses.
  ultima AS (
    SELECT DISTINCT ON (user_id) user_id, score, setor
    FROM respostas
    ORDER BY user_id, reference_month DESC
  )
  SELECT
    CASE WHEN COUNT(*) >= k_min THEN
      jsonb_build_object(
        'n_respondentes', COUNT(*)::int,
        'score_medio',    ROUND(AVG(score))::int,
        'faixa_reduzido', COUNT(*) FILTER (WHERE score < 50)::int,
        'faixa_risco',    COUNT(*) FILTER (WHERE score <= 28)::int
      )
    ELSE
      jsonb_build_object('n_respondentes', COUNT(*)::int, 'suprimido', true)
    END
  INTO v_geral
  FROM ultima;

  -- ── Quebra por setor: só setores com ≥ k_min respondentes ──
  WITH respostas AS (
    SELECT pa.user_id, pa.score, pa.reference_month, ec.setor
    FROM psychosocial_assessments pa
    JOIN empresa_colaboradores ec
      ON ec.user_id = pa.user_id
     AND ec.empresa_id = v_empresa.id
     AND ec.status <> 'removido'
    WHERE pa.instrument = 'who5'
      AND pa.reference_month >= date_trunc('month', p_inicio)::date
      AND pa.reference_month <= p_fim
  ),
  ultima AS (
    SELECT DISTINCT ON (user_id) user_id, score, setor
    FROM respostas
    ORDER BY user_id, reference_month DESC
  ),
  por_setor AS (
    SELECT
      COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor') AS setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS score_medio,
      COUNT(*) FILTER (WHERE score < 50)::int AS faixa_reduzido,
      COUNT(*) FILTER (WHERE score <= 28)::int AS faixa_risco
    FROM ultima
    GROUP BY 1
  )
  SELECT
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

REVOKE ALL ON FUNCTION rh_relatorio_psicossocial(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_relatorio_psicossocial(DATE, DATE) TO authenticated;
