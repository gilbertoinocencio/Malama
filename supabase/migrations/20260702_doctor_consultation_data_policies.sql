-- =====================================================
-- Malama — Leitura de dados do paciente pelo médico
-- A sala de consulta e o perfil do paciente no portal médico consultam
-- daily_checkins (humor/energia do check-in), glp1_dose_logs (última
-- aplicação) e meals (adesão alimentar), mas essas tabelas só tinham
-- policy de "dono" — para o médico a RLS devolvia lista vazia em
-- silêncio e os painéis apareciam em branco.
-- Mesmo padrão das policies já existentes (weight_logs, daily_logs,
-- activities, health_daily_metrics, body_measurement_snapshots):
-- médico lê apenas pacientes com quem tem consulta.
-- =====================================================

-- ── daily_checkins ───────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient daily_checkins" ON public.daily_checkins;
CREATE POLICY "Doctors can read patient daily_checkins"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = daily_checkins.user_id
    )
  );

-- ── glp1_dose_logs ───────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient glp1_dose_logs" ON public.glp1_dose_logs;
CREATE POLICY "Doctors can read patient glp1_dose_logs"
  ON public.glp1_dose_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = glp1_dose_logs.user_id
    )
  );

-- ── meals ────────────────────────────────────────────
DROP POLICY IF EXISTS "Doctors can read patient meals" ON public.meals;
CREATE POLICY "Doctors can read patient meals"
  ON public.meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = meals.user_id
    )
  );
