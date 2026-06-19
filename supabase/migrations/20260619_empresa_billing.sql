-- =====================================================
-- Malama — Faturamento B2B + Bloqueio de Acesso por Inadimplência
-- Migration: 20260619_empresa_billing.sql
--
-- Aditivo. Cobrança da empresa via Asaas (sob demanda), faturas,
-- trava de acesso manual do super admin e eventos de billing.
-- Aplicar via SQL Editor (histórico de migração dessincronizado).
-- =====================================================

-- =====================================================
-- 1. COLUNAS NOVAS EM empresas
-- =====================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS acesso_bloqueado    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bloqueio_motivo     TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id   TEXT,
  ADD COLUMN IF NOT EXISTS cobranca_email      TEXT,
  ADD COLUMN IF NOT EXISTS cobranca_responsavel TEXT;

-- =====================================================
-- 2. TABELA: empresa_faturas
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_faturas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  competencia        DATE NOT NULL,            -- mês de referência (dia 01)
  valor              NUMERIC(10,2) NOT NULL,
  vencimento         DATE NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pendente'
                       CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  asaas_payment_id   TEXT,
  asaas_invoice_url  TEXT,
  asaas_bankslip_url TEXT,
  asaas_pix_payload  TEXT,
  pago_em            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_faturas_empresa ON empresa_faturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_faturas_status  ON empresa_faturas(status);
CREATE INDEX IF NOT EXISTS idx_empresa_faturas_asaas   ON empresa_faturas(asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_empresa_faturas_updated_at ON empresa_faturas;
CREATE TRIGGER update_empresa_faturas_updated_at
  BEFORE UPDATE ON empresa_faturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE empresa_faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all faturas" ON empresa_faturas;
CREATE POLICY "super_admin all faturas"
  ON empresa_faturas FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own empresa faturas" ON empresa_faturas;
CREATE POLICY "rh reads own empresa faturas"
  ON empresa_faturas FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  );

-- =====================================================
-- 3. TABELA: empresa_billing_eventos (auditoria/alertas do admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_billing_eventos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL
                CHECK (tipo IN ('inadimplente', 'bloqueio', 'reativacao', 'cobranca_gerada')),
  descricao   TEXT,
  lido        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_eventos_empresa ON empresa_billing_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_billing_eventos_lido    ON empresa_billing_eventos(lido)
  WHERE lido = false;

ALTER TABLE empresa_billing_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all billing eventos" ON empresa_billing_eventos;
CREATE POLICY "super_admin all billing eventos"
  ON empresa_billing_eventos FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- 4. RPC: empresa_acesso_bloqueado(p_user_id)
--    true se o usuário só tem acesso via empresa(s) bloqueada(s).
--    Preserva B2C futuro: se tiver assinatura própria 'active', não bloqueia.
-- =====================================================

CREATE OR REPLACE FUNCTION empresa_acesso_bloqueado(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tem_assinatura_ativa BOOLEAN;
  v_tem_vinculo_bloqueado BOOLEAN;
  v_tem_vinculo_ativo BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;

  -- Assinatura B2C própria ativa → nunca bloqueia
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id AND status = 'active'
  ) INTO v_tem_assinatura_ativa;
  IF v_tem_assinatura_ativa THEN RETURN false; END IF;

  -- Tem vínculo (ativo/convidado) com alguma empresa NÃO bloqueada?
  SELECT EXISTS (
    SELECT 1 FROM empresa_colaboradores ec
    JOIN empresas e ON e.id = ec.empresa_id
    WHERE ec.user_id = p_user_id
      AND ec.status IN ('ativo', 'convidado')
      AND e.acesso_bloqueado = false
  ) INTO v_tem_vinculo_ativo;
  IF v_tem_vinculo_ativo THEN RETURN false; END IF;

  -- Tem vínculo com empresa bloqueada?
  SELECT EXISTS (
    SELECT 1 FROM empresa_colaboradores ec
    JOIN empresas e ON e.id = ec.empresa_id
    WHERE ec.user_id = p_user_id
      AND ec.status IN ('ativo', 'convidado')
      AND e.acesso_bloqueado = true
  ) INTO v_tem_vinculo_bloqueado;

  RETURN v_tem_vinculo_bloqueado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION empresa_acesso_bloqueado(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION empresa_acesso_bloqueado(UUID) TO authenticated;

-- =====================================================
-- 5. RPC: rh_update_cobranca(p_email, p_responsavel)
--    RH atualiza só os dados de cobrança da PRÓPRIA empresa.
--    Não permite alterar valor/status/assentos.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_update_cobranca(p_email TEXT, p_responsavel TEXT)
RETURNS VOID AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não é RH de nenhuma empresa';
  END IF;

  UPDATE empresas
  SET cobranca_email = p_email,
      cobranca_responsavel = p_responsavel,
      updated_at = now()
  WHERE id = v_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_update_cobranca(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_update_cobranca(TEXT, TEXT) TO authenticated;

-- =====================================================
-- 6. RPC: rh_get_resumo_financeiro()
--    Devolve dados financeiros SÓ da empresa do RH logado
--    (inclui valor_por_assento, que getMyEmpresa omite por segurança).
-- =====================================================

CREATE OR REPLACE FUNCTION rh_get_resumo_financeiro()
RETURNS TABLE (
  empresa_id          UUID,
  nome                TEXT,
  cnpj                TEXT,
  cobranca_email      TEXT,
  cobranca_responsavel TEXT,
  valor_por_assento   NUMERIC,
  max_assentos        INTEGER,
  assentos_ocupados   BIGINT,
  acesso_bloqueado    BOOLEAN
) AS $$
  SELECT
    e.id,
    e.nome,
    e.cnpj,
    e.cobranca_email,
    e.cobranca_responsavel,
    e.valor_por_assento,
    e.max_assentos,
    (SELECT COUNT(*) FROM empresa_colaboradores ec
       WHERE ec.empresa_id = e.id AND ec.status IN ('ativo', 'convidado')),
    e.acesso_bloqueado
  FROM empresas e
  WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_get_resumo_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_get_resumo_financeiro() TO authenticated;
