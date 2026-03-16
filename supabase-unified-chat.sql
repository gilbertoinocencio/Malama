-- =====================================================
-- UNIFIED COACH CHAT SYSTEM
-- =====================================================
-- Sistema unificado de chat que serve tanto para:
-- 1. Onboarding inicial (coleta estruturada de dados)
-- 2. Chat aberto contínuo (suporte, dúvidas, sugestões)
-- =====================================================

-- Drop old tables if they exist (CUIDADO: isso apaga dados!)
-- DROP TABLE IF EXISTS nutritionist_onboarding CASCADE;
-- DROP TABLE IF EXISTS coach_chat_messages CASCADE;

-- Unified Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,

  -- Onboarding specific fields
  stage TEXT, -- 'WELCOME', 'NAME', 'BIRTH_DATE', etc (NULL se não for onboarding)
  onboarding_data JSONB DEFAULT '{}'::jsonb, -- Dados coletados acumulados

  -- Chat metadata
  tokens_used INTEGER DEFAULT 0,
  context_data JSONB DEFAULT '{}'::jsonb, -- Profile snapshot, recent meals, etc

  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Sessions Table (para tracking de onboarding e chat state)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session type: 'onboarding' or 'chat'
  session_type TEXT NOT NULL CHECK (session_type IN ('onboarding', 'chat')),

  -- Onboarding specific
  current_stage TEXT, -- Current onboarding stage
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_data JSONB DEFAULT '{}'::jsonb, -- Final collected data

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, session_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_date ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_stage ON chat_messages(stage) WHERE stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_type ON chat_sessions(user_id, session_type);

-- RLS Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Chat Messages Policies
CREATE POLICY "Users can view own chat messages"
  ON chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Sessions Policies
CREATE POLICY "Users can view own sessions"
  ON chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- MIGRATION HELPER (Optional)
-- =====================================================
-- Se você já tem dados em nutritionist_onboarding, execute:
/*
INSERT INTO chat_sessions (user_id, session_type, onboarding_completed, onboarding_data, completed_at)
SELECT
  user_id,
  'onboarding' as session_type,
  completed,
  data as onboarding_data,
  updated_at as completed_at
FROM nutritionist_onboarding
WHERE completed = true;
*/

-- =====================================================
-- USAGE NOTES:
-- =====================================================
-- ONBOARDING MODE:
-- - session_type = 'onboarding'
-- - current_stage vai mudando (WELCOME → NAME → ... → COMPLETED)
-- - Mensagens têm stage preenchido
-- - onboarding_data acumula informações
-- - Quando termina: onboarding_completed = true, cria session 'chat'
--
-- CHAT MODE:
-- - session_type = 'chat'
-- - stage = NULL (chat livre)
-- - Usa context_data para personalização
-- =====================================================
