-- =====================================================
-- Malama — Alocação do plano psicológico por colaborador (RH)
-- Migration: 20260723_rh_alocar_psicologo.sql
--
-- RPC SECURITY DEFINER para o RH ligar/desligar o acesso psicológico de
-- um colaborador da SUA empresa. Valida: (a) o colaborador é da empresa
-- do RH logado; (b) o plano psicológico está ativo na empresa; (c) ao
-- ligar, respeita o limite de assentos psi contratados.
--
-- Aplicar via SQL Editor (após 20260723_plano_psicologico_empresa).
-- =====================================================

DROP FUNCTION IF EXISTS rh_alocar_psicologo(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION rh_alocar_psicologo(
  p_colaborador_id UUID,
  p_ativar         BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id   UUID;
  v_plano_ativo  BOOLEAN;
  v_max_psi      INT;
  v_em_uso       INT;
  v_colab_emp    UUID;
BEGIN
  -- Empresa do RH logado
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  -- Colaborador precisa ser da mesma empresa
  SELECT empresa_id INTO v_colab_emp
  FROM empresa_colaboradores
  WHERE id = p_colaborador_id AND status <> 'removido';

  IF v_colab_emp IS NULL OR v_colab_emp <> v_empresa_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Colaborador não pertence à sua empresa');
  END IF;

  -- Plano precisa estar ativo na empresa
  SELECT plano_psicologico, COALESCE(max_assentos_psi, 0)
    INTO v_plano_ativo, v_max_psi
  FROM empresas WHERE id = v_empresa_id;

  IF NOT COALESCE(v_plano_ativo, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Plano psicológico não está ativo para a empresa');
  END IF;

  IF p_ativar THEN
    -- Quantos já têm o plano (excluindo o próprio, para idempotência)
    SELECT COUNT(*) INTO v_em_uso
    FROM empresa_colaboradores
    WHERE empresa_id = v_empresa_id
      AND plano_psicologico = true
      AND status <> 'removido'
      AND id <> p_colaborador_id;

    IF v_em_uso >= v_max_psi THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Limite de assentos psicológicos atingido');
    END IF;
  END IF;

  UPDATE empresa_colaboradores
  SET plano_psicologico = p_ativar
  WHERE id = p_colaborador_id;

  RETURN jsonb_build_object('ok', true, 'plano_psicologico', p_ativar);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_alocar_psicologo(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_alocar_psicologo(UUID, BOOLEAN) TO authenticated;

-- =====================================================
-- RPC: resumo dos assentos psi da empresa do RH (contratados x em uso)
-- =====================================================

DROP FUNCTION IF EXISTS rh_resumo_psicologico();

CREATE OR REPLACE FUNCTION rh_resumo_psicologico()
RETURNS TABLE (
  plano_ativo     BOOLEAN,
  max_assentos    INT,
  assentos_em_uso INT
) AS $$
  WITH emp AS (
    SELECT id, plano_psicologico, COALESCE(max_assentos_psi, 0) AS max_psi
    FROM empresas
    WHERE id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
    LIMIT 1
  )
  SELECT
    COALESCE(e.plano_psicologico, false),
    e.max_psi,
    (SELECT COUNT(*)::int FROM empresa_colaboradores ec
       WHERE ec.empresa_id = e.id AND ec.plano_psicologico = true AND ec.status <> 'removido')
  FROM emp e;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_resumo_psicologico() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_resumo_psicologico() TO authenticated;
