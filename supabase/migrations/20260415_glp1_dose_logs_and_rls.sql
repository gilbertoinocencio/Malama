-- =====================================================
-- NURA — GLP-1 Dose Logs Table + Profile Enhancements
-- =====================================================
-- This migration:
--   1. Creates glp1_dose_logs — the canonical application log
--      (supercedes localStorage for "confirmed today" tracking)
--   2. Adds glp1_start_date + glp1_mode_active to profiles
--   3. Adds a BEFORE UPDATE trigger that restricts writes to
--      profiles.glp1_doctor_prescription to linked doctors only


-- ── 1. glp1_dose_logs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS glp1_dose_logs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  dose_mg       NUMERIC(6,3),
  body_location TEXT,                                          -- 'abdomen_right' | 'thigh_left' | ...
  side_effects  JSONB,                                         -- e.g. ["nausea","fatigue"]
  energy_level  SMALLINT    CHECK (energy_level BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE glp1_dose_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dose logs" ON glp1_dose_logs
  FOR ALL USING (auth.uid() = user_id);

-- Fast lookup: "did this user log a dose today / recently?"
CREATE INDEX IF NOT EXISTS idx_glp1_dose_logs_user_date
  ON glp1_dose_logs (user_id, applied_at DESC);


-- ── 2. profiles: add glp1_start_date + glp1_mode_active ──────────────────────

-- glp1_start_date may already exist as a text column from earlier code;
-- use IF NOT EXISTS to be safe.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS glp1_start_date   DATE,
  ADD COLUMN IF NOT EXISTS glp1_mode_active  BOOLEAN NOT NULL DEFAULT false;

-- Backfill glp1_mode_active from existing glp1_mode flag
UPDATE profiles
  SET glp1_mode_active = true
  WHERE glp1_mode = true
    AND glp1_mode_active = false;


-- ── 3. RLS trigger: glp1_doctor_prescription may only be written by a linked doctor ──

-- Drop first if it exists (idempotent re-runs)
DROP TRIGGER IF EXISTS trg_glp1_prescription_write ON profiles;
DROP FUNCTION IF EXISTS check_glp1_prescription_write();

CREATE OR REPLACE FUNCTION check_glp1_prescription_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- No change to the prescription column → always allow
  IF NEW.glp1_doctor_prescription IS NOT DISTINCT FROM OLD.glp1_doctor_prescription THEN
    RETURN NEW;
  END IF;

  -- Service-role callers have auth.uid() = NULL → bypass (Edge Functions, migrations)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow if the caller is a doctor with an approved status linked to this patient
  -- via at least one consultation record
  IF EXISTS (
    SELECT 1
    FROM   doctors      d
    JOIN   consultations c ON c.doctor_id = d.id
    WHERE  d.user_id    = auth.uid()
      AND  c.patient_id = NEW.id
      AND  d.status     = 'approved'
  ) THEN
    RETURN NEW;
  END IF;

  -- Deny everyone else
  RAISE EXCEPTION 'permission_denied: only a linked approved doctor may set glp1_doctor_prescription'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_glp1_prescription_write
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_glp1_prescription_write();

COMMENT ON FUNCTION check_glp1_prescription_write IS
  'Enforces that glp1_doctor_prescription can only be changed by an approved doctor '
  'who has at least one consultation record linked to this patient. '
  'Service-role callers (Edge Functions, migrations) are exempt.';
