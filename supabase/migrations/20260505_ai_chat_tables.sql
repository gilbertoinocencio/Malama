-- AI Nutritionist Chat Tables
-- Separate from appointment_chats/chat_messages (doctor-patient consultation system)

-- ----------------------------------------------------------------
-- 1. AI_CHAT_SESSIONS — Sessões de conversa com a nutricionista IA
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type         TEXT        NOT NULL CHECK (session_type IN ('onboarding', 'chat')) DEFAULT 'chat',
  current_stage        TEXT,
  onboarding_completed BOOLEAN     NOT NULL DEFAULT false,
  onboarding_data      JSONB,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ,
  last_activity_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_id_idx  ON public.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_chat_sessions_type_idx     ON public.ai_chat_sessions(user_id, session_type);

-- ----------------------------------------------------------------
-- 2. AI_CHAT_MESSAGES — Histórico de mensagens com a nutricionista IA
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  content         TEXT        NOT NULL,
  stage           TEXT,
  onboarding_data JSONB,
  tokens_used     INT,
  context_data    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_messages_user_id_idx    ON public.ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS ai_chat_messages_created_at_idx ON public.ai_chat_messages(user_id, created_at DESC);

-- ----------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.ai_chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages  ENABLE ROW LEVEL SECURITY;

-- Sessions: users can only see/edit their own
CREATE POLICY "ai_chat_sessions_user_access" ON public.ai_chat_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Messages: users can only see/insert their own
CREATE POLICY "ai_chat_messages_user_access" ON public.ai_chat_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
