-- =====================================================
-- NURA — GLP-1 Dose Tracking + Doctor Meal Schedules
-- =====================================================

-- Table: glp1_doses
-- Stores each manual dose application logged by the user via chat
CREATE TABLE IF NOT EXISTS glp1_doses (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medication              TEXT NOT NULL,
  dose_mg                 NUMERIC(6,3),
  applied_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes                   TEXT,
  is_first                BOOLEAN DEFAULT false,
  phase                   TEXT,
  next_dose_scheduled_at  TIMESTAMPTZ,
  notification_sent       BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE glp1_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own doses" ON glp1_doses
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast cron lookup of pending notifications
CREATE INDEX IF NOT EXISTS idx_glp1_doses_next_dose
  ON glp1_doses(next_dose_scheduled_at)
  WHERE notification_sent = false;

-- Add meal schedule column to profiles
-- Stores doctor-recommended meal slots as JSONB array
-- Example: [{"time":"08:00","label":"Café da manhã","notes":"Proteína + carboidrato leve"}]
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS glp1_meal_schedule JSONB;

-- Table: push_subscriptions (if not already created)
-- Stores browser Web Push subscription objects per user
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
