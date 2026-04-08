-- Fix: Políticas RLS adicionais para o sistema de influenciadores
-- Problema: usuários autenticados precisam de permissão para:
--   1. INSERT em influencer_referrals (registrar própria conversão)
--   2. UPDATE em influencers (ativar própria conta via setup_token)
--   3. SELECT em influencers sem auth (landing page /i/:token)

-- ─── 1. Usuário autenticado pode registrar sua própria conversão ───
CREATE POLICY "Auth user can register own referral" ON influencer_referrals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── 2. Influenciador pode ler sua própria conversão ──────────────
CREATE POLICY "Influencer can view own referrals" ON influencer_referrals
  FOR SELECT
  USING (
    influencer_id IN (
      SELECT id FROM influencers WHERE user_id = auth.uid()
    )
  );

-- ─── 3. Ativação de conta: usuário pode vincular seu uid ao próprio
--       registro de influenciador via setup_token (conta ainda não ativada)
CREATE POLICY "Influencer can activate own account" ON influencers
  FOR UPDATE
  USING (user_id IS NULL)           -- só linhas ainda não ativadas
  WITH CHECK (user_id = auth.uid()); -- só pode setar o próprio uid

-- ─── 4. Influenciador logado pode ver seu próprio registro ────────
CREATE POLICY "Influencer can view own record" ON influencers
  FOR SELECT
  USING (user_id = auth.uid());
