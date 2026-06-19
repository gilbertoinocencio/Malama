-- =====================================================
-- Malama — Compliance NR-1 / Selo Malama (evidência documental para PGR)
-- Migration: 20260620_compliance_docs.sql
--
-- Aditivo. Histórico de documentos gerados pelo RH + RPC de métricas
-- AGREGADAS (nunca expõe dado individual de colaborador).
-- Aplicar via SQL Editor.
-- =====================================================

-- =====================================================
-- 1. TABELA: empresa_compliance_docs (snapshot de cada PDF gerado)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_compliance_docs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  emitido_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  periodo_inicio           DATE,
  periodo_fim              DATE,
  colaboradores_elegiveis  INT NOT NULL DEFAULT 0,
  colaboradores_ativos     INT NOT NULL DEFAULT 0,
  consultas_realizadas     INT NOT NULL DEFAULT 0,
  numero_doc               TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_empresa ON empresa_compliance_docs(empresa_id);

ALTER TABLE empresa_compliance_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all compliance docs" ON empresa_compliance_docs;
CREATE POLICY "super_admin all compliance docs"
  ON empresa_compliance_docs FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own compliance docs" ON empresa_compliance_docs;
CREATE POLICY "rh reads own compliance docs"
  ON empresa_compliance_docs FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "rh inserts own compliance docs" ON empresa_compliance_docs;
CREATE POLICY "rh inserts own compliance docs"
  ON empresa_compliance_docs FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- =====================================================
-- 2. RPC: rh_compliance_metricas()
--    Métricas AGREGADAS da empresa do RH logado. Só números.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_compliance_metricas()
RETURNS TABLE (
  empresa_id              UUID,
  nome                    TEXT,
  cnpj                    TEXT,
  data_inicio             DATE,
  colaboradores_elegiveis INT,
  colaboradores_ativos    INT,
  consultas_realizadas    INT
) AS $$
  WITH minha_empresa AS (
    SELECT e.id, e.nome, e.cnpj, e.data_inicio
    FROM empresas e
    WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
    LIMIT 1
  )
  SELECT
    me.id,
    me.nome,
    me.cnpj,
    me.data_inicio,
    (SELECT COUNT(*)::INT FROM empresa_colaboradores ec
       WHERE ec.empresa_id = me.id AND ec.status <> 'removido'),
    (SELECT COUNT(*)::INT FROM empresa_colaboradores ec
       WHERE ec.empresa_id = me.id AND ec.status = 'ativo'),
    (SELECT COUNT(*)::INT FROM consultations c
       WHERE c.status = 'completed'
         AND c.patient_id IN (
           SELECT ec.user_id FROM empresa_colaboradores ec
           WHERE ec.empresa_id = me.id AND ec.user_id IS NOT NULL AND ec.status <> 'removido'
         ))
  FROM minha_empresa me;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_compliance_metricas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_compliance_metricas() TO authenticated;
