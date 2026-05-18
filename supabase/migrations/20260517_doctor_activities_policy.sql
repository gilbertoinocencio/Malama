-- Médicos podem ler as atividades físicas dos seus pacientes no painel clínico.
-- Segue o mesmo padrão de weight_logs e daily_logs.
DROP POLICY IF EXISTS "Doctors can read patient activities" ON public.activities;
CREATE POLICY "Doctors can read patient activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = activities.user_id
    )
  );
