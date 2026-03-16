-- =====================================================
-- AI COACH CHAT SYSTEM
-- =====================================================
-- Sistema de chat aberto com a nutricionista AI
-- Permite conversas contextuais sobre alimentação, dúvidas, sugestões
-- =====================================================

-- Coach Chat Messages Table
CREATE TABLE IF NOT EXISTS coach_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'coach')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  context_data JSONB DEFAULT '{}'::jsonb, -- Profile snapshot, recent meals, etc
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_chat_user_date ON coach_chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_chat_role ON coach_chat_messages(role);

-- RLS Policies
ALTER TABLE coach_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view own chat messages"
  ON coach_chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own chat messages"
  ON coach_chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own chat messages"
  ON coach_chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- USAGE NOTES:
-- =====================================================
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Cada mensagem armazena role (user/coach), content e context
-- 3. context_data guarda snapshot do perfil para respostas personalizadas
-- 4. tokens_used rastreia uso da API do Gemini (opcional)
-- =====================================================
