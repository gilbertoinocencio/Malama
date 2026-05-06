-- Fix: garante que o médico consiga ler o perfil dos seus pacientes.
-- O CREATE POLICY anterior não tinha DROP IF EXISTS, então falhava se a policy
-- já existia, deixando o médico sem acesso e retornando profile = null.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Doctors can read their patients profiles" ON public.profiles;

CREATE POLICY "Doctors can read their patients profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = profiles.id
    )
    OR (
      referred_by_doctor_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.doctors d
        WHERE d.user_id = auth.uid()
          AND d.id = profiles.referred_by_doctor_id
      )
    )
  );
