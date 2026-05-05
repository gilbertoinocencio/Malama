-- Force all users to redo onboarding so that the new lifestyle fields
-- (diet_type, additional_goals, eating_location, habit_changes, drinks_enough_water)
-- get properly collected and saved.
--
-- Also clears the legacy `goal` column so the V1→V2 auto-migration in AuthContext
-- does not silently flip onboarding_completed back to true before the user sees the flow.

UPDATE public.profiles
SET
  onboarding_completed = false,
  goal                 = NULL;
