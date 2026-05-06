-- Backfill target_calories/protein/carbs/fats para usuários que completaram
-- o onboarding mas não têm metas de macros definidas (coluna era NULL porque
-- o finishOnboarding() antigo não as salvava).
--
-- Lógica:
--   BMR via Harris-Benedict, multiplicado pelo nível de atividade,
--   ajustado pelo objetivo — mesma fórmula usada no onboarding.
--   Macro split fixo: 30% proteína / 40% carbo / 30% gordura.
--
-- Não sobrescreve usuários que já têm um plano trimestral ativo
-- (esses já receberam targets calculados pela IA).

UPDATE public.profiles AS p
SET
  target_calories = calc.tdee,
  target_protein  = ROUND((calc.tdee * 0.30) / 4),
  target_carbs    = ROUND((calc.tdee * 0.40) / 4),
  target_fats     = ROUND((calc.tdee * 0.30) / 9),
  updated_at      = NOW()
FROM (
  SELECT
    id,
    ROUND(
      (
        -- BMR Harris-Benedict
        CASE
          WHEN gender IN ('feminino', 'female')
            THEN 447.593
                 + (9.247  * COALESCE(weight, 70))
                 + (3.098  * COALESCE(height, 170))
                 - (4.330  * COALESCE(
                     EXTRACT(YEAR FROM age(date_of_birth::date))::int,
                     30
                   ))
          ELSE
            88.362
            + (13.397 * COALESCE(weight, 70))
            + (4.799  * COALESCE(height, 170))
            - (5.677  * COALESCE(
                EXTRACT(YEAR FROM age(date_of_birth::date))::int,
                30
              ))
        END
      )
      *
      -- Multiplicador de atividade
      CASE activity_level
        WHEN 'sedentary' THEN 1.2
        WHEN 'moderate'  THEN 1.55
        WHEN 'intense'   THEN 1.725
        ELSE 1.55
      END
      +
      -- Ajuste por objetivo
      CASE goal
        WHEN 'aesthetic'   THEN -300
        WHEN 'performance' THEN  200
        ELSE 0
      END
    ) AS tdee
  FROM public.profiles
  WHERE
    onboarding_completed = true
    AND height IS NOT NULL
    AND weight IS NOT NULL
) AS calc
WHERE
  p.id = calc.id
  -- Só atualiza quem não tem metas definidas (NULL ou default genérico 2000)
  AND (p.target_calories IS NULL OR p.target_calories = 2000)
  -- Não sobrescreve quem já tem plano ativo (IA já definiu os macros)
  AND NOT EXISTS (
    SELECT 1
    FROM public.quarterly_plans qp
    WHERE qp.user_id = p.id
      AND qp.status  = 'active'
  );
