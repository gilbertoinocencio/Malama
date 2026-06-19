-- =====================================================
-- Malama — Impacto (ESG): doação 1:1 (kg perdido → kg doado)
-- Migration: 20260621_impacto_esg.sql
--
-- Aditivo. Bancos de alimentos parceiros, repasses confirmados pelo admin
-- e certificados (o que o RH vê). Cálculo de kg SEMPRE agregado.
-- Aplicar via SQL Editor.
-- =====================================================

-- =====================================================
-- 1. TABELA: bancos_alimentos (parceiros — gerido pelo admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS bancos_alimentos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bancos_alimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all bancos_alimentos" ON bancos_alimentos;
CREATE POLICY "super_admin all bancos_alimentos"
  ON bancos_alimentos FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- 2. TABELA: empresa_repasses_esg (1 por empresa/mês — confirmado pelo admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_repasses_esg (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  competencia        DATE NOT NULL,
  banco_alimentos_id UUID REFERENCES bancos_alimentos(id) ON DELETE SET NULL,
  data_repasse       DATE NOT NULL,
  kg_doado           NUMERIC(10,2) NOT NULL,
  confirmado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmado_por     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_repasses_empresa ON empresa_repasses_esg(empresa_id);

ALTER TABLE empresa_repasses_esg ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all repasses" ON empresa_repasses_esg;
CREATE POLICY "super_admin all repasses"
  ON empresa_repasses_esg FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- 3. TABELA: empresa_certificados_esg (o que o RH vê)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_certificados_esg (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  repasse_id          UUID REFERENCES empresa_repasses_esg(id) ON DELETE CASCADE,
  competencia         DATE NOT NULL,
  colaboradores_ativos INT NOT NULL DEFAULT 0,
  kg_perdido          NUMERIC(10,2) NOT NULL,
  kg_doado            NUMERIC(10,2) NOT NULL,
  banco_nome          TEXT,
  banco_cnpj          TEXT,
  data_repasse        DATE NOT NULL,
  numero_sequencial   TEXT NOT NULL,
  hash_verificacao    TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificados_empresa ON empresa_certificados_esg(empresa_id);

ALTER TABLE empresa_certificados_esg ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all certificados" ON empresa_certificados_esg;
CREATE POLICY "super_admin all certificados"
  ON empresa_certificados_esg FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own certificados" ON empresa_certificados_esg;
CREATE POLICY "rh reads own certificados"
  ON empresa_certificados_esg FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- =====================================================
-- 4. RPC: calcular_kg_perdido(p_empresa_id, p_competencia)
--    Por colaborador ATIVO: 1ª vs última pesagem no mês; soma só perdas
--    positivas; ignora quem pesou <2x. Agregado — só números. Admin-only.
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_kg_perdido(p_empresa_id UUID, p_competencia DATE)
RETURNS TABLE (kg_perdido NUMERIC, colaboradores_ativos INT) AS $$
  WITH periodo AS (
    SELECT date_trunc('month', p_competencia)::date AS ini,
           (date_trunc('month', p_competencia) + interval '1 month')::date AS fim_excl
  ),
  colabs AS (
    SELECT user_id FROM empresa_colaboradores
    WHERE empresa_id = p_empresa_id AND status = 'ativo' AND user_id IS NOT NULL
  ),
  pesagens AS (
    SELECT
      wl.user_id,
      first_value(wl.weight_kg) OVER w AS primeiro,
      last_value(wl.weight_kg)  OVER w AS ultimo,
      count(*) OVER (PARTITION BY wl.user_id) AS n
    FROM weight_logs wl
    JOIN colabs c ON c.user_id = wl.user_id
    WHERE wl.logged_at >= (SELECT ini FROM periodo)
      AND wl.logged_at <  (SELECT fim_excl FROM periodo)
    WINDOW w AS (
      PARTITION BY wl.user_id ORDER BY wl.logged_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )
  ),
  perdas AS (
    SELECT DISTINCT user_id, primeiro, ultimo FROM pesagens WHERE n >= 2
  )
  SELECT
    COALESCE(SUM(GREATEST(primeiro - ultimo, 0)), 0)::NUMERIC(10,2) AS kg_perdido,
    (SELECT COUNT(*)::INT FROM colabs) AS colaboradores_ativos
  FROM perdas;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION calcular_kg_perdido(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION calcular_kg_perdido(UUID, DATE) TO authenticated;
-- Guard de papel é feito na função de confirmação; o preview também checa is_super_admin no app.

-- =====================================================
-- 5. RPC: confirmar_repasse_esg(...) — admin confirma e emite o certificado
--    Atômico: registra repasse + snapshot + número sequencial + hash.
-- =====================================================

CREATE OR REPLACE FUNCTION confirmar_repasse_esg(
  p_empresa_id   UUID,
  p_competencia  DATE,
  p_banco_id     UUID,
  p_data_repasse DATE
)
RETURNS empresa_certificados_esg AS $$
DECLARE
  v_kg          NUMERIC;
  v_ativos      INT;
  v_repasse_id  UUID;
  v_banco_nome  TEXT;
  v_banco_cnpj  TEXT;
  v_seq         INT;
  v_numero      TEXT;
  v_hash        TEXT;
  v_comp        DATE := date_trunc('month', p_competencia)::date;
  v_cert        empresa_certificados_esg;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao super admin';
  END IF;

  SELECT c.kg_perdido, c.colaboradores_ativos
    INTO v_kg, v_ativos
  FROM calcular_kg_perdido(p_empresa_id, v_comp) c;

  SELECT nome, cnpj INTO v_banco_nome, v_banco_cnpj
  FROM bancos_alimentos WHERE id = p_banco_id;

  -- Registra repasse (1 por empresa/competência)
  INSERT INTO empresa_repasses_esg (empresa_id, competencia, banco_alimentos_id, data_repasse, kg_doado, confirmado_por)
  VALUES (p_empresa_id, v_comp, p_banco_id, p_data_repasse, COALESCE(v_kg, 0), auth.uid())
  RETURNING id INTO v_repasse_id;

  -- Número sequencial global por competência
  SELECT COUNT(*) + 1 INTO v_seq
  FROM empresa_certificados_esg WHERE competencia = v_comp;
  v_numero := 'MAL-ESG-' || to_char(v_comp, 'YYYYMM') || '-' || lpad(v_seq::text, 5, '0');

  -- Hash de verificação (integridade do snapshot)
  v_hash := md5(
    p_empresa_id::text || '|' || v_comp::text || '|' || COALESCE(v_kg, 0)::text || '|' ||
    COALESCE(v_banco_cnpj, '') || '|' || p_data_repasse::text || '|' || v_numero
  );

  INSERT INTO empresa_certificados_esg (
    empresa_id, repasse_id, competencia, colaboradores_ativos,
    kg_perdido, kg_doado, banco_nome, banco_cnpj, data_repasse,
    numero_sequencial, hash_verificacao
  ) VALUES (
    p_empresa_id, v_repasse_id, v_comp, COALESCE(v_ativos, 0),
    COALESCE(v_kg, 0), COALESCE(v_kg, 0), v_banco_nome, v_banco_cnpj, p_data_repasse,
    v_numero, v_hash
  ) RETURNING * INTO v_cert;

  RETURN v_cert;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION confirmar_repasse_esg(UUID, DATE, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION confirmar_repasse_esg(UUID, DATE, UUID, DATE) TO authenticated;
