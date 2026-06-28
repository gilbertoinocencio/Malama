-- =====================================================================
-- MALAMA — Clinical Data Loop: desfechos com medições DISTINTAS
-- Migration: 20260629_outcomes_distinct_measurements.sql
--
-- Corrige o artefato em que baseline e desfecho resolvem para a MESMA
-- medição (janelas ±10d se sobrepõem em horizontes curtos) → delta 0 falso.
-- Agora só grava desfecho quando a medição do desfecho é POSTERIOR à do
-- baseline E ocorre DEPOIS da conduta.
--
-- Idempotente. Rodar no SQL Editor.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.compute_clinical_outcomes(p_horizon_days INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  rec     RECORD;
  m       TEXT;
  metrics TEXT[] := ARRAY['weight_kg','body_fat_pct','waist_cm','bmi'];
  b_val NUMERIC; b_at TIMESTAMPTZ;
  o_val NUMERIC; o_at TIMESTAMPTZ;
  cnt   INT := 0;
BEGIN
  FOR rec IN
    SELECT ce.id, ce.patient_id, ce.effective_from
    FROM public.clinical_conduct_events ce
    WHERE ce.effective_from + (p_horizon_days||' days')::interval < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.clinical_outcomes o
        WHERE o.conduct_event_id = ce.id AND o.horizon_days = p_horizon_days
      )
  LOOP
    FOREACH m IN ARRAY metrics LOOP
      SELECT val, at INTO b_val, b_at
        FROM public.get_metric_near(rec.patient_id, m, rec.effective_from, 10);
      SELECT val, at INTO o_val, o_at
        FROM public.get_metric_near(rec.patient_id, m,
              rec.effective_from + (p_horizon_days||' days')::interval, 10);

      -- só vale como desfecho se houver DUAS medições distintas e a de
      -- desfecho for posterior ao baseline E posterior à própria conduta
      IF b_val IS NOT NULL AND o_val IS NOT NULL
         AND o_at > b_at
         AND o_at >= rec.effective_from THEN
        INSERT INTO public.clinical_outcomes
          (patient_id, conduct_event_id, metric, horizon_days,
           baseline_value, baseline_at, outcome_value, outcome_at, delta, delta_pct, data_points)
        VALUES (rec.patient_id, rec.id, m, p_horizon_days,
           b_val, b_at, o_val, o_at, (o_val - b_val),
           CASE WHEN b_val <> 0 THEN round((o_val - b_val) / b_val * 100, 2) END, 2)
        ON CONFLICT (conduct_event_id, metric, horizon_days) DO NOTHING;
        cnt := cnt + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN cnt;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.compute_clinical_outcomes(INT) TO service_role;

-- Remove os desfechos espúrios já gravados (mesma medição nos dois pontos),
-- liberando o recálculo correto.
DELETE FROM public.clinical_outcomes
WHERE baseline_at IS NULL
   OR outcome_at  IS NULL
   OR outcome_at <= baseline_at;

-- Recalcula com a regra nova
DO $do$
BEGIN
  PERFORM public.compute_clinical_outcomes(7);
  PERFORM public.compute_clinical_outcomes(30);
  PERFORM public.compute_clinical_outcomes(90);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'recálculo ignorado: %', SQLERRM;
END;
$do$;
