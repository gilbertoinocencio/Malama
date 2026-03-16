-- ============================================
-- NURA Body Scan Analysis Schema
-- ============================================
-- This schema stores body composition analysis from AI-powered photo scans
-- Enables progress tracking, visual comparison, and anthropometric measurements

-- ============================================
-- SECTION 1: Body Scans Table
-- ============================================

CREATE TABLE IF NOT EXISTS body_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Photo Information
  photo_url TEXT NOT NULL,
  pose_type TEXT NOT NULL CHECK (pose_type IN ('front', 'side', 'back')),

  -- AI Analysis Results
  body_fat_percentage NUMERIC(4,1), -- e.g., 18.5%
  muscle_mass_kg NUMERIC(5,2), -- e.g., 62.35 kg
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100), -- Photo quality score

  -- Circumference Measurements (in cm)
  measurements JSONB DEFAULT '{}'::jsonb,
  -- Example structure: {
  --   "waist": 82.5,
  --   "hip": 95.0,
  --   "chest": 98.2,
  --   "arm_left": 32.1,
  --   "arm_right": 32.3,
  --   "thigh_left": 55.8,
  --   "thigh_right": 56.0,
  --   "calf_left": 36.5,
  --   "calf_right": 36.7
  -- }

  -- Reference Data (snapshot at scan time)
  height_cm NUMERIC(5,2) NOT NULL, -- User height at scan time
  weight_kg NUMERIC(5,2) NOT NULL, -- User weight at scan time
  age INTEGER, -- Age at scan time
  gender TEXT CHECK (gender IN ('male', 'female')),

  -- Calculated Metrics
  bmi NUMERIC(4,2), -- Body Mass Index
  ffmi NUMERIC(4,2), -- Fat-Free Mass Index
  detected_biotype TEXT CHECK (detected_biotype IN ('ecto', 'meso', 'endo')),

  -- AI Context
  ai_prompt TEXT, -- Prompt used for analysis
  ai_raw_response JSONB, -- Full AI response for debugging

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Indexes for common queries
  CONSTRAINT unique_user_pose_date UNIQUE(user_id, pose_type, created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_body_scans_user_id ON body_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_body_scans_created_at ON body_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_scans_user_pose ON body_scans(user_id, pose_type);

-- ============================================
-- SECTION 2: Body Scan Sessions
-- ============================================
-- Groups the 3 poses (front, side, back) taken at same time

CREATE TABLE IF NOT EXISTS body_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session metadata
  completed BOOLEAN DEFAULT false,
  tutorial_shown BOOLEAN DEFAULT false,

  -- Scan IDs for each pose
  front_scan_id UUID REFERENCES body_scans(id) ON DELETE SET NULL,
  side_scan_id UUID REFERENCES body_scans(id) ON DELETE SET NULL,
  back_scan_id UUID REFERENCES body_scans(id) ON DELETE SET NULL,

  -- Aggregate metrics (average of all 3 poses)
  avg_body_fat NUMERIC(4,1),
  avg_muscle_mass NUMERIC(5,2),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Only one active session per user
  CONSTRAINT unique_active_session UNIQUE(user_id, completed)
);

CREATE INDEX IF NOT EXISTS idx_body_scan_sessions_user ON body_scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_body_scan_sessions_completed ON body_scan_sessions(completed_at DESC);

-- ============================================
-- SECTION 3: Row Level Security (RLS)
-- ============================================

ALTER TABLE body_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_scan_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own scans
DROP POLICY IF EXISTS "Users can view own body scans" ON body_scans;
CREATE POLICY "Users can view own body scans"
  ON body_scans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own body scans" ON body_scans;
CREATE POLICY "Users can insert own body scans"
  ON body_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own body scans" ON body_scans;
CREATE POLICY "Users can update own body scans"
  ON body_scans FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own body scans" ON body_scans;
CREATE POLICY "Users can delete own body scans"
  ON body_scans FOR DELETE
  USING (auth.uid() = user_id);

-- Sessions policies
DROP POLICY IF EXISTS "Users can view own scan sessions" ON body_scan_sessions;
CREATE POLICY "Users can view own scan sessions"
  ON body_scan_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scan sessions" ON body_scan_sessions;
CREATE POLICY "Users can insert own scan sessions"
  ON body_scan_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scan sessions" ON body_scan_sessions;
CREATE POLICY "Users can update own scan sessions"
  ON body_scan_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- SECTION 4: Storage Bucket for Body Scan Photos
-- ============================================

-- Create bucket for body scan photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('body-scans', 'body-scans', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Users can only access their own photos
DROP POLICY IF EXISTS "Users can view own body scan photos" ON storage.objects;
CREATE POLICY "Users can view own body scan photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'body-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload own body scan photos" ON storage.objects;
CREATE POLICY "Users can upload own body scan photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'body-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own body scan photos" ON storage.objects;
CREATE POLICY "Users can update own body scan photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'body-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own body scan photos" ON storage.objects;
CREATE POLICY "Users can delete own body scan photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'body-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- SECTION 5: Helper Functions
-- ============================================

-- Function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi(weight_kg NUMERIC, height_cm NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate FFMI (Fat-Free Mass Index)
CREATE OR REPLACE FUNCTION calculate_ffmi(
  weight_kg NUMERIC,
  height_cm NUMERIC,
  body_fat_pct NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  lean_mass_kg NUMERIC;
  height_m NUMERIC;
BEGIN
  lean_mass_kg := weight_kg * (1 - body_fat_pct / 100.0);
  height_m := height_cm / 100.0;
  RETURN ROUND((lean_mass_kg / POWER(height_m, 2))::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 6: Trigger to auto-calculate metrics
-- ============================================

CREATE OR REPLACE FUNCTION auto_calculate_body_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate BMI
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL THEN
    NEW.bmi := calculate_bmi(NEW.weight_kg, NEW.height_cm);
  END IF;

  -- Calculate FFMI
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.body_fat_percentage IS NOT NULL THEN
    NEW.ffmi := calculate_ffmi(NEW.weight_kg, NEW.height_cm, NEW.body_fat_percentage);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_metrics ON body_scans;
CREATE TRIGGER trigger_auto_calculate_metrics
  BEFORE INSERT OR UPDATE ON body_scans
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_body_metrics();

-- ============================================
-- Success message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Body Scan schema created successfully!';
  RAISE NOTICE '📸 Tables: body_scans, body_scan_sessions';
  RAISE NOTICE '🗄️ Storage bucket: body-scans';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Auto-calculation triggers active';
END $$;
