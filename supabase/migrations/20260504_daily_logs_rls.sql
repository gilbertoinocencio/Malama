-- RLS para INSERT e UPDATE em daily_logs (usuário salva o próprio diário)
DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;
CREATE POLICY "Users can insert own daily logs"
  ON daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;
CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
