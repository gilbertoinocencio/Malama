-- =====================================================
-- NURA — GLP-1 Module Enhancements
-- Extends glp1_doses + profiles with full dose tracking,
-- application schedule, and doctor prescription support.
-- =====================================================

-- ── glp1_doses: extended tracking fields ─────────────────────────────────

ALTER TABLE glp1_doses
  ADD COLUMN IF NOT EXISTS application_site   TEXT,          -- 'abdomen' | 'thigh_left' | 'thigh_right' | 'arm_left' | 'arm_right'
  ADD COLUMN IF NOT EXISTS side_effects       TEXT[],        -- e.g. ['nausea', 'fatigue']
  ADD COLUMN IF NOT EXISTS energy_level       SMALLINT,      -- 1-5 scale
  ADD COLUMN IF NOT EXISTS mood_level         SMALLINT;      -- 1-5 scale

-- ── profiles: GLP-1 schedule and doctor prescription ──────────────────────

-- Current dose the patient is on (user-configured, can be overridden by doctor)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS glp1_current_dose_mg      NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS glp1_end_date             TEXT,       -- YYYY-MM-DD when GLP-1 mode was deactivated
  ADD COLUMN IF NOT EXISTS glp1_paused_at            TEXT,       -- YYYY-MM-DD if paused

  -- Application schedule: {"frequency": "weekly"|"daily", "day_of_week": 0-6, "time": "HH:MM"}
  ADD COLUMN IF NOT EXISTS glp1_application_schedule JSONB,

  -- Doctor prescription: set from doctor portal, overrides patient config for locked fields
  -- Structure: {
  --   medication: string, current_dose_mg: number, next_dose_mg: number,
  --   frequency: 'weekly'|'daily', day_of_week: number, time: string,
  --   macro_protein_g: number, macro_carbs_g: number, macro_fats_g: number, macro_calories: number,
  --   notes: string, doctor_name: string, doctor_id: string,
  --   locked_fields: string[], prescribed_at: string
  -- }
  ADD COLUMN IF NOT EXISTS glp1_doctor_prescription  JSONB;

-- Index for queries that need to check if next application reminder is due
CREATE INDEX IF NOT EXISTS idx_profiles_glp1_schedule
  ON profiles(glp1_application_schedule)
  WHERE glp1_mode = true AND glp1_application_schedule IS NOT NULL;
