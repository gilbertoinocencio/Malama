-- Fix: new accounts were bypassing onboarding because onboarding_completed
-- was defaulting to true (either via column default or a DB trigger).
-- Setting the column default to false ensures all new rows start with onboarding pending.

ALTER TABLE public.profiles
  ALTER COLUMN onboarding_completed SET DEFAULT false;
