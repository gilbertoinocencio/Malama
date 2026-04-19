CREATE TABLE IF NOT EXISTS public.strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scopes TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own strava connection"
  ON public.strava_connections
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE flow_stats
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strava_activity_ids TEXT[] DEFAULT '{}';
