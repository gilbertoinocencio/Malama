-- =====================================================================
-- MALAMA — Clinical Data Loop Foundation
-- Migration: 20260627_clinical_dataloop_foundation.sql
--
-- Fundação de dados de "loop fechado" para Fine-Tuning + RLHF:
--   Pilar 1: ai_clinical_reports      — persiste TODA saída de IA (X→Y)
--   Pilar 2: ai_report_feedback       — validação/intuição do médico (RLHF)
--   Pilar 3: clinical_conduct_events  — ledger imutável de condutas
--   Pilar 4: clinical_outcomes        — vínculo conduta → desfecho (T+N)
--   Rede de segurança: profiles_history / clinical_notes_history (auditoria)
--   Camada LGPD: export_training_corpus() / export_outcome_corpus() (pseudonimizado)
--
-- NOTAS DE EXECUÇÃO (memória do projeto):
--   • Rodar no SQL Editor (db push falha). O editor ABORTA tudo no 1º erro
--     → este script é idempotente e isola partes opcionais (cron/vault) em
--       blocos DO com EXCEPTION para não derrubar o resto.
--   • Trocar retorno de função exige DROP antes → todos os DROP no topo.
-- =====================================================================

-- pgcrypto p/ digest() na pseudonimização (Supabase: schema "extensions")
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- 0. CLEANUP idempotente (funções/triggers/policies)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profiles_audit       ON public.profiles;
DROP TRIGGER IF EXISTS trg_clinical_notes_audit ON public.clinical_notes;

DROP FUNCTION IF EXISTS public.fn_profiles_audit()        CASCADE;
DROP FUNCTION IF EXISTS public.fn_clinical_notes_audit()  CASCADE;
DROP FUNCTION IF EXISTS public.is_linked_doctor_of(UUID)  CASCADE;
DROP FUNCTION IF EXISTS public.apply_macro_conduct(UUID, JSONB, UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.apply_glp1_conduct(UUID, TEXT, JSONB, UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.record_conduct(UUID, TEXT, JSONB, TEXT, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_metric_near(UUID, TEXT, TIMESTAMPTZ, INT) CASCADE;
DROP FUNCTION IF EXISTS public.compute_clinical_outcomes(INT) CASCADE;
DROP FUNCTION IF EXISTS public._training_salt() CASCADE;
DROP FUNCTION IF EXISTS public.export_training_corpus() CASCADE;
DROP FUNCTION IF EXISTS public.export_outcome_corpus() CASCADE;

-- =====================================================================
-- 1. TABELAS
-- =====================================================================

-- Pilar 1 — saída de IA persistida (input_snapshot = features de treino)
CREATE TABLE IF NOT EXISTS public.ai_clinical_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  doctor_id          UUID REFERENCES public.doctors(id)           ON DELETE SET NULL,
  consultation_id    UUID REFERENCES public.consultations(id)     ON DELETE SET NULL,
  report_type        TEXT NOT NULL CHECK (report_type IN
                       ('clinical_report','pre_consult_briefing','plan_suggestion','chat_insight')),
  model              TEXT NOT NULL,
  prompt_version     TEXT,
  input_snapshot     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- SEM identificadores diretos
  input_window_start TIMESTAMPTZ,
  input_window_end   TIMESTAMPTZ,
  content            TEXT NOT NULL,
  structured_output  JSONB,
  tokens_input       INT,
  tokens_output      INT,
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_reports_patient_idx ON public.ai_clinical_reports(patient_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS ai_reports_type_idx    ON public.ai_clinical_reports(report_type);

-- Pilar 2 — feedback/validação do médico (sinal de RLHF)
CREATE TABLE IF NOT EXISTS public.ai_report_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES public.ai_clinical_reports(id) ON DELETE CASCADE,
  doctor_id         UUID NOT NULL REFERENCES public.doctors(id)             ON DELETE CASCADE,
  verdict           TEXT NOT NULL CHECK (verdict IN ('accept','accept_with_edits','reject')),
  rating            SMALLINT CHECK (rating BETWEEN 1 AND 5),
  section_flags     JSONB,
  corrected_content TEXT,
  justification     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_feedback_report_idx ON public.ai_report_feedback(report_id);
CREATE INDEX IF NOT EXISTS ai_feedback_doctor_idx ON public.ai_report_feedback(doctor_id);

-- Pilar 3 — ledger imutável de condutas
CREATE TABLE IF NOT EXISTS public.clinical_conduct_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id         UUID,
  actor_role       TEXT NOT NULL CHECK (actor_role IN ('patient','doctor','ai_agent','system')),
  conduct_type     TEXT NOT NULL CHECK (conduct_type IN
                     ('macro_target','glp1_prescription','glp1_dose','diagnosis',
                      'therapeutic_plan','activity_goal','hydration_goal')),
  payload          JSONB NOT NULL,
  rationale        TEXT,
  source_report_id UUID REFERENCES public.ai_clinical_reports(id) ON DELETE SET NULL,
  consultation_id  UUID REFERENCES public.consultations(id)       ON DELETE SET NULL,
  origin           TEXT NOT NULL DEFAULT 'trigger',
  effective_from   TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_id    UUID REFERENCES public.clinical_conduct_events(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conduct_patient_time_idx ON public.clinical_conduct_events(patient_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS conduct_type_idx         ON public.clinical_conduct_events(conduct_type);
CREATE INDEX IF NOT EXISTS conduct_source_idx       ON public.clinical_conduct_events(source_report_id);

-- Pilar 4 — vínculo conduta → desfecho
CREATE TABLE IF NOT EXISTS public.clinical_outcomes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES auth.users(id)                   ON DELETE CASCADE,
  conduct_event_id UUID NOT NULL REFERENCES public.clinical_conduct_events(id) ON DELETE CASCADE,
  metric           TEXT NOT NULL,
  horizon_days     INT  NOT NULL,
  baseline_value   NUMERIC, baseline_at TIMESTAMPTZ,
  outcome_value    NUMERIC, outcome_at  TIMESTAMPTZ,
  delta            NUMERIC, delta_pct    NUMERIC,
  data_points      INT,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conduct_event_id, metric, horizon_days)
);
CREATE INDEX IF NOT EXISTS outcomes_patient_idx ON public.clinical_outcomes(patient_id);

-- Rede de segurança — auditoria append-only
CREATE TABLE IF NOT EXISTS public.profiles_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id UUID NOT NULL,
  snapshot   JSONB NOT NULL,
  changed_columns TEXT[],
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_history_pid_idx ON public.profiles_history(profile_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.clinical_notes_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  note_id    UUID NOT NULL,
  snapshot   JSONB NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinical_notes_history_nid_idx ON public.clinical_notes_history(note_id, changed_at DESC);

-- =====================================================================
-- 2. HELPER — vínculo médico↔paciente (reusa padrão consultations + referral)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_linked_doctor_of(p_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.consultations c ON c.doctor_id = d.id
    WHERE d.user_id = auth.uid() AND c.patient_id = p_patient_id
  ) OR EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.profiles p ON p.referred_by_doctor_id = d.id
    WHERE d.user_id = auth.uid() AND p.id = p_patient_id
  );
$fn$;
GRANT EXECUTE ON FUNCTION public.is_linked_doctor_of(UUID) TO authenticated;

-- =====================================================================
-- 3. TRIGGERS — captura automática (ledger + auditoria)
-- =====================================================================

-- 3.1 profiles: auditoria total + extração semântica de conduta
CREATE OR REPLACE FUNCTION public.fn_profiles_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  old_j        JSONB := to_jsonb(OLD);
  new_j        JSONB := to_jsonb(NEW);
  changed_cols TEXT[];
  v_role       TEXT;
  v_skip       TEXT := current_setting('app.skip_conduct_trigger', true);
BEGIN
  -- colunas alteradas
  SELECT array_agg(n.key) INTO changed_cols
  FROM jsonb_each_text(new_j) n
  WHERE n.value IS DISTINCT FROM (old_j ->> n.key);

  -- auditoria SEMPRE (rede de segurança — nunca perde histórico)
  IF changed_cols IS NOT NULL THEN
    INSERT INTO public.profiles_history (profile_id, snapshot, changed_columns, changed_by)
    VALUES (OLD.id, old_j, changed_cols, auth.uid());
  END IF;

  -- conduta semântica: pular se uma RPC já registrou na mesma transação
  IF v_skip = 'on' THEN
    RETURN NULL;
  END IF;

  v_role := CASE WHEN auth.uid() = NEW.id THEN 'patient' ELSE 'doctor' END;

  -- metas de macro
  IF (new_j->>'target_calories') IS DISTINCT FROM (old_j->>'target_calories')
     OR (new_j->>'target_protein') IS DISTINCT FROM (old_j->>'target_protein')
     OR (new_j->>'target_carbs')   IS DISTINCT FROM (old_j->>'target_carbs')
     OR (new_j->>'target_fats')    IS DISTINCT FROM (old_j->>'target_fats')
     OR (new_j->>'target_fiber')   IS DISTINCT FROM (old_j->>'target_fiber') THEN
    INSERT INTO public.clinical_conduct_events
      (patient_id, actor_id, actor_role, conduct_type, payload, origin)
    VALUES (NEW.id, auth.uid(), v_role, 'macro_target',
      jsonb_strip_nulls(jsonb_build_object(
        'calories', new_j->'target_calories', 'protein', new_j->'target_protein',
        'carbs',    new_j->'target_carbs',    'fats',    new_j->'target_fats',
        'fiber',    new_j->'target_fiber')),
      'trigger');
  END IF;

  -- prescrição GLP-1 (JSONB do médico)
  IF (new_j->>'glp1_doctor_prescription') IS DISTINCT FROM (old_j->>'glp1_doctor_prescription')
     AND new_j ? 'glp1_doctor_prescription' THEN
    INSERT INTO public.clinical_conduct_events
      (patient_id, actor_id, actor_role, conduct_type, payload, origin)
    VALUES (NEW.id, auth.uid(), v_role, 'glp1_prescription',
      COALESCE(new_j->'glp1_doctor_prescription', '{}'::jsonb), 'trigger');
  END IF;

  -- dose GLP-1 atual
  IF (new_j->>'glp1_current_dose_mg') IS DISTINCT FROM (old_j->>'glp1_current_dose_mg')
     AND new_j ? 'glp1_current_dose_mg' THEN
    INSERT INTO public.clinical_conduct_events
      (patient_id, actor_id, actor_role, conduct_type, payload, origin)
    VALUES (NEW.id, auth.uid(), v_role, 'glp1_dose',
      jsonb_build_object('dose_mg', new_j->'glp1_current_dose_mg'), 'trigger');
  END IF;

  RETURN NULL;
END;
$fn$;

CREATE TRIGGER trg_profiles_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_audit();

-- 3.2 clinical_notes: auditoria + conduta na finalização
CREATE OR REPLACE FUNCTION public.fn_clinical_notes_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  old_j JSONB := to_jsonb(OLD);
BEGIN
  INSERT INTO public.clinical_notes_history (note_id, snapshot, changed_by)
  VALUES (OLD.id, old_j, auth.uid());

  -- na finalização (draft → finalizado) grava as condutas clínicas
  IF OLD.is_draft = true AND NEW.is_draft = false THEN
    IF NEW.diagnosis IS NOT NULL AND length(trim(NEW.diagnosis)) > 0 THEN
      INSERT INTO public.clinical_conduct_events
        (patient_id, actor_id, actor_role, conduct_type, payload, consultation_id, origin)
      VALUES (NEW.patient_id, auth.uid(), 'doctor', 'diagnosis',
        jsonb_build_object('diagnosis', NEW.diagnosis, 'bmi', NEW.bmi, 'weight_kg', NEW.weight_kg),
        NEW.consultation_id, 'trigger');
    END IF;
    IF NEW.plan IS NOT NULL AND length(trim(NEW.plan)) > 0 THEN
      INSERT INTO public.clinical_conduct_events
        (patient_id, actor_id, actor_role, conduct_type, payload, consultation_id, origin)
      VALUES (NEW.patient_id, auth.uid(), 'doctor', 'therapeutic_plan',
        jsonb_build_object('plan', NEW.plan, 'chief_complaint', NEW.chief_complaint),
        NEW.consultation_id, 'trigger');
    END IF;
  END IF;

  RETURN NULL;
END;
$fn$;

CREATE TRIGGER trg_clinical_notes_audit
  AFTER UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.fn_clinical_notes_audit();

-- =====================================================================
-- 4. RPCs — escrita semântica de conduta (com source_report_id/rationale)
-- =====================================================================

-- 4.1 metas de macro: grava conduta rica + atualiza profiles (1 transação)
CREATE OR REPLACE FUNCTION public.apply_macro_conduct(
  p_patient_id       UUID,
  p_macros           JSONB,
  p_source_report_id UUID DEFAULT NULL,
  p_rationale        TEXT DEFAULT NULL,
  p_consultation_id  UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id   UUID;
  v_role TEXT := CASE WHEN auth.uid() = p_patient_id THEN 'patient' ELSE 'doctor' END;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_patient_id
     AND NOT public.is_linked_doctor_of(p_patient_id) THEN
    RAISE EXCEPTION 'Acesso negado ao paciente %', p_patient_id;
  END IF;

  PERFORM set_config('app.skip_conduct_trigger', 'on', true); -- local à transação

  INSERT INTO public.clinical_conduct_events
    (patient_id, actor_id, actor_role, conduct_type, payload, rationale,
     source_report_id, consultation_id, origin)
  VALUES (p_patient_id, auth.uid(), v_role, 'macro_target', p_macros, p_rationale,
          p_source_report_id, p_consultation_id, 'rpc')
  RETURNING id INTO v_id;

  UPDATE public.profiles SET
    target_calories = COALESCE((p_macros->>'calories')::numeric, target_calories),
    target_protein  = COALESCE((p_macros->>'protein')::numeric,  target_protein),
    target_carbs    = COALESCE((p_macros->>'carbs')::numeric,    target_carbs),
    target_fats     = COALESCE((p_macros->>'fats')::numeric,     target_fats),
    target_fiber    = COALESCE((p_macros->>'fiber')::numeric,    target_fiber)
  WHERE id = p_patient_id;

  RETURN v_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.apply_macro_conduct(UUID, JSONB, UUID, TEXT, UUID) TO authenticated;

-- 4.2 GLP-1: prescrição ou dose
CREATE OR REPLACE FUNCTION public.apply_glp1_conduct(
  p_patient_id       UUID,
  p_conduct_type     TEXT,            -- 'glp1_prescription' | 'glp1_dose'
  p_payload          JSONB,
  p_source_report_id UUID DEFAULT NULL,
  p_rationale        TEXT DEFAULT NULL,
  p_consultation_id  UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id   UUID;
  v_role TEXT := CASE WHEN auth.uid() = p_patient_id THEN 'patient' ELSE 'doctor' END;
BEGIN
  IF p_conduct_type NOT IN ('glp1_prescription','glp1_dose') THEN
    RAISE EXCEPTION 'conduct_type inválido para GLP-1: %', p_conduct_type;
  END IF;
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_patient_id
     AND NOT public.is_linked_doctor_of(p_patient_id) THEN
    RAISE EXCEPTION 'Acesso negado ao paciente %', p_patient_id;
  END IF;

  PERFORM set_config('app.skip_conduct_trigger', 'on', true);

  INSERT INTO public.clinical_conduct_events
    (patient_id, actor_id, actor_role, conduct_type, payload, rationale,
     source_report_id, consultation_id, origin)
  VALUES (p_patient_id, auth.uid(), v_role, p_conduct_type, p_payload, p_rationale,
          p_source_report_id, p_consultation_id, 'rpc')
  RETURNING id INTO v_id;

  IF p_conduct_type = 'glp1_dose' THEN
    UPDATE public.profiles
      SET glp1_current_dose_mg = COALESCE((p_payload->>'dose_mg')::numeric, glp1_current_dose_mg)
      WHERE id = p_patient_id;
  ELSE
    UPDATE public.profiles
      SET glp1_doctor_prescription = p_payload
      WHERE id = p_patient_id;
  END IF;

  RETURN v_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.apply_glp1_conduct(UUID, TEXT, JSONB, UUID, TEXT, UUID) TO authenticated;

-- 4.3 conduta genérica (activity_goal/hydration_goal/etc. — sem update em profiles)
CREATE OR REPLACE FUNCTION public.record_conduct(
  p_patient_id       UUID,
  p_conduct_type     TEXT,
  p_payload          JSONB,
  p_rationale        TEXT DEFAULT NULL,
  p_source_report_id UUID DEFAULT NULL,
  p_consultation_id  UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id   UUID;
  v_role TEXT := CASE WHEN auth.uid() = p_patient_id THEN 'patient' ELSE 'doctor' END;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_patient_id
     AND NOT public.is_linked_doctor_of(p_patient_id) THEN
    RAISE EXCEPTION 'Acesso negado ao paciente %', p_patient_id;
  END IF;

  INSERT INTO public.clinical_conduct_events
    (patient_id, actor_id, actor_role, conduct_type, payload, rationale,
     source_report_id, consultation_id, origin)
  VALUES (p_patient_id, auth.uid(), v_role, p_conduct_type, p_payload, p_rationale,
          p_source_report_id, p_consultation_id, 'rpc')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.record_conduct(UUID, TEXT, JSONB, TEXT, UUID, UUID) TO authenticated;

-- =====================================================================
-- 5. CÁLCULO DE DESFECHOS
-- =====================================================================

-- métrica medida mais próxima de um instante-alvo, dentro de uma janela
CREATE OR REPLACE FUNCTION public.get_metric_near(
  p_patient_id UUID, p_metric TEXT, p_target TIMESTAMPTZ, p_window_days INT
) RETURNS TABLE (val NUMERIC, at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_metric = 'weight_kg' THEN
    RETURN QUERY
      SELECT w.weight_kg::numeric, w.logged_at
      FROM public.weight_logs w
      WHERE w.user_id = p_patient_id
        AND w.logged_at BETWEEN p_target - (p_window_days||' days')::interval
                            AND p_target + (p_window_days||' days')::interval
      ORDER BY abs(extract(epoch FROM (w.logged_at - p_target))) ASC
      LIMIT 1;
  ELSIF p_metric IN ('body_fat_pct','waist_cm','bmi') THEN
    RETURN QUERY
      SELECT (CASE p_metric
                WHEN 'body_fat_pct' THEN s.avg_body_fat_pct
                WHEN 'waist_cm'     THEN s.waist_cm
                WHEN 'bmi'          THEN s.bmi
              END)::numeric, s.snapped_at
      FROM public.body_measurement_snapshots s
      WHERE s.user_id = p_patient_id
        AND s.snapped_at BETWEEN p_target - (p_window_days||' days')::interval
                             AND p_target + (p_window_days||' days')::interval
      ORDER BY abs(extract(epoch FROM (s.snapped_at - p_target))) ASC
      LIMIT 1;
  END IF;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_metric_near(UUID, TEXT, TIMESTAMPTZ, INT) TO service_role;

-- para cada conduta madura sem desfecho no horizonte: calcula baseline/outcome
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

      IF b_val IS NOT NULL AND o_val IS NOT NULL THEN
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

-- =====================================================================
-- 6. CAMADA LGPD — corpus de treino pseudonimizado (somente service_role)
-- =====================================================================

-- salt estável no Vault (cria um aleatório se não existir)
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'training_subject_salt') THEN
    PERFORM vault.create_secret(
      replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
      'training_subject_salt',
      'Salt p/ pseudonimizar patient_id no corpus de treino (LGPD)'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vault salt não criado (cofre indisponível?): %', SQLERRM;
END;
$do$;

CREATE OR REPLACE FUNCTION public._training_salt()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $fn$
DECLARE v_salt TEXT;
BEGIN
  SELECT decrypted_secret INTO v_salt
  FROM vault.decrypted_secrets WHERE name = 'training_subject_salt';
  IF v_salt IS NULL THEN
    RAISE EXCEPTION 'training_subject_salt ausente no Vault — crie o segredo antes de exportar';
  END IF;
  RETURN v_salt;
END;
$fn$;

-- Corpus RLHF: (input_snapshot, content) + veredito/correção/justificativa do médico
CREATE OR REPLACE FUNCTION public.export_training_corpus()
RETURNS TABLE (
  subject_hash      TEXT,
  report_type       TEXT,
  model             TEXT,
  prompt_version    TEXT,
  input_snapshot    JSONB,
  ai_output         TEXT,
  doctor_corrected  TEXT,
  verdict           TEXT,
  rating            SMALLINT,
  section_flags     JSONB,
  justification     TEXT,
  generated_at      TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $fn$
  SELECT
    encode(digest(r.patient_id::text || public._training_salt(), 'sha256'), 'hex'),
    r.report_type, r.model, r.prompt_version,
    (r.input_snapshot - 'display_name' - 'name' - 'patient_name'),
    r.content, f.corrected_content, f.verdict, f.rating, f.section_flags, f.justification,
    r.generated_at
  FROM public.ai_clinical_reports r
  LEFT JOIN public.ai_report_feedback f ON f.report_id = r.id;
$fn$;
GRANT EXECUTE ON FUNCTION public.export_training_corpus() TO service_role;

-- Corpus de desfechos: conduta → delta medido em T+N
CREATE OR REPLACE FUNCTION public.export_outcome_corpus()
RETURNS TABLE (
  subject_hash   TEXT,
  conduct_type   TEXT,
  actor_role     TEXT,
  payload        JSONB,
  origin         TEXT,
  effective_from TIMESTAMPTZ,
  metric         TEXT,
  horizon_days   INT,
  baseline_value NUMERIC,
  outcome_value  NUMERIC,
  delta          NUMERIC,
  delta_pct      NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $fn$
  SELECT
    encode(digest(ce.patient_id::text || public._training_salt(), 'sha256'), 'hex'),
    ce.conduct_type, ce.actor_role, ce.payload, ce.origin, ce.effective_from,
    o.metric, o.horizon_days, o.baseline_value, o.outcome_value, o.delta, o.delta_pct
  FROM public.clinical_conduct_events ce
  JOIN public.clinical_outcomes o ON o.conduct_event_id = ce.id;
$fn$;
GRANT EXECUTE ON FUNCTION public.export_outcome_corpus() TO service_role;

-- =====================================================================
-- 7. RLS
-- =====================================================================
ALTER TABLE public.ai_clinical_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_report_feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_conduct_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_outcomes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes_history   ENABLE ROW LEVEL SECURITY;

-- ai_clinical_reports: paciente (próprio) ou médico vinculado
DROP POLICY IF EXISTS ai_reports_select ON public.ai_clinical_reports;
DROP POLICY IF EXISTS ai_reports_insert ON public.ai_clinical_reports;
CREATE POLICY ai_reports_select ON public.ai_clinical_reports
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.is_linked_doctor_of(patient_id));
CREATE POLICY ai_reports_insert ON public.ai_clinical_reports
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid() OR public.is_linked_doctor_of(patient_id));

-- ai_report_feedback: somente o médico dono do feedback
DROP POLICY IF EXISTS ai_feedback_doctor ON public.ai_report_feedback;
CREATE POLICY ai_feedback_doctor ON public.ai_report_feedback
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = ai_report_feedback.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = ai_report_feedback.doctor_id AND d.user_id = auth.uid()));

-- clinical_conduct_events: leitura paciente/médico; INSERT idem; SEM update/delete (imutável)
DROP POLICY IF EXISTS conduct_select ON public.clinical_conduct_events;
DROP POLICY IF EXISTS conduct_insert ON public.clinical_conduct_events;
CREATE POLICY conduct_select ON public.clinical_conduct_events
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.is_linked_doctor_of(patient_id));
CREATE POLICY conduct_insert ON public.clinical_conduct_events
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid() OR public.is_linked_doctor_of(patient_id));

-- clinical_outcomes: leitura paciente/médico (escrita só service_role/definer)
DROP POLICY IF EXISTS outcomes_select ON public.clinical_outcomes;
CREATE POLICY outcomes_select ON public.clinical_outcomes
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.is_linked_doctor_of(patient_id));

-- history: leitura só médico vinculado (auditoria); escrita via trigger definer
DROP POLICY IF EXISTS profiles_history_select ON public.profiles_history;
CREATE POLICY profiles_history_select ON public.profiles_history
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_linked_doctor_of(profile_id));

DROP POLICY IF EXISTS notes_history_select ON public.clinical_notes_history;
CREATE POLICY notes_history_select ON public.clinical_notes_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clinical_notes cn
    WHERE cn.id = clinical_notes_history.note_id
      AND (cn.patient_id = auth.uid() OR public.is_linked_doctor_of(cn.patient_id))
  ));

-- =====================================================================
-- 8. CRON (opcional — isolado p/ não abortar a migração se pg_cron faltar)
-- =====================================================================
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compute-clinical-outcomes') THEN
      PERFORM cron.unschedule('compute-clinical-outcomes');
    END IF;
    PERFORM cron.schedule(
      'compute-clinical-outcomes',
      '15 3 * * *',
      $cron$
        SELECT public.compute_clinical_outcomes(7);
        SELECT public.compute_clinical_outcomes(30);
        SELECT public.compute_clinical_outcomes(90);
      $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron ausente — agende compute_clinical_outcomes() externamente';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron schedule ignorado: %', SQLERRM;
END;
$do$;
