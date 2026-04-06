-- GLP-1 Module Migration
-- Run this in your Supabase SQL Editor

-- Add GLP-1 fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_medication TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_phase TEXT CHECK (glp1_phase IN ('start', 'adjust', 'maintain'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_symptoms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_main_concern TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_start_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_prescription_expiry DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_weekly_checkins JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glp1_consultations JSONB DEFAULT '[]'::jsonb;
