-- =====================================================================
-- MALAMA — Clinical Data Loop: BACKFILL histórico
-- Migration: 20260628_clinical_dataloop_backfill.sql
--
-- Popula clinical_conduct_events (e seeds do corpus de IA) a partir do
-- histórico já existente:
--   • doctor_plan_adjustments → conduct 'macro_target' (médico)
--   • prescriptions           → conduct 'prescription'  (médico)  [+ trigger forward]
--   • quarterly_plans         → ai_clinical_reports 'plan_suggestion'
--                               + conduct 'macro_target' (ai_agent, vinculado)
--                               + ai_report_feedback (planos supervisionados)
--
-- Idempotente: coluna source_ref + índice único deduplicam reexecuções.
-- Rodar no SQL Editor (db push falha; o editor aborta no 1º erro).
-- Pré-requisito: 20260627_clinical_dataloop_foundation.sql já aplicado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Provenance / idempotência: source_ref no ledger
-- ---------------------------------------------------------------------
ALTER TABLE public.clinical_conduct_events
  ADD COLUMN IF NOT EXISTS source_ref TEXT;

-- NULLs são distintos no índice único → linhas do trigger (source_ref NULL)
-- não conflitam entre si; só o histórico backfillado é deduplicado.
CREATE UNIQUE INDEX IF NOT EXISTS conduct_source_ref_uidx
  ON public.clinical_conduct_events(source_ref);

-- ---------------------------------------------------------------------
-- 1. Permite o tipo 'prescription' no ledger (receitas genéricas)
-- ---------------------------------------------------------------------
ALTER TABLE public.clinical_conduct_events
  DROP CONSTRAINT IF EXISTS clinical_conduct_events_conduct_type_check;
ALTER TABLE public.clinical_conduct_events
  ADD CONSTRAINT clinical_conduct_events_conduct_type_check
  CHECK (conduct_type IN
    ('macro_target','glp1_prescription','glp1_dose','diagnosis',
     'therapeutic_plan','activity_goal','hydration_goal','prescription'));

-- ---------------------------------------------------------------------
-- 2. Trigger forward em prescriptions (captura receitas FUTURAS)
--    Usa o mesmo source_ref do backfill → nunca duplica.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_prescriptions_conduct()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.clinical_conduct_events
    (patient_id, actor_id, actor_role, conduct_type, payload,
     consultation_id, origin, effective_from, source_ref)
  SELECT
    NEW.patient_id,
    (SELECT user_id FROM public.doctors WHERE id = NEW.doctor_id),
    'doctor', 'prescription',
    jsonb_strip_nulls(jsonb_build_object(
      'medication',   NEW.medication,
      'dosage',       NEW.dosage,
      'instructions', NEW.instructions,
      'status',       NEW.status)),
    NEW.consultation_id, 'trigger', COALESCE(NEW.issued_at, now()),
    'rx:' || NEW.id
  ON CONFLICT (source_ref) DO NOTHING;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_prescriptions_conduct ON public.prescriptions;
CREATE TRIGGER trg_prescriptions_conduct
  AFTER INSERT ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_prescriptions_conduct();

-- ---------------------------------------------------------------------
-- 3. BACKFILL — doctor_plan_adjustments → conduct 'macro_target'
-- ---------------------------------------------------------------------
INSERT INTO public.clinical_conduct_events
  (patient_id, actor_id, actor_role, conduct_type, payload, rationale,
   consultation_id, origin, effective_from, source_ref)
SELECT
  dpa.patient_id,
  d.user_id,
  'doctor', 'macro_target',
  jsonb_strip_nulls(jsonb_build_object(
    'calories', dpa.calorie_goal,
    'protein',  dpa.protein_goal,
    'carbs',    dpa.carb_goal,
    'fats',     dpa.fat_goal,
    'fiber',    dpa.fiber_goal,
    'water',    dpa.water_goal)),
  NULLIF(dpa.notes, ''),
  dpa.consultation_id, 'migration', dpa.applied_at,
  'dpa:' || dpa.id
FROM public.doctor_plan_adjustments dpa
LEFT JOIN public.doctors d ON d.id = dpa.doctor_id
ON CONFLICT (source_ref) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. BACKFILL — prescriptions → conduct 'prescription'
-- ---------------------------------------------------------------------
INSERT INTO public.clinical_conduct_events
  (patient_id, actor_id, actor_role, conduct_type, payload,
   consultation_id, origin, effective_from, source_ref)
SELECT
  rx.patient_id,
  d.user_id,
  'doctor', 'prescription',
  jsonb_strip_nulls(jsonb_build_object(
    'medication',   rx.medication,
    'dosage',       rx.dosage,
    'instructions', rx.instructions,
    'status',       rx.status)),
  rx.consultation_id, 'migration', rx.issued_at,
  'rx:' || rx.id
FROM public.prescriptions rx
LEFT JOIN public.doctors d ON d.id = rx.doctor_id
ON CONFLICT (source_ref) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. BACKFILL — quarterly_plans → ai_clinical_reports 'plan_suggestion'
--    (seed do corpus de IA; structured_output guarda plan_id p/ vínculo)
-- ---------------------------------------------------------------------
INSERT INTO public.ai_clinical_reports
  (patient_id, doctor_id, report_type, model, content,
   structured_output, input_snapshot, generated_at)
SELECT
  qp.user_id,
  qp.doctor_id,
  'plan_suggestion', 'gemini-2.5-flash',
  'Plano IA — ' || COALESCE(qp.content->>'calories','—') || ' kcal | P '
    || COALESCE(qp.content->'macros'->>'protein','—') || 'g · C '
    || COALESCE(qp.content->'macros'->>'carbs','—')   || 'g · G '
    || COALESCE(qp.content->'macros'->>'fats','—')    || 'g',
  qp.content || jsonb_build_object('plan_id', qp.id::text),
  '{}'::jsonb,
  qp.created_at
FROM public.quarterly_plans qp
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_clinical_reports r
  WHERE r.report_type = 'plan_suggestion'
    AND r.structured_output->>'plan_id' = qp.id::text
);

-- 5b. conduct 'macro_target' (ai_agent) vinculado ao report do plano
INSERT INTO public.clinical_conduct_events
  (patient_id, actor_id, actor_role, conduct_type, payload,
   source_report_id, origin, effective_from, source_ref)
SELECT
  r.patient_id, NULL, 'ai_agent', 'macro_target',
  jsonb_strip_nulls(jsonb_build_object(
    'calories', (r.structured_output->>'calories')::numeric,
    'protein',  (r.structured_output->'macros'->>'protein')::numeric,
    'carbs',    (r.structured_output->'macros'->>'carbs')::numeric,
    'fats',     (r.structured_output->'macros'->>'fats')::numeric)),
  r.id, 'migration', r.generated_at,
  'qp:' || (r.structured_output->>'plan_id')
FROM public.ai_clinical_reports r
WHERE r.report_type = 'plan_suggestion'
  AND r.structured_output ? 'plan_id'
  -- não duplica condutas de planos que já têm conduta vinculada (fluxo ao vivo)
  AND NOT EXISTS (
    SELECT 1 FROM public.clinical_conduct_events ce
    WHERE ce.source_report_id = r.id
  )
ON CONFLICT (source_ref) DO NOTHING;

-- 5c. ai_report_feedback dos planos supervisionados (sinal RLHF histórico)
INSERT INTO public.ai_report_feedback
  (report_id, doctor_id, verdict, justification, created_at)
SELECT
  r.id, qp.doctor_id,
  CASE WHEN COALESCE(length(trim(qp.doctor_note)), 0) > 0
       THEN 'accept_with_edits' ELSE 'accept' END,
  qp.doctor_note,
  COALESCE(qp.updated_at, qp.created_at)
FROM public.ai_clinical_reports r
JOIN public.quarterly_plans qp
  ON qp.id::text = r.structured_output->>'plan_id'
WHERE r.report_type = 'plan_suggestion'
  AND qp.doctor_approved = true
  AND qp.doctor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_report_feedback f WHERE f.report_id = r.id
  );

-- ---------------------------------------------------------------------
-- 6. Calcula desfechos para as condutas backfillada já maduras
-- ---------------------------------------------------------------------
DO $do$
BEGIN
  PERFORM public.compute_clinical_outcomes(7);
  PERFORM public.compute_clinical_outcomes(30);
  PERFORM public.compute_clinical_outcomes(90);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'compute_clinical_outcomes no backfill ignorado: %', SQLERRM;
END;
$do$;
