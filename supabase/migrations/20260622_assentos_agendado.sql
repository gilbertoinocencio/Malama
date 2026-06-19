-- =====================================================
-- Malama — Redução de assentos agendada (vigência no próximo mês)
-- Migration: 20260622_assentos_agendado.sql
--
-- O RH pode REDUZIR a quantidade de assentos contratados. A redução
-- só passa a valer no primeiro dia do mês seguinte (o mês atual é cobrado
-- pelo valor vigente). Aumentos continuam sendo feitos pelo super admin.
-- Aplicar via SQL Editor.
-- =====================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS max_assentos_agendado INTEGER,
  ADD COLUMN IF NOT EXISTS max_assentos_vigencia DATE;

-- =====================================================
-- RPC: rh_agendar_assentos(p_novo)
--   RH agenda redução dos assentos da própria empresa para o próximo mês.
--   Regras: só redução (< atual), não abaixo dos assentos em uso, >= 1.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_agendar_assentos(p_novo INTEGER)
RETURNS DATE AS $$
DECLARE
  v_empresa_id   UUID;
  v_atual        INTEGER;
  v_em_uso       INTEGER;
  v_vigencia     DATE := (date_trunc('month', current_date) + interval '1 month')::date;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não é RH de nenhuma empresa';
  END IF;

  SELECT max_assentos INTO v_atual FROM empresas WHERE id = v_empresa_id;

  IF p_novo IS NULL OR p_novo < 1 THEN
    RAISE EXCEPTION 'A quantidade de assentos deve ser de pelo menos 1';
  END IF;
  IF v_atual IS NOT NULL AND p_novo >= v_atual THEN
    RAISE EXCEPTION 'Para aumentar os assentos, fale com a Malama. Aqui só é possível reduzir.';
  END IF;

  SELECT COUNT(*) INTO v_em_uso
  FROM empresa_colaboradores
  WHERE empresa_id = v_empresa_id AND status IN ('ativo', 'convidado');

  IF p_novo < v_em_uso THEN
    RAISE EXCEPTION 'Há % colaboradores ocupando assento. Remova colaboradores antes de reduzir para %.', v_em_uso, p_novo;
  END IF;

  UPDATE empresas
  SET max_assentos_agendado = p_novo,
      max_assentos_vigencia = v_vigencia,
      updated_at = now()
  WHERE id = v_empresa_id;

  RETURN v_vigencia;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_agendar_assentos(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_agendar_assentos(INTEGER) TO authenticated;

-- =====================================================
-- Atualiza rh_get_resumo_financeiro para devolver o agendamento
-- =====================================================

CREATE OR REPLACE FUNCTION rh_get_resumo_financeiro()
RETURNS TABLE (
  empresa_id            UUID,
  nome                  TEXT,
  cnpj                  TEXT,
  cobranca_email        TEXT,
  cobranca_responsavel  TEXT,
  valor_por_assento     NUMERIC,
  max_assentos          INTEGER,
  assentos_ocupados     BIGINT,
  acesso_bloqueado      BOOLEAN,
  max_assentos_agendado INTEGER,
  max_assentos_vigencia DATE
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
    e.acesso_bloqueado,
    e.max_assentos_agendado,
    e.max_assentos_vigencia
  FROM empresas e
  WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_get_resumo_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_get_resumo_financeiro() TO authenticated;
