-- ============================================
-- NURA PERSONAL COACH SYSTEM
-- Sistema de acompanhamento diário tipo personal coach
-- ============================================

-- Daily Missions Table
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL,

  -- Mission Types: 'hydration', 'meal_timing', 'protein_intake', 'exercise', 'sleep', 'checkin'
  mission_type TEXT NOT NULL,

  -- Mission details
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC, -- e.g., 3000ml water, 150g protein, 8h sleep
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- 'ml', 'g', 'hours', 'times', etc.

  -- Status
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- XP Reward
  xp_reward INTEGER DEFAULT 10,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, mission_date, mission_type)
);

-- Meal Suggestions Table
CREATE TABLE IF NOT EXISTS meal_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_date DATE NOT NULL,

  -- Meal timing: 'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'pre_workout', 'post_workout', 'dinner', 'evening_snack'
  meal_time TEXT NOT NULL,
  suggested_hour TEXT, -- e.g., "07:00", "12:00"

  -- Suggestion details
  meal_name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB, -- Array of ingredients with quantities
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fats INTEGER,

  -- User actions
  accepted BOOLEAN DEFAULT NULL, -- NULL = not seen, TRUE = accepted, FALSE = rejected
  logged BOOLEAN DEFAULT FALSE,
  logged_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,

  -- AI context
  reasoning TEXT, -- Why this meal was suggested
  alternatives JSONB, -- Array of alternative meal suggestions

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, suggestion_date, meal_time)
);

-- Daily Check-ins Table
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  checkin_time TIMESTAMPTZ DEFAULT NOW(),

  -- Metrics (1-10 scale)
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  motivation INTEGER CHECK (motivation BETWEEN 1 AND 10),

  -- Physical feedback
  weight NUMERIC,
  sleep_hours NUMERIC,
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),

  -- Open feedback
  notes TEXT,
  symptoms JSONB, -- Array of symptoms: ['headache', 'fatigue', 'bloating', etc.]

  -- Coach response
  coach_feedback TEXT, -- AI-generated personalized feedback
  adjustments_made JSONB, -- Adjustments to plan based on checkin

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, checkin_date)
);

-- Weekly Progress Snapshots
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Aggregated metrics
  avg_energy_level NUMERIC,
  avg_sleep_hours NUMERIC,
  total_missions_completed INTEGER,
  total_xp_earned INTEGER,
  streak_days INTEGER,

  -- Weight tracking
  starting_weight NUMERIC,
  ending_weight NUMERIC,
  weight_change NUMERIC,

  -- Compliance
  meals_logged_count INTEGER,
  meals_suggested_count INTEGER,
  compliance_percentage NUMERIC,

  -- AI insights
  weekly_insights TEXT,
  next_week_adjustments JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, week_start_date)
);

-- Coaching Insights (AI-generated personalized tips)
CREATE TABLE IF NOT EXISTS coaching_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Insight metadata
  insight_type TEXT NOT NULL, -- 'tip', 'warning', 'celebration', 'adjustment'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_items JSONB, -- Array of suggested actions

  -- Context
  related_to TEXT, -- 'hydration', 'protein', 'sleep', 'energy', etc.
  triggered_by TEXT, -- What triggered this insight

  -- User interaction
  seen BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  acted_upon BOOLEAN DEFAULT FALSE,

  -- Timing
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date ON daily_missions(user_id, mission_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_suggestions_user_date ON meal_suggestions(user_id, suggestion_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_user_week ON weekly_snapshots(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_insights_user_active ON coaching_insights(user_id, seen, dismissed);

-- Row Level Security (RLS) Policies
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_insights ENABLE ROW LEVEL SECURITY;

-- Policies for daily_missions
CREATE POLICY "Users can view own missions"
  ON daily_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions"
  ON daily_missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON daily_missions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for meal_suggestions
CREATE POLICY "Users can view own meal suggestions"
  ON meal_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal suggestions"
  ON meal_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal suggestions"
  ON meal_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for daily_checkins
CREATE POLICY "Users can view own checkins"
  ON daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON daily_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for weekly_snapshots
CREATE POLICY "Users can view own snapshots"
  ON weekly_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON weekly_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for coaching_insights
CREATE POLICY "Users can view own insights"
  ON coaching_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON coaching_insights FOR UPDATE
  USING (auth.uid() = user_id);
