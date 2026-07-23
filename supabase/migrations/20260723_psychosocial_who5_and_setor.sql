-- =====================================================
-- Malama — Módulo psicossocial (NR-1/PGR), passo 1
-- 1. setor/função no cadastro de colaboradores (recortes do
--    relatório agregado do RH — heatmap por setor)
-- 2. Tabela psychosocial_assessments (WHO-5 mensal)
--
-- Privacidade (LGPD):
--   - O RH NÃO tem policy de leitura nesta tabela. O empregador
--     só verá agregados k-anônimos (mín. 5 respondentes) via RPC
--     SECURITY DEFINER dedicada, criada na migração do relatório.
--   - Dado individual: apenas o próprio usuário e super_admin.
-- =====================================================

-- 1. Setor e função do colaborador (informados pelo RH no convite)
ALTER TABLE empresa_colaboradores ADD COLUMN IF NOT EXISTS setor  TEXT;
ALTER TABLE empresa_colaboradores ADD COLUMN IF NOT EXISTS funcao TEXT;

CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_setor
  ON empresa_colaboradores(empresa_id, setor);

-- 2. Avaliações psicossociais (instrumentos validados; v1 = WHO-5)
CREATE TABLE IF NOT EXISTS psychosocial_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument      TEXT NOT NULL DEFAULT 'who5' CHECK (instrument IN ('who5')),
  -- Mês de referência (sempre dia 1). Uma resposta por usuário/instrumento/mês.
  reference_month DATE NOT NULL,
  -- Respostas brutas por item, ex.: {"q1":4,"q2":3,"q3":5,"q4":2,"q5":4}
  -- WHO-5: cada item 0–5, redação oficial fixa (versão PT-BR validada).
  answers         JSONB NOT NULL,
  -- Escore bruto (soma dos itens, 0–25) e percentual (bruto × 4, 0–100).
  -- Calculados em código de forma determinística — nunca por IA.
  raw_score       INTEGER NOT NULL CHECK (raw_score BETWEEN 0 AND 25),
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, instrument, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_psychosocial_user_month
  ON psychosocial_assessments(user_id, reference_month DESC);

ALTER TABLE psychosocial_assessments ENABLE ROW LEVEL SECURITY;

-- Usuário lê e grava apenas as próprias respostas
DROP POLICY IF EXISTS "user reads own psychosocial" ON psychosocial_assessments;
CREATE POLICY "user reads own psychosocial"
  ON psychosocial_assessments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user inserts own psychosocial" ON psychosocial_assessments;
CREATE POLICY "user inserts own psychosocial"
  ON psychosocial_assessments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Super admin (operação da plataforma)
DROP POLICY IF EXISTS "super_admin all psychosocial" ON psychosocial_assessments;
CREATE POLICY "super_admin all psychosocial"
  ON psychosocial_assessments FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Sem UPDATE/DELETE para o usuário: resposta de instrumento validado é
-- imutável (trilha de auditoria do PGR). Correção = caso operacional raro,
-- via super_admin.
