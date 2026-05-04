-- Adiciona colunas ausentes na tabela daily_logs
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS photo_url   text,
  ADD COLUMN IF NOT EXISTS notes       text,
  ADD COLUMN IF NOT EXISTS flow_score  numeric,
  ADD COLUMN IF NOT EXISTS weight      numeric;

-- Garante que o médico pode ler daily_logs dos seus pacientes
DROP POLICY IF EXISTS "Doctors can view patient daily logs" ON daily_logs;
CREATE POLICY "Doctors can view patient daily logs"
  ON daily_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = daily_logs.user_id
        AND consultations.doctor_id = auth.uid()
    )
  );
