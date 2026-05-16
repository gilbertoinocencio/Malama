-- Garante que a tabela weight_logs existe com schema correto
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,2) NOT NULL,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'body_scan', 'wearable')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS caso ainda não esteja ativo
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Usuário lê e gerencia apenas os próprios registros
DROP POLICY IF EXISTS "Users can manage own weight_logs" ON public.weight_logs;
CREATE POLICY "Users can manage own weight_logs"
  ON public.weight_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Médico pode ler o histórico de peso dos seus pacientes (mesma lógica do profiles)
DROP POLICY IF EXISTS "Doctors can read patient weight_logs" ON public.weight_logs;
CREATE POLICY "Doctors can read patient weight_logs"
  ON public.weight_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = weight_logs.user_id
    )
  );
