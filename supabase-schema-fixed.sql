-- NURA Database Schema (Fixed Version)
-- Run this script in your Supabase SQL Editor
-- Execute in order, section by section if needed

-- ============================================
-- SECTION 1: Extensions and Basic Tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,

  -- Gamification
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_flow_days INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,

  -- Nutrition Targets
  target_calories INTEGER,
  target_protein INTEGER,
  target_carbs INTEGER,
  target_fats INTEGER,

  -- User Configuration
  goal TEXT CHECK (goal IN ('aesthetic', 'health', 'performance')),
  biotype TEXT CHECK (biotype IN ('ecto', 'meso', 'endo')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'moderate', 'intense')),

  -- Anthropometry
  weight NUMERIC,
  height NUMERIC,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  body_fat NUMERIC,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 2: Feature Tables
-- ============================================

-- Meals Table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein INTEGER NOT NULL,
  carbs INTEGER NOT NULL,
  fats INTEGER NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('manual', 'ai-chat', 'ai-photo', 'ai-voice')),
  items JSONB,
  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Logs Table
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Hydration
  water_intake INTEGER DEFAULT 0,
  water_goal INTEGER DEFAULT 2000,

  -- Wellness Journal
  energy_level INTEGER,
  mood INTEGER,
  sleep_hours NUMERIC,
  stress_level INTEGER,
  notes TEXT,

  -- Activity
  steps INTEGER,
  active_minutes INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Flow Stats Table
CREATE TABLE IF NOT EXISTS flow_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  flow_score INTEGER,
  calories_consumed INTEGER DEFAULT 0,
  protein_consumed INTEGER DEFAULT 0,
  carbs_consumed INTEGER DEFAULT 0,
  fats_consumed INTEGER DEFAULT 0,

  in_flow BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('meal', 'streak', 'hydration', 'plan', 'visual')),
  content JSONB NOT NULL,
  image_url TEXT,

  likes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_awarded INTEGER DEFAULT 0,

  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 3: Nutritionist Agent Tables (NEW)
-- ============================================

-- Nutritionist Onboarding Table
CREATE TABLE IF NOT EXISTS nutritionist_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  current_stage TEXT NOT NULL DEFAULT 'WELCOME',
  completed BOOLEAN DEFAULT FALSE,

  data JSONB NOT NULL DEFAULT '{}',
  messages JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Quarterly Plans Table
CREATE TABLE IF NOT EXISTS quarterly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  content JSONB NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),

  onboarding_id UUID REFERENCES nutritionist_onboarding(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 4: Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_stats_user_date ON flow_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON nutritionist_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_user_status ON quarterly_plans(user_id, status);

-- ============================================
-- SECTION 5: Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutritionist_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own meals" ON meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
DROP POLICY IF EXISTS "Users can update own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete own meals" ON meals;

DROP POLICY IF EXISTS "Users can view own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;

DROP POLICY IF EXISTS "Users can view own flow stats" ON flow_stats;
DROP POLICY IF EXISTS "Users can insert own flow stats" ON flow_stats;
DROP POLICY IF EXISTS "Users can update own flow stats" ON flow_stats;

DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON achievements;

DROP POLICY IF EXISTS "Users can view own onboarding" ON nutritionist_onboarding;
DROP POLICY IF EXISTS "Users can insert own onboarding" ON nutritionist_onboarding;
DROP POLICY IF EXISTS "Users can update own onboarding" ON nutritionist_onboarding;

DROP POLICY IF EXISTS "Users can view own plans" ON quarterly_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON quarterly_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON quarterly_plans;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Meals Policies
CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Logs Policies
CREATE POLICY "Users can view own daily logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Flow Stats Policies
CREATE POLICY "Users can view own flow stats"
  ON flow_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flow stats"
  ON flow_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flow stats"
  ON flow_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Posts Policies (public read, own write)
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Achievements Policies
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Nutritionist Onboarding Policies
CREATE POLICY "Users can view own onboarding"
  ON nutritionist_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON nutritionist_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON nutritionist_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

-- Quarterly Plans Policies
CREATE POLICY "Users can view own plans"
  ON quarterly_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON quarterly_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON quarterly_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- SECTION 6: Functions and Triggers
-- ============================================

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SECTION 7: Storage Configuration
-- ============================================

-- Storage bucket for meal photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Users can upload own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view meal photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own meal photos" ON storage.objects;

-- Storage policies for meal photos
CREATE POLICY "Users can upload own meal photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'meal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view meal photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meal-photos');

CREATE POLICY "Users can update own meal photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'meal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own meal photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'meal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- VERIFICATION QUERIES (Run these to check)
-- ============================================

-- Check if all tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
--   'profiles', 'meals', 'daily_logs', 'flow_stats', 'posts', 'achievements',
--   'nutritionist_onboarding', 'quarterly_plans'
-- );

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies count
-- SELECT schemaname, tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename;
