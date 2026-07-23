-- =====================================================
-- Malama — Relatório psicossocial agregado para o painel do RH (NR-1/PGR)
-- Migration: 20260723_psychosocial_rh_report.sql
--
-- RPC SECURITY DEFINER que devolve o agregado WHO-5 da empresa do RH
-- logado, para um período. O corte de k-anonimato (mínimo de
-- respondentes por recorte) é aplicado DENTRO DO BANCO — diferente das
-- métricas de bem-estar, aqui o dado é sensível (saúde mental), então o
-- número pequeno nunca sai do servidor. Recortes por setor com menos de
-- K_MIN respondentes são suprimidos; contam em "setores_suprimidos".
--
-- Nunca expõe resposta individual, nem lista de quem respondeu.
-- Aplicar via SQL Editor (rodar DEPOIS de 20260723_psychosocial_who5_and_setor).
-- =====================================================

-- Faixas de bem-estar WHO-5 (score 0–100, referência do manual do instrumento):
--   < 50  → bem-estar reduzido (sinaliza acompanhamento)
--   ≤ 28  → risco elevado (sugere rastreio aprofundado)
-- Devolvemos as CONTAGENS por faixa, nunca os scores individuais.

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

  -- Respostas WHO-5 dos colaboradores da empresa dentro do período.
  -- reference_month é o 1º dia do mês; comparamos com o intervalo pedido.
  WITH respostas AS (
    SELECT pa.user_id, pa.score, ec.setor
    FROM psychosocial_assessments pa
    JOIN empresa_colaboradores ec
      ON ec.user_id = pa.user_id
     AND ec.empresa_id = v_empresa.id
     AND ec.status <> 'removido'
    WHERE pa.instrument = 'who5'
      AND pa.reference_month >= date_trunc('month', p_inicio)::date
      AND pa.reference_month <= p_fim
  ),
  -- Uma resposta por colaborador (a mais recente no período) para não
  -- pesar duplo quem respondeu vários meses.
  ultima AS (
    SELECT DISTINCT ON (user_id) user_id, score, setor
    FROM (
      SELECT r.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score) AS rn
      FROM respostas r
    ) x
    ORDER BY user_id
  )
  SELECT
    -- Agregado geral (só publica se atingir o piso k_min)
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

  -- Quebra por setor: só setores com ≥ k_min respondentes
  WITH respostas AS (
    SELECT pa.user_id, pa.score, ec.setor
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
    FROM (
      SELECT r.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score) AS rn
      FROM respostas r
    ) x
    ORDER BY user_id
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
