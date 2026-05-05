-- Add lifestyle/habit fields collected during onboarding
-- These fields are captured in the StitchOnboarding flow but were never persisted

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS additional_goals   TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eating_location    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS habit_changes      TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS drinks_enough_water TEXT   DEFAULT NULL;
