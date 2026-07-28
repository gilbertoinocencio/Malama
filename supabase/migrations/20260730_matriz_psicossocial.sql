-- =====================================================
-- Malama — Matriz de risco psicossocial por setor (NR-1)
-- Migration: 20260730_matriz_psicossocial.sql
--
-- Aplicar via SQL Editor, depois de 20260729_jss_ativar.
--
-- Cruza os DOIS eixos por setor:
--   exposição (JSS)  → o trabalho expõe a quê? (demanda, controle, apoio)
--   bem-estar (WHO-5) → como a pessoa está?
--
-- É o cruzamento que separa o que decorre da natureza da ocupação do que
-- vem de fatores externos — e é a única leitura que sustenta um plano de
-- ação sobre a FONTE do risco, que é o que a NR-1 exige.
--
-- PRIVACIDADE: escore é dado de saúde. Cada eixo de cada setor só é
-- publicado com >= k_min respondentes; abaixo disso o recorte some. O
-- corte acontece dentro do banco, o número pequeno nunca sai daqui.
--
-- CLASSIFICAÇÃO — ler com cuidado:
-- O quadrante é RELATIVO à própria empresa (mediana entre os setores),
-- que é a convenção do modelo demanda-controle. Serve para PRIORIZAR
-- ("onde agir primeiro"), não para afirmar que um setor está bom. Por
-- isso a função devolve também os valores absolutos e as contagens da
-- faixa de bem-estar reduzido: prioridade relativa e gravidade absoluta
-- são duas leituras, e o relatório precisa das duas.
-- Com menos de 3 setores comparáveis a mediana não significa nada e o
-- quadrante volta NULL de propósito.
-- =====================================================

DROP FUNCTION IF EXISTS rh_matriz_psicossocial(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_matriz_psicossocial(
  p_inicio DATE,
  p_fim    DATE
)
RETURNS JSONB AS $$
DECLARE
  k_min        CONSTANT INT := 5;  -- piso de k-anonimato por eixo/setor
  min_setores  CONSTANT INT := 3;  -- abaixo disso, mediana não classifica
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

  IF v_empresa.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- ── Respostas do período, uma por colaborador por instrumento ──
  -- Instrumento mensal usa reference_month; instrumento de campanha grava
  -- reference_month NULL e é datado por created_at. COALESCE cobre os dois.
  WITH respostas AS (
    SELECT
      pa.user_id,
      pa.instrument,
      pa.score,
      pa.subscores,
      COALESCE(pa.reference_month, pa.created_at::date) AS data_ref,
      pa.created_at,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM psychosocial_assessments pa
    JOIN empresa_colaboradores ec
      ON ec.user_id = pa.user_id
     AND ec.empresa_id = v_empresa.id
     AND ec.status <> 'removido'
    WHERE COALESCE(pa.reference_month, pa.created_at::date)
            BETWEEN date_trunc('month', p_inicio)::date AND p_fim
  ),
  ultima AS (
    SELECT DISTINCT ON (user_id, instrument)
      user_id, instrument, score, subscores, setor
    FROM respostas
    ORDER BY user_id, instrument, data_ref DESC, created_at DESC
  ),
  -- ── Eixo bem-estar (WHO-5) ──
  bem AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS score_medio,
      COUNT(*) FILTER (WHERE score < 50)::int AS reduzido,
      COUNT(*) FILTER (WHERE score <= 28)::int AS risco
    FROM ultima
    WHERE instrument = 'who5'
    GROUP BY setor
  ),
  -- ── Eixo exposição (JSS) ──
  exp AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS indice,
      ROUND(AVG((subscores ->> 'demanda')::numeric))::int  AS demanda,
      ROUND(AVG((subscores ->> 'controle')::numeric))::int AS controle,
      ROUND(AVG((subscores ->> 'apoio')::numeric))::int    AS apoio
    FROM ultima
    WHERE instrument = 'jss'
      AND subscores IS NOT NULL
    GROUP BY setor
  ),
  -- Só entra na matriz o setor com os DOIS eixos acima do piso de k.
  comparaveis AS (
    SELECT b.setor, b.score_medio AS bem_score, e.indice AS exp_indice
    FROM bem b
    JOIN exp e ON e.setor = b.setor
    WHERE b.n >= k_min AND e.n >= k_min
  )
  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY exp_indice),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY bem_score),
    COUNT(*)::int
  INTO v_med_exp, v_med_bem, v_comparaveis
  FROM comparaveis;

  -- Mediana só classifica com um número mínimo de setores comparáveis.
  IF COALESCE(v_comparaveis, 0) < min_setores THEN
    v_med_exp := NULL;
    v_med_bem := NULL;
  END IF;

  -- ── Monta a saída por setor ──
  WITH respostas AS (
    SELECT
      pa.user_id,
      pa.instrument,
      pa.score,
      pa.subscores,
      COALESCE(pa.reference_month, pa.created_at::date) AS data_ref,
      pa.created_at,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM psychosocial_assessments pa
    JOIN empresa_colaboradores ec
      ON ec.user_id = pa.user_id
     AND ec.empresa_id = v_empresa.id
     AND ec.status <> 'removido'
    WHERE COALESCE(pa.reference_month, pa.created_at::date)
            BETWEEN date_trunc('month', p_inicio)::date AND p_fim
  ),
  ultima AS (
    SELECT DISTINCT ON (user_id, instrument)
      user_id, instrument, score, subscores, setor
    FROM respostas
    ORDER BY user_id, instrument, data_ref DESC, created_at DESC
  ),
  bem AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS score_medio,
      COUNT(*) FILTER (WHERE score < 50)::int AS reduzido,
      COUNT(*) FILTER (WHERE score <= 28)::int AS risco
    FROM ultima
    WHERE instrument = 'who5'
    GROUP BY setor
  ),
  exp AS (
    SELECT
      setor,
      COUNT(*)::int AS n,
      ROUND(AVG(score))::int AS indice,
      ROUND(AVG((subscores ->> 'demanda')::numeric))::int  AS demanda,
      ROUND(AVG((subscores ->> 'controle')::numeric))::int AS controle,
      ROUND(AVG((subscores ->> 'apoio')::numeric))::int    AS apoio
    FROM ultima
    WHERE instrument = 'jss'
      AND subscores IS NOT NULL
    GROUP BY setor
  ),
  setores AS (
    SELECT COALESCE(b.setor, e.setor) AS setor, b, e
    FROM bem b
    FULL OUTER JOIN exp e ON e.setor = b.setor
  ),
  montado AS (
    SELECT
      s.setor,
      -- Eixo publicado só acima do piso; abaixo dele o recorte some.
      CASE WHEN (s.b).n >= k_min THEN
        jsonb_build_object(
          'n_respondentes', (s.b).n,
          'score_medio',    (s.b).score_medio,
          'faixa_reduzido', (s.b).reduzido,
          'faixa_risco',    (s.b).risco
        )
      END AS bemestar,
      CASE WHEN (s.e).n >= k_min THEN
        jsonb_build_object(
          'n_respondentes', (s.e).n,
          'indice',         (s.e).indice,
          'demanda',        (s.e).demanda,
          'controle',       (s.e).controle,
          'apoio',          (s.e).apoio
        )
      END AS exposicao,
      CASE
        WHEN v_med_exp IS NULL OR v_med_bem IS NULL THEN NULL
        -- COALESCE é essencial: eixo ausente deixa (s.b).n NULL, e sem isto
        -- todas as comparações viram NULL e o setor cairia no ELSE 'estavel'
        -- — classificando como estável justamente quem não tem dado.
        WHEN COALESCE((s.b).n, 0) < k_min OR COALESCE((s.e).n, 0) < k_min THEN NULL
        -- Bem-estar: MENOR score = mais sofrimento.
        WHEN (s.e).indice >= v_med_exp AND (s.b).score_medio <= v_med_bem
          THEN 'risco_ocupacional'
        WHEN (s.e).indice <  v_med_exp AND (s.b).score_medio <= v_med_bem
          THEN 'fator_externo'
        WHEN (s.e).indice >= v_med_exp AND (s.b).score_medio >  v_med_bem
          THEN 'risco_latente'
        ELSE 'estavel'
      END AS quadrante
    FROM setores s
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor',     setor,
        'bemestar',  bemestar,
        'exposicao', exposicao,
        'quadrante', quadrante
      ) ORDER BY setor
    ) FILTER (WHERE bemestar IS NOT NULL OR exposicao IS NOT NULL), '[]'::jsonb),
    COUNT(*) FILTER (WHERE bemestar IS NULL AND exposicao IS NULL)::int
  INTO v_setores, v_supr
  FROM montado;

  RETURN jsonb_build_object(
    'empresa_id',         v_empresa.id,
    'empresa_nome',       v_empresa.nome,
    'empresa_cnpj',       v_empresa.cnpj,
    'periodo_inicio',     p_inicio,
    'periodo_fim',        p_fim,
    'k_min',              k_min,
    'min_setores',        min_setores,
    'setores_comparaveis', COALESCE(v_comparaveis, 0),
    'mediana_exposicao',  CASE WHEN v_med_exp IS NULL THEN NULL ELSE ROUND(v_med_exp)::int END,
    'mediana_bemestar',   CASE WHEN v_med_bem IS NULL THEN NULL ELSE ROUND(v_med_bem)::int END,
    'setores',            v_setores,
    'setores_suprimidos', COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_matriz_psicossocial(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_matriz_psicossocial(DATE, DATE) TO authenticated;
