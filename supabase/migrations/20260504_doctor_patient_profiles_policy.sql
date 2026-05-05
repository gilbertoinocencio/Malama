-- Allows doctors to SELECT profiles of:
-- 1. Their own profile
-- 2. Patients they have a consultation with
-- 3. Patients referred to them

CREATE POLICY "Doctors can read their patients profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = auth.uid()
        AND profiles.referred_by_doctor_id = d.id
    )
  );
