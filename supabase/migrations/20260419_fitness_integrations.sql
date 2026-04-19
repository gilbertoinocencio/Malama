-- =====================================================================
-- Fitness Integrations: Strava, Google Fit, Garmin, Polar, Samsung
-- =====================================================================

-- Armazena tokens OAuth por serviço, um registro por usuário/serviço
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('strava','google_fit','garmin','polar','samsung')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  external_user_id TEXT,        -- athlete.id (Strava), sub (Google)
  scope TEXT,
  is_connected BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync TIMESTAMPTZ,
  UNIQUE(user_id, service)
);

-- Atividades sincronizadas de qualquer serviço externo
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  external_id TEXT NOT NULL,    -- ID da atividade no serviço de origem
  activity_type TEXT,           -- 'Run', 'Ride', 'Walk', 'WeightTraining', etc.
  name TEXT,                    -- Nome dado pelo usuário à atividade
  calories_burned INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  distance_meters FLOAT,
  activity_date TIMESTAMPTZ NOT NULL,
  raw_data JSONB,               -- Payload original do serviço (para reprocessamento)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service, external_id)  -- Evita duplicatas ao sincronizar a mesma atividade
);

-- ── Row Level Security ────────────────────────────────────────────────

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_integrations"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_activities"
  ON public.activities FOR ALL
  USING (auth.uid() = user_id);

-- Service role ignora RLS (necessário para edge functions com SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "service_role_integrations"
  ON public.user_integrations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_activities"
  ON public.activities FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ── Índices ───────────────────────────────────────────────────────────

CREATE INDEX idx_activities_user_date
  ON public.activities(user_id, activity_date DESC);

CREATE INDEX idx_user_integrations_user
  ON public.user_integrations(user_id);

-- Usado pelo webhook do Strava para mapear athlete_id → user_id
CREATE INDEX idx_user_integrations_external_user
  ON public.user_integrations(external_user_id, service);
