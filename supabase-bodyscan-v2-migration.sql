-- ============================================================
-- Body Scan v2 Migration — MediaPipe-derived measurements
-- ============================================================
-- This table stores anthropometric data computed locally
-- via MediaPipe Pose Landmarker + Deurenberg BF% formula.
--
-- NO photo data is stored — all image processing is 100% local.
-- Only numerical measurements reach the server.
--
-- Coexists with the existing body_scans table (Gemini-based).
-- ============================================================

-- 1. Create the measurements table
CREATE TABLE IF NOT EXISTS body_scan_measurements (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_date            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Anthropometric estimates (all in cm, ±4 cm margin)
  waist_cm             NUMERIC(5,1),
  hip_cm               NUMERIC(5,1),
  bust_cm              NUMERIC(5,1),

  -- Body composition
  bf_percentage        NUMERIC(4,1),    -- Deurenberg formula (±4%)
  estimation_confidence NUMERIC(5,1),  -- 0–100, average key-landmark visibility

  -- Context used for calculation (immutable reference)
  height_cm_used       NUMERIC(5,1) NOT NULL,

  -- Optional user note (e.g. "after workout", "morning")
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_bsm_user_date
  ON body_scan_measurements (user_id, scan_date DESC);

-- 3. Row-Level Security
ALTER TABLE body_scan_measurements ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own scans
CREATE POLICY "body_scan_measurements_select"
  ON body_scan_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "body_scan_measurements_insert"
  ON body_scan_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_scan_measurements_delete"
  ON body_scan_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Extend existing body_scans table with new columns
--    (adds estimation_confidence and notes without breaking existing code)

ALTER TABLE body_scans
  ADD COLUMN IF NOT EXISTS estimation_confidence NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Helper view: latest scan per user (convenience for dashboards)
CREATE OR REPLACE VIEW latest_body_scan_measurements AS
SELECT DISTINCT ON (user_id)
  *
FROM body_scan_measurements
ORDER BY user_id, scan_date DESC;

-- Grant access to the view via RLS on the underlying table
GRANT SELECT ON latest_body_scan_measurements TO authenticated;
