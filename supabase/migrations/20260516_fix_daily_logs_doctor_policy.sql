-- Fix doctor read policy on daily_logs
-- Previous policy used consultations.doctor_id = auth.uid() which is wrong:
-- doctor_id in consultations references doctors.id, not auth user id.
DROP POLICY IF EXISTS "Doctors can view patient daily logs" ON public.daily_logs;
CREATE POLICY "Doctors can view patient daily logs"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = daily_logs.user_id
    )
  );
