-- =====================================================
-- Malama — Modos de contrato da empresa (Mental / Metabólico)
-- Migration: 20260727_empresa_modos.sql
--
-- A Malama passa a ter dois produtos que a empresa contrata de forma
-- independente (ou os dois juntos):
--
--   modo_mental      → NR-1 / riscos psicossociais. Inclui acompanhamento
--                      psicológico mensal para TODOS os colaboradores com
--                      assento (universal, sem triagem) + instrumentos
--                      agregados (WHO-5, exposição ocupacional).
--   modo_metabolico  → o produto atual: nutrição com IA, telemedicina com
--                      médico, composição corporal, métricas de bem-estar.
--
-- Preço: continua UM valor_por_assento por empresa. O modo define o que é
-- entregue naquele assento; o admin precifica de acordo. Isso mantém todo
-- o billing existente (faturas, cron, empresa-cobranca) intocado.
--
-- RETROCOMPATÍVEL: toda empresa existente hoje é do produto metabólico,
-- então modo_metabolico nasce true e modo_mental nasce false. Ninguém é
-- afetado pela migração.
--
-- Aplicar via SQL Editor.
-- =====================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS modo_mental     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modo_metabolico BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN empresas.modo_mental IS
  'Contrato inclui o produto de saúde mental (NR-1): psicólogo mensal universal + instrumentos psicossociais agregados.';
COMMENT ON COLUMN empresas.modo_metabolico IS
  'Contrato inclui o produto de saúde metabólica: nutrição com IA, telemedicina, composição corporal.';

-- =====================================================
-- Elegibilidade ao acompanhamento psicológico — ponto único
--
-- Duas origens, nesta ordem:
--   1. modo_mental da empresa → UNIVERSAL. Todo colaborador com assento
--      tem direito, sem triagem, sem o RH escolher quem. É o que impede
--      que "receber psicólogo" revele resultado de questionário.
--   2. plano_psicologico do colaborador → LEGADO. Modelo antigo de
--      adicional avulso, em que o RH alocava nominalmente. Mantido para
--      não quebrar empresas que já usam, mas não é o caminho novo.
--
-- Empresa pausada/encerrada ou com acesso bloqueado não concede direito.
-- =====================================================

CREATE OR REPLACE FUNCTION colaborador_tem_psicologo(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM empresa_colaboradores ec
    JOIN empresas e ON e.id = ec.empresa_id
    WHERE ec.user_id = p_user_id
      AND ec.status IN ('ativo', 'convidado')
      AND e.status = 'ativa'
      AND e.acesso_bloqueado = false
      AND (e.modo_mental = true OR ec.plano_psicologico = true)
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION colaborador_tem_psicologo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION colaborador_tem_psicologo(UUID) TO authenticated;

-- =====================================================
-- Modos do usuário logado — usado pelo app para separar o que aparece
-- no modo Mental do que aparece no modo Saúde metabólica.
-- Um usuário em mais de uma empresa acumula os modos (OR).
-- =====================================================

CREATE OR REPLACE FUNCTION meus_modos()
RETURNS TABLE (
  modo_mental     BOOLEAN,
  modo_metabolico BOOLEAN
) AS $$
  SELECT
    COALESCE(bool_or(e.modo_mental), false),
    COALESCE(bool_or(e.modo_metabolico), false)
  FROM empresa_colaboradores ec
  JOIN empresas e ON e.id = ec.empresa_id
  WHERE ec.user_id = auth.uid()
    AND ec.status IN ('ativo', 'convidado')
    AND e.status = 'ativa'
    AND e.acesso_bloqueado = false;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION meus_modos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION meus_modos() TO authenticated;
