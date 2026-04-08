-- Fix: Adicionar coluna setup_token à tabela influencers existente
-- Rodar após falha em add_influencer_system.sql

-- 1. Adicionar coluna que faltou
ALTER TABLE influencers
ADD COLUMN IF NOT EXISTS setup_token TEXT UNIQUE;

-- 2. Criar o índice (pode ter falhado junto)
CREATE INDEX IF NOT EXISTS idx_influencers_setup_token ON influencers(setup_token);

-- 3. Garantir que o resto da migration original foi aplicado
-- (seguro repetir — todos os IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_influencers_referral_token ON influencers(referral_token);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);
CREATE INDEX IF NOT EXISTS idx_influencer_referrals_influencer_id ON influencer_referrals(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_referrals_status ON influencer_referrals(status);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_influencer ON profiles(referred_by_influencer_id);
