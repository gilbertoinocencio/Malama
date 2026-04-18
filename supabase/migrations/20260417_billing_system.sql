-- =====================================================
-- NURA — Sistema de Cobrança, Créditos e Split Quinzenal
-- Migration: 20260417_billing_system.sql
-- =====================================================

-- =====================================================
-- 1. ESTENDER TABELA payouts EXISTENTE (sem drop)
-- =====================================================

ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS asaas_transfer_id  TEXT,
  ADD COLUMN IF NOT EXISTS paid_at_asaas       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_error    TEXT;

-- Substituir CHECK constraint de status para incluir 'processing' e 'failed'
-- (payouts.status é TEXT com CHECK constraint, não tipo nomeado)
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('pending', 'paid', 'cancelled', 'processing', 'failed'));

-- =====================================================
-- 2. NOVOS TIPOS ENUM
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('essencial', 'glp1');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_status') THEN
    CREATE TYPE credit_status AS ENUM (
      'disponivel',
      'agendada',
      'realizada',
      'expirada',
      'perdida_cancelamento',
      'cancelada_reagendada'
    );
  END IF;
END $$;

-- =====================================================
-- 3. TABELA: subscriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_subscription_id TEXT,
  plan_type             subscription_plan   NOT NULL,
  status                subscription_status NOT NULL DEFAULT 'active',
  price                 DECIMAL(10,2)       NOT NULL,
  billing_date          INT                 CHECK (billing_date BETWEEN 1 AND 31),
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id       ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_sub_id  ON subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status        ON subscriptions(status);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. TABELA: consultation_credits
-- =====================================================

CREATE TABLE IF NOT EXISTS consultation_credits (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id           UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  doctor_id                 UUID REFERENCES doctors(id) ON DELETE SET NULL,
  status                    credit_status NOT NULL DEFAULT 'disponivel',
  month_reference           DATE          NOT NULL,
  late_cancellations_count  INT           NOT NULL DEFAULT 0,
  appointment_id            UUID REFERENCES consultations(id) ON DELETE SET NULL,
  expires_at                TIMESTAMPTZ   NOT NULL,
  realized_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_user_id         ON consultation_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_subscription_id ON consultation_credits(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credits_doctor_id       ON consultation_credits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_credits_status          ON consultation_credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_month_reference ON consultation_credits(month_reference);
-- Índice parcial para busca eficiente de créditos que podem expirar
CREATE INDEX IF NOT EXISTS idx_credits_expires_active  ON consultation_credits(expires_at)
  WHERE status IN ('disponivel', 'agendada');

CREATE TRIGGER update_consultation_credits_updated_at
  BEFORE UPDATE ON consultation_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. TABELA: payout_items
-- =====================================================

CREATE TABLE IF NOT EXISTS payout_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id               UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  consultation_credit_id  UUID NOT NULL REFERENCES consultation_credits(id),
  amount                  DECIMAL(10,2) NOT NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id      ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_credit_id      ON payout_items(consultation_credit_id);

-- =====================================================
-- 6. TABELA: credit_admin_logs
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id   UUID NOT NULL REFERENCES consultation_credits(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_admin_logs_credit_id ON credit_admin_logs(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_admin_logs_admin_id  ON credit_admin_logs(admin_id);

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_admin_logs    ENABLE ROW LEVEL SECURITY;

-- Helper function reutilizável para verificar super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
  )
$$;

-- --- subscriptions ---
CREATE POLICY "Users view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Admin manage subscriptions" ON subscriptions
  FOR ALL USING (is_super_admin());

-- --- consultation_credits ---
CREATE POLICY "Users view own credits" ON consultation_credits
  FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Admin manage credits" ON consultation_credits
  FOR ALL USING (is_super_admin());

-- Médicos podem ver créditos das consultas deles (para saber quais foram realizadas)
CREATE POLICY "Doctors view own consultation credits" ON consultation_credits
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- --- payout_items ---
CREATE POLICY "Admin manage payout_items" ON payout_items
  FOR ALL USING (is_super_admin());

-- Médicos podem ver os itens dos próprios repasses
CREATE POLICY "Doctors view own payout_items" ON payout_items
  FOR SELECT USING (
    payout_id IN (
      SELECT id FROM payouts
      WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    )
  );

-- --- credit_admin_logs ---
CREATE POLICY "Admin manage credit_admin_logs" ON credit_admin_logs
  FOR ALL USING (is_super_admin());

-- =====================================================
-- 8. FUNÇÃO RPC: créditos realizados ainda não pagos
-- (necessário pois Supabase JS client não suporta subquery em .not())
-- =====================================================

CREATE OR REPLACE FUNCTION get_unpaid_realized_credits(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
)
RETURNS SETOF consultation_credits
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cc.*
  FROM consultation_credits cc
  WHERE cc.status = 'realizada'
    AND cc.realized_at BETWEEN p_start AND p_end
    AND cc.id NOT IN (
      SELECT pi.consultation_credit_id FROM payout_items pi
    )
$$;

-- =====================================================
-- 9. ÍNDICES ADICIONAIS NA TABELA payouts
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payouts_asaas_transfer_id ON payouts(asaas_transfer_id)
  WHERE asaas_transfer_id IS NOT NULL;

-- =====================================================
-- 10. CONFIGURAÇÕES DE PLATAFORMA — novos valores padrão
-- =====================================================

INSERT INTO platform_settings (key, value) VALUES
  ('consultation_value_doctor',   '100'),
  ('consultation_value_platform', '49'),
  ('plan_essencial_price',        '49'),
  ('plan_glp1_price',             '149')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
