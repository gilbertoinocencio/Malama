-- ============================================================
-- Google Health Connect — integração de atividade física e sinais de saúde
-- ============================================================
-- Health Connect é on-device: o plugin nativo lê os registros no aparelho e o
-- app grava aqui. Sessões de exercício reaproveitam a tabela `activities`
-- (service = 'health_connect'); agregados diários (passos, calorias, distância,
-- FC, sono, % gordura) vão para `health_daily_metrics`; peso vai para
-- `weight_logs` (source = 'wearable'). Não há OAuth nem edge function.
--
-- AUTOSSUFICIENTE: cria as tabelas de fitness das quais a integração depende
-- caso ainda não existam no banco (em alguns ambientes as migrações 20260419 /
-- 20260516 não foram aplicadas). Tudo idempotente — seguro rodar mais de uma vez.
-- Aplicar via Supabase SQL Editor (db push falha neste projeto).
-- ============================================================

-- ── 0. Dependências: user_integrations + activities (de 20260419) ───────────
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  external_user_id TEXT,
  scope TEXT,
  is_connected BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync TIMESTAMPTZ,
  UNIQUE (user_id, service)
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  external_id TEXT NOT NULL,
  activity_type TEXT,
  name TEXT,
  calories_burned INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  distance_meters FLOAT,
  activity_date TIMESTAMPTZ NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (service, external_id)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_integrations" ON public.user_integrations;
CREATE POLICY "users_own_integrations"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_activities" ON public.activities;
CREATE POLICY "users_own_activities"
  ON public.activities FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_role_integrations" ON public.user_integrations;
CREATE POLICY "service_role_integrations"
  ON public.user_integrations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_activities" ON public.activities;
CREATE POLICY "service_role_activities"
  ON public.activities FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activities_user_date
  ON public.activities(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_external_user
  ON public.user_integrations(external_user_id, service);

-- Médico lê as atividades dos seus pacientes (de 20260517).
DROP POLICY IF EXISTS "Doctors can read patient activities" ON public.activities;
CREATE POLICY "Doctors can read patient activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid() AND c.patient_id = activities.user_id
    )
  );

-- ── 1. Permitir o serviço nativo 'health_connect' em user_integrations ──────
--    A linha de HC é gravada com access_token = 'native' (placeholder, pois não
--    existe token; o estado real da conexão é a permissão concedida no aparelho).
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_service_check;
ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_service_check
  CHECK (service IN ('strava','google_fit','garmin','polar','samsung','health_connect'));

-- ── 2. Dependência: weight_logs (de 20260516) — destino do peso (wearable) ──
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,2) NOT NULL,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'body_scan', 'wearable')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own weight_logs" ON public.weight_logs;
CREATE POLICY "Users can manage own weight_logs"
  ON public.weight_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can read patient weight_logs" ON public.weight_logs;
CREATE POLICY "Doctors can read patient weight_logs"
  ON public.weight_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid() AND c.patient_id = weight_logs.user_id
    )
  );

-- ── 3. Agregados diários vindos de dispositivos (Health Connect / wearables) ─
CREATE TABLE IF NOT EXISTS public.health_daily_metrics (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date         DATE        NOT NULL,
  steps               INTEGER,
  active_calories     INTEGER,
  total_calories      INTEGER,
  distance_meters     NUMERIC,
  resting_heart_rate  INTEGER,
  avg_heart_rate      INTEGER,
  sleep_minutes       INTEGER,
  body_fat_pct        NUMERIC(4,1),
  weight_kg           NUMERIC(5,2),
  source              TEXT        NOT NULL DEFAULT 'health_connect',
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Um registro por usuário/dia/origem → upsert idempotente no sync.
  UNIQUE (user_id, metric_date, source)
);

-- Garante o schema completo caso a tabela já existisse parcialmente.
ALTER TABLE public.health_daily_metrics
  ADD COLUMN IF NOT EXISTS steps              INTEGER,
  ADD COLUMN IF NOT EXISTS active_calories    INTEGER,
  ADD COLUMN IF NOT EXISTS total_calories     INTEGER,
  ADD COLUMN IF NOT EXISTS distance_meters    NUMERIC,
  ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS avg_heart_rate     INTEGER,
  ADD COLUMN IF NOT EXISTS sleep_minutes      INTEGER,
  ADD COLUMN IF NOT EXISTS body_fat_pct       NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS weight_kg          NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS source             TEXT NOT NULL DEFAULT 'health_connect',
  ADD COLUMN IF NOT EXISTS synced_at          TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_health_daily_metrics_user_date
  ON public.health_daily_metrics (user_id, metric_date DESC);

ALTER TABLE public.health_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Usuário lê e gerencia apenas os próprios registros.
DROP POLICY IF EXISTS "Users can manage own health_daily_metrics"
  ON public.health_daily_metrics;
CREATE POLICY "Users can manage own health_daily_metrics"
  ON public.health_daily_metrics FOR ALL
  TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Médico lê os agregados dos seus pacientes (mesmo padrão de activities/weight_logs).
DROP POLICY IF EXISTS "Doctors can read patient health_daily_metrics"
  ON public.health_daily_metrics;
CREATE POLICY "Doctors can read patient health_daily_metrics"
  ON public.health_daily_metrics FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctors d ON d.id = c.doctor_id
      WHERE d.user_id = auth.uid() AND c.patient_id = health_daily_metrics.user_id
    )
  );
