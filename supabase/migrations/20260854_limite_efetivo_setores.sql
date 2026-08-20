-- O efetivo distribuído entre setores não pode superar o total de pessoas
-- contratado pela empresa (empresas.max_assentos). A validação fica na RPC
-- para valer também fora da interface.

CREATE OR REPLACE FUNCTION rh_setor_definir_efetivo(p_id UUID, p_efetivo INT)
RETURNS JSONB AS $$
DECLARE
  v_empresa       UUID;
  v_n             INT;
  v_limite        INT;
  v_total_outros  INT;
  v_total_novo    INT;
  v_setor_ativo   BOOLEAN;
BEGIN
  SELECT ru.empresa_id, e.max_assentos
    INTO v_empresa, v_limite
  FROM rh_usuarios ru
  JOIN empresas e ON e.id = ru.empresa_id
  WHERE ru.user_id = auth.uid() AND ru.ativo
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF p_efetivo IS NOT NULL AND p_efetivo < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O efetivo não pode ser negativo');
  END IF;

  IF p_efetivo IS NOT NULL AND p_efetivo > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valor de efetivo fora do razoável');
  END IF;

  SELECT s.ativo INTO v_setor_ativo
  FROM empresa_setores s
  WHERE s.id = p_id AND s.empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;

  SELECT COUNT(*)::int INTO v_n
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id = v_empresa
    AND ec.status IN ('ativo', 'convidado')
    AND lower(TRIM(ec.setor)) = (
      SELECT lower(TRIM(s.nome)) FROM empresa_setores s
      WHERE s.id = p_id AND s.empresa_id = v_empresa
    );

  IF p_efetivo IS NOT NULL AND p_efetivo < v_n THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('O setor já tem %s colaborador(es) com acesso. O efetivo não pode ser menor que isso.', v_n)
    );
  END IF;

  SELECT COALESCE(SUM(GREATEST(
    COALESCE(s.efetivo, 0),
    (SELECT COUNT(*)::int FROM empresa_colaboradores ec
      WHERE ec.empresa_id = v_empresa
        AND ec.status IN ('ativo', 'convidado')
        AND lower(TRIM(ec.setor)) = lower(TRIM(s.nome)))
  )), 0)::int
  INTO v_total_outros
  FROM empresa_setores s
  WHERE s.empresa_id = v_empresa
    AND s.ativo
    AND s.id <> p_id;

  v_total_novo := v_total_outros + CASE
    WHEN v_setor_ativo THEN GREATEST(COALESCE(p_efetivo, 0), v_n)
    ELSE 0
  END;

  IF v_limite IS NOT NULL AND v_total_novo > v_limite THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format(
        'O limite contratado é de %s pessoa(s). Os demais setores já utilizam %s; este setor pode ter no máximo %s.',
        v_limite, v_total_outros, GREATEST(v_limite - v_total_outros, 0)
      ),
      'limite_contratado', v_limite,
      'efetivo_alocado', v_total_outros
    );
  END IF;

  UPDATE empresa_setores
  SET efetivo = p_efetivo
  WHERE id = p_id AND empresa_id = v_empresa;

  RETURN jsonb_build_object(
    'ok', true,
    'efetivo', p_efetivo,
    'limite_contratado', v_limite,
    'efetivo_alocado', v_total_novo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_setor_definir_efetivo(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setor_definir_efetivo(UUID, INT) TO authenticated;
