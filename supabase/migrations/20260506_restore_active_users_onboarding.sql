-- Restore onboarding_completed for users who clearly already completed onboarding.
-- weight + height are required captures in OnboardingFlow.finishOnboarding(), so any
-- profile that has both values was definitively touched by the flow.
-- This undoes the blanket reset from 20260504_force_onboarding_reset.sql for active users
-- while leaving truly new/incomplete profiles untouched (they will still see onboarding).
UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed = false
  AND weight IS NOT NULL
  AND height IS NOT NULL;
