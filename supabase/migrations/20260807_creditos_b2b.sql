-- =====================================================
-- Malama — Créditos de consulta no B2B: pagamento da empresa libera as
-- consultas do mês de cada colaborador, por modalidade contratada.
-- Migration: 20260807_creditos_b2b.sql
--
-- Aplicar via SQL Editor.
--
-- O BURACO QUE ISTO FECHA
-- consultation_credits só era alimentado pelo webhook do Asaas na confirmação
-- de uma ASSINATURA (subscriptions) — caminho B2C. No B2B quem paga é a
-- empresa e não existe assinatura por colaborador, então o colaborador de
-- empresa não recebia crédito de lugar nenhum. Como o CTA de agendar consulta
-- depende de haver crédito, a promessa central do modo Mental — uma sessão
-- por mês para todos — não tinha nada que a emitisse.
--
-- MODELO
--   Empresa paga a fatura do mês  →  cada colaborador com assento recebe
--   UM crédito por modalidade contratada:
--     modo_metabolico → crédito especialidade 'medico'
--     modo_mental     → crédito especialidade 'psicologo'
--
-- Redução de assentos já estava resolvida em 20260622: rh_agendar_assentos
-- recusa reduzir abaixo dos assentos em uso e a redução vige no mês seguinte.
-- =====================================================


-- =====================================================
-- 1. CRÉDITO PODE VIR DE EMPRESA, NÃO SÓ DE ASSINATURA
-- =====================================================

ALTER TABLE consultation_credits
  ALTER COLUMN subscription_id DROP NOT NULL;

ALTER TABLE consultation_credits
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credits_empresa
  ON consultation_credits(empresa_id, month_reference)
  WHERE empresa_id IS NOT NULL;

-- Todo crédito tem uma origem rastreável. As linhas existentes têm
-- subscription_id preenchido, então a constraint passa sem backfill.
ALTER TABLE consultation_credits
  DROP CONSTRAINT IF EXISTS credits_origem_check;
ALTER TABLE consultation_credits
  ADD CONSTRAINT credits_origem_check
  CHECK (subscription_id IS NOT NULL OR empresa_id IS NOT NULL);


-- =====================================================
-- 2. PREÇO POR MODALIDADE
--
-- A empresa que contrata as duas paga pelas duas. Sessão de psicologia e
-- acompanhamento metabólico têm custos diferentes — um valor único
-- obrigaria a errar em um dos dois.
--
-- valor_por_assento permanece como valor legado do produto metabólico e é
-- o fallback de quem foi cadastrado antes desta migração.
-- =====================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS valor_assento_mental     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_assento_metabolico NUMERIC(10,2);

COMMENT ON COLUMN empresas.valor_por_assento IS
  'Legado: valor por assento do produto metabólico. Fallback de valor_assento_metabolico.';

/**
 * Valor por assento somando as modalidades ativas.
 * Devolve NULL de propósito quando uma modalidade ativa não tem preço — a
 * cobrança precisa falhar alto, não emitir fatura silenciosamente menor.
 */
CREATE OR REPLACE FUNCTION empresa_valor_assento(p_empresa_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  e            RECORD;
  v_total      NUMERIC := 0;
  v_algum_modo BOOLEAN := false;
BEGIN
  SELECT modo_mental, modo_metabolico, valor_por_assento,
         valor_assento_mental, valor_assento_metabolico
    INTO e
  FROM empresas WHERE id = p_empresa_id;

  IF e IS NULL THEN RETURN NULL; END IF;

  IF COALESCE(e.modo_metabolico, false) THEN
    IF COALESCE(e.valor_assento_metabolico, e.valor_por_assento) IS NULL THEN
      RETURN NULL;
    END IF;
    v_total := v_total + COALESCE(e.valor_assento_metabolico, e.valor_por_assento);
    v_algum_modo := true;
  END IF;

  IF COALESCE(e.modo_mental, false) THEN
    IF e.valor_assento_mental IS NULL THEN
      RETURN NULL;
    END IF;
    v_total := v_total + e.valor_assento_mental;
    v_algum_modo := true;
  END IF;

  IF NOT v_algum_modo THEN RETURN NULL; END IF;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION empresa_valor_assento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION empresa_valor_assento(UUID) TO authenticated, service_role;


-- =====================================================
-- 3. EMISSÃO DOS CRÉDITOS
--
-- Idempotente: reprocessar o mesmo pagamento (retry de webhook, reenvio do
-- Asaas) não duplica crédito. A checagem é por usuário + especialidade +
-- competência, e não por um índice único, porque o histórico B2C pode ter
-- mais de um crédito no mesmo mês por outros caminhos.
-- =====================================================

DROP FUNCTION IF EXISTS emitir_creditos_empresa(UUID, DATE);

CREATE OR REPLACE FUNCTION emitir_creditos_empresa(
  p_empresa_id  UUID,
  p_competencia DATE
)
RETURNS JSONB AS $$
DECLARE
  e            RECORD;
  v_mes        DATE := date_trunc('month', p_competencia)::date;
  v_expira     TIMESTAMPTZ := now() + INTERVAL '30 days';
  v_modos      TEXT[] := ARRAY[]::TEXT[];
  v_modo       TEXT;
  v_criados    INT := 0;
  v_existentes INT := 0;
  colab        RECORD;
BEGIN
  SELECT id, status, acesso_bloqueado, modo_mental, modo_metabolico
    INTO e
  FROM empresas WHERE id = p_empresa_id;

  IF e IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empresa não encontrada');
  END IF;
  IF e.status <> 'ativa' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empresa não está ativa');
  END IF;

  -- Uma especialidade de crédito por modalidade contratada.
  IF COALESCE(e.modo_metabolico, false) THEN v_modos := v_modos || 'medico'; END IF;
  IF COALESCE(e.modo_mental, false)     THEN v_modos := v_modos || 'psicologo'; END IF;

  IF array_length(v_modos, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empresa sem modalidade contratada');
  END IF;

  -- Colaborador convidado que ainda não abriu o app não tem user_id; ele
  -- recebe o crédito na competência seguinte à ativação.
  FOR colab IN
    SELECT ec.user_id
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = p_empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND ec.user_id IS NOT NULL
  LOOP
    FOREACH v_modo IN ARRAY v_modos LOOP
      IF EXISTS (
        SELECT 1 FROM consultation_credits c
        WHERE c.user_id = colab.user_id
          AND c.especialidade = v_modo
          AND c.month_reference = v_mes
      ) THEN
        v_existentes := v_existentes + 1;
        CONTINUE;
      END IF;

      INSERT INTO consultation_credits
        (user_id, subscription_id, empresa_id, status, especialidade,
         month_reference, expires_at)
      VALUES
        (colab.user_id, NULL, p_empresa_id, 'disponivel', v_modo,
         v_mes, v_expira);

      v_criados := v_criados + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'competencia', v_mes,
    'modalidades', v_modos,
    'creditos_criados', v_criados,
    'ja_existiam', v_existentes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Chamada pelo webhook (service_role). Não exposta a usuário logado.
REVOKE ALL ON FUNCTION emitir_creditos_empresa(UUID, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION emitir_creditos_empresa(UUID, DATE) TO service_role;


-- Reemissão manual pelo super admin (pagamento fora do Asaas, correção,
-- colaborador que ativou depois do fechamento da fatura).
DROP FUNCTION IF EXISTS admin_emitir_creditos_empresa(UUID, DATE);

CREATE OR REPLACE FUNCTION admin_emitir_creditos_empresa(
  p_empresa_id  UUID,
  p_competencia DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apenas super admin');
  END IF;
  RETURN emitir_creditos_empresa(p_empresa_id, p_competencia);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION admin_emitir_creditos_empresa(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_emitir_creditos_empresa(UUID, DATE) TO authenticated;
