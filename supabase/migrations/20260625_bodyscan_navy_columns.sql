-- ============================================================
-- Body Scan — colunas da fórmula US Navy + tabela espelho de snapshots
-- ============================================================
-- Corrige a falha de gravação do Body Scan: o código (useBodyScan.saveScan)
-- insere `neck_cm` e `bf_formula`, mas a tabela criada em
-- supabase-bodyscan-v2-migration.sql não tinha essas colunas → o insert
-- era rejeitado pelo Postgres e o app exibia "Erro ao salvar".
--
-- Também cria `body_measurement_snapshots` (espelho lido pelo portal do
-- médico em BodyCompositionDashboard), que nunca teve migration no repo.
--
-- Idempotente — seguro rodar mais de uma vez. Aplicar via Supabase SQL Editor
-- (db push falha neste projeto).
-- ============================================================

-- 1. Colunas faltantes em body_scan_measurements
ALTER TABLE public.body_scan_measurements
  ADD COLUMN IF NOT EXISTS neck_cm    NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS bf_formula TEXT;

-- 2. Tabela espelho para MetricsChart + portal do médico
CREATE TABLE IF NOT EXISTS public.body_measurement_snapshots (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Sessão opcional (preenchida por MeasurementSnapshotService.createFromSession)
  session_id          TEXT,

  -- Composição corporal
  avg_body_fat_pct    NUMERIC(4,1),
  avg_muscle_mass_kg  NUMERIC(5,2),
  avg_ai_score        NUMERIC(4,1),
  detected_biotype    TEXT,

  -- Circunferências (cm)
  waist_cm            NUMERIC(5,1),
  hip_cm              NUMERIC(5,1),
  chest_cm            NUMERIC(5,1),
  neck_cm             NUMERIC(4,1),
  arm_left_cm         NUMERIC(4,1),
  arm_right_cm        NUMERIC(4,1),
  thigh_left_cm       NUMERIC(4,1),
  thigh_right_cm      NUMERIC(4,1),
  calf_left_cm        NUMERIC(4,1),
  calf_right_cm       NUMERIC(4,1),

  -- Contexto
  weight_kg           NUMERIC(5,1),
  height_cm           NUMERIC(5,1),
  bmi                 NUMERIC(4,1),

  snapped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. Caso a tabela já existisse (criada manualmente) sem todas as colunas,
--     garante o schema completo de forma idempotente.
ALTER TABLE public.body_measurement_snapshots
  ADD COLUMN IF NOT EXISTS session_id         TEXT,
  ADD COLUMN IF NOT EXISTS avg_body_fat_pct   NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS avg_muscle_mass_kg NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS avg_ai_score       NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS detected_biotype   TEXT,
  ADD COLUMN IF NOT EXISTS waist_cm           NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS hip_cm             NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS chest_cm           NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS neck_cm            NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS arm_left_cm        NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS arm_right_cm       NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS thigh_left_cm      NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS thigh_right_cm     NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS calf_left_cm       NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS calf_right_cm      NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS weight_kg          NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS height_cm          NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS bmi                NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS snapped_at         TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bms_user_date
  ON public.body_measurement_snapshots (user_id, snapped_at DESC);

-- 3. Row-Level Security
ALTER TABLE public.body_measurement_snapshots ENABLE ROW LEVEL SECURITY;

-- Usuário lê e gerencia apenas os próprios snapshots
DROP POLICY IF EXISTS "Users can manage own body_measurement_snapshots"
  ON public.body_measurement_snapshots;
CREATE POLICY "Users can manage own body_measurement_snapshots"
  ON public.body_measurement_snapshots
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Médico pode ler os snapshots dos seus pacientes (mesma lógica do weight_logs)
DROP POLICY IF EXISTS "Doctors can read patient body_measurement_snapshots"
  ON public.body_measurement_snapshots;
CREATE POLICY "Doctors can read patient body_measurement_snapshots"
  ON public.body_measurement_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid()
        AND c.patient_id = body_measurement_snapshots.user_id
    )
  );
