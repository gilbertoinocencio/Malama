-- =====================================================
-- Malama — Acesso ao dado do paciente por TIPO de profissional
-- Migration: 20260802_acesso_por_tipo_profissional.sql
--
-- Aplicar via SQL Editor.
--
-- PROBLEMA CORRIGIDO
-- Todas as policies de acesso do profissional ao dado do paciente tinham a
-- mesma forma:
--
--   EXISTS (SELECT 1 FROM consultations c
--           JOIN doctors d ON d.id = c.doctor_id
--           WHERE d.user_id = auth.uid() AND c.patient_id = <tabela>.user_id)
--
-- Nenhuma filtrava tipo_profissional. Bastava existir UMA consulta entre o
-- profissional e o paciente. Com a entrada do psicólogo no sistema
-- (20260723_profissional_psicologo), isso significa que um psicólogo passa a
-- poder ler refeições, peso, composição corporal, doses de GLP-1 e exames dos
-- pacientes que atende — dado metabólico que está fora do escopo profissional
-- dele. Esconder na interface não resolve: o cliente é um browser e a consulta
-- ao PostgREST é direta.
--
-- DESENHO ADOTADO
-- O psicólogo não lê NENHUMA tabela de dado do paciente diretamente. Todo
-- acesso dele passará por uma RPC SECURITY DEFINER dedicada (próxima
-- migração), que é um contrato único, explícito e auditável do que a
-- psicologia enxerga — em vez de uma dezena de policies para conferir uma a
-- uma. Esta migração faz só a parte restritiva.
--
-- Nada quebra hoje: o painel do psicólogo ainda não existe.
--
-- Legado: registros com tipo_profissional NULL são médicos (mesma convenção
-- de src/lib/scheduling.ts).
-- =====================================================


-- =====================================================
-- 1. PONTO ÚNICO DE DECISÃO
--    Mesma ideia de is_super_admin(): a regra mora em um lugar só.
-- =====================================================

CREATE OR REPLACE FUNCTION medico_atende_paciente(p_patient_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consultations c
    JOIN public.doctors d ON d.id = c.doctor_id
    WHERE d.user_id = auth.uid()
      AND c.patient_id = p_patient_id
      AND COALESCE(d.tipo_profissional, 'medico') = 'medico'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION medico_atende_paciente(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION medico_atende_paciente(UUID) TO authenticated;

-- Companion, para a RPC de contexto da psicologia (próxima migração).
CREATE OR REPLACE FUNCTION psicologo_atende_paciente(p_patient_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consultations c
    JOIN public.doctors d ON d.id = c.doctor_id
    WHERE d.user_id = auth.uid()
      AND c.patient_id = p_patient_id
      AND d.tipo_profissional = 'psicologo'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION psicologo_atende_paciente(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION psicologo_atende_paciente(UUID) TO authenticated;


-- =====================================================
-- 2. POLICIES REESCRITAS
--    Cada uma preserva exatamente o acesso do próprio titular que já existia;
--    muda só o ramo do profissional.
-- =====================================================

-- ── profiles ─────────────────────────────────────────
-- Mantém o ramo de indicação (referred_by_doctor_id), também restrito a
-- médico: o dado exposto é o mesmo perfil completo.
DROP POLICY IF EXISTS "Doctors can read their patients profiles" ON public.profiles;
CREATE POLICY "Doctors can read their patients profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR medico_atende_paciente(profiles.id)
    OR (
      referred_by_doctor_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.doctors d
        WHERE d.user_id = auth.uid()
          AND d.id = profiles.referred_by_doctor_id
          AND COALESCE(d.tipo_profissional, 'medico') = 'medico'
      )
    )
  );

-- ── daily_logs ───────────────────────────────────────
DROP POLICY IF EXISTS "Doctors can view patient daily logs" ON public.daily_logs;
CREATE POLICY "Doctors can view patient daily logs"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR medico_atende_paciente(daily_logs.user_id)
  );

-- ── weight_logs ──────────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient weight_logs" ON public.weight_logs;
CREATE POLICY "Doctors can read patient weight_logs"
  ON public.weight_logs FOR SELECT
  TO authenticated
  USING (medico_atende_paciente(weight_logs.user_id));

-- ── activities ───────────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient activities" ON public.activities;
CREATE POLICY "Doctors can read patient activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR medico_atende_paciente(activities.user_id)
  );

-- ── health_daily_metrics ─────────────────────────────
-- Carrega body_fat_pct e weight_kg junto com sono e passos, e RLS é por
-- linha, não por coluna. Por isso o sono chega à psicologia pela RPC, com
-- as colunas selecionadas, e não por policy nesta tabela.
DROP POLICY IF EXISTS "Doctors can read patient health_daily_metrics"
  ON public.health_daily_metrics;
CREATE POLICY "Doctors can read patient health_daily_metrics"
  ON public.health_daily_metrics FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR medico_atende_paciente(health_daily_metrics.user_id)
  );

-- ── body_measurement_snapshots ───────────────────────
DROP POLICY IF EXISTS "Doctors can read patient body_measurement_snapshots"
  ON public.body_measurement_snapshots;
CREATE POLICY "Doctors can read patient body_measurement_snapshots"
  ON public.body_measurement_snapshots FOR SELECT
  TO authenticated
  USING (medico_atende_paciente(body_measurement_snapshots.user_id));

-- ── daily_checkins ───────────────────────────────────
-- Humor, energia e sono — é o dado que a psicologia mais quer. Ainda assim
-- vai pela RPC, para o contrato do que a psicologia lê ficar em um só lugar.
DROP POLICY IF EXISTS "Doctors can read patient daily_checkins" ON public.daily_checkins;
CREATE POLICY "Doctors can read patient daily_checkins"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (medico_atende_paciente(daily_checkins.user_id));

-- ── glp1_dose_logs ───────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient glp1_dose_logs" ON public.glp1_dose_logs;
CREATE POLICY "Doctors can read patient glp1_dose_logs"
  ON public.glp1_dose_logs FOR SELECT
  TO authenticated
  USING (medico_atende_paciente(glp1_dose_logs.user_id));

-- ── meals ────────────────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient meals" ON public.meals;
CREATE POLICY "Doctors can read patient meals"
  ON public.meals FOR SELECT
  TO authenticated
  USING (medico_atende_paciente(meals.user_id));

-- ── storage: exames do paciente ──────────────────────
DROP POLICY IF EXISTS "doctor_exams_read" ON storage.objects;
CREATE POLICY "doctor_exams_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-exams'
    AND EXISTS (
      SELECT 1 FROM public.patient_exams pe
        JOIN public.doctors d ON d.id = pe.doctor_id
      WHERE d.user_id = auth.uid()
        AND COALESCE(d.tipo_profissional, 'medico') = 'medico'
        AND pe.file_url LIKE '%' || name
    )
  );


-- =====================================================
-- 3. CONFERÊNCIA
--
-- Rode a query abaixo depois de aplicar. Ela lista policies que ainda
-- referenciam a tabela doctors sem passar pelo ponto único — ou seja,
-- qualquer acesso de profissional que tenha escapado desta migração
-- (inclusive policies criadas depois dela):
--
--   SELECT schemaname, tablename, policyname
--   FROM pg_policies
--   WHERE qual LIKE '%doctors%'
--     AND qual NOT LIKE '%medico_atende_paciente%'
--     AND qual NOT LIKE '%tipo_profissional%'
--   ORDER BY tablename;
--
-- O resultado esperado é apenas policies em que o profissional acessa dado
-- DELE (doctor_notifications, payouts, consultation_credits e afins), nunca
-- dado clínico do paciente.
-- =====================================================
