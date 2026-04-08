-- Migration: Sistema de Influenciadores
-- Data: 08/04/2026
-- Descrição: Cria tabelas para gerenciar influenciadores, rastrear conversões e pagar comissões

-- ─── 1. Tabela principal de influenciadores ───────────────
CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- conta no app (NULL até o influenciador se cadastrar)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram_handle TEXT,                -- @handle principal
  pix_key TEXT,                         -- chave PIX para pagamento de comissões
  referral_token TEXT UNIQUE NOT NULL,  -- token do link /i/:token (prefixo "inf_")
  setup_token TEXT UNIQUE,              -- token de ativação de conta /influencer/ativar/:token (prefixo "setup_")
  commission_per_referral DECIMAL(10,2) NOT NULL DEFAULT 10.00, -- BRL por novo cadastro
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled')),
  notes TEXT,                           -- anotações internas do admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Tabela de conversões ──────────────────────────────
CREATE TABLE IF NOT EXISTS influencer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- novo usuário captado
  commission_amount DECIMAL(10,2) NOT NULL, -- valor no momento da conversão (snapshot)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Colunas na tabela profiles ───────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by_influencer_id UUID
    REFERENCES influencers(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_influencer BOOLEAN NOT NULL DEFAULT FALSE;

-- Atualizar CHECK do acquisition_channel para incluir 'influencer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_acquisition_channel_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_acquisition_channel_check
  CHECK (acquisition_channel IN ('organic', 'referral', 'website', 'social', 'influencer', 'other'));

-- ─── 4. Índices ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_influencers_referral_token ON influencers(referral_token);
CREATE INDEX IF NOT EXISTS idx_influencers_setup_token ON influencers(setup_token);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);
CREATE INDEX IF NOT EXISTS idx_influencer_referrals_influencer_id ON influencer_referrals(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_referrals_status ON influencer_referrals(status);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_influencer ON profiles(referred_by_influencer_id);

-- ─── 5. RLS ───────────────────────────────────────────────
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_referrals ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admin full access influencers" ON influencers FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'super_admin'
    OR ((auth.jwt() -> 'user_metadata') ->> 'role') = 'super_admin'
  );

CREATE POLICY "Admin full access influencer_referrals" ON influencer_referrals FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'super_admin'
    OR ((auth.jwt() -> 'user_metadata') ->> 'role') = 'super_admin'
  );

-- Leitura pública de influenciador ativo por token (landing page sem auth)
CREATE POLICY "Public read active influencer" ON influencers FOR SELECT
  USING (status = 'active');

-- ─── 6. Configuração padrão de comissão ──────────────────
INSERT INTO platform_settings (key, value)
VALUES ('influencer_default_commission', '10')
ON CONFLICT (key) DO NOTHING;

-- ─── Rollback (para referência) ───────────────────────────
-- DROP TABLE IF EXISTS influencer_referrals;
-- DROP TABLE IF EXISTS influencers;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS referred_by_influencer_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS is_influencer;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_acquisition_channel_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_acquisition_channel_check
--   CHECK (acquisition_channel IN ('organic','referral','website','social','other'));
-- DELETE FROM platform_settings WHERE key = 'influencer_default_commission';
