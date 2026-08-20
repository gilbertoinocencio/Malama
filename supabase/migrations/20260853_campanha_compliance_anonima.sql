-- Campanhas anônimas no modo somente Compliance não exigem colaboradores
-- cadastrados. O denominador e os links vêm dos setores e de seu efetivo.
-- Para qualquer campanha, porém, o público precisa estar definido por setor
-- e cada setor-alvo precisa ter ao menos uma pessoa informada (por efetivo
-- declarado ou por cadastro já existente).

CREATE OR REPLACE FUNCTION rh_criar_campanha(
  p_instrument    TEXT,
  p_janela_inicio DATE,
  p_janela_fim    DATE,
  p_setores       TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id       UUID;
  v_ativo            BOOLEAN;
  v_cadencia_meses   INT;
  v_inicio_ciclo     DATE;
  v_fim_ciclo        DATE;
  v_id               UUID;
  v_somente_compliance BOOLEAN;
  v_colaboradores    INT;
  v_setores_ativos   INT;
  v_setores_invalidos TEXT[];
  v_setores_sem_numero TEXT[];
BEGIN
  SELECT ru.empresa_id,
         COALESCE(e.modo_compliance, false)
           AND NOT COALESCE(e.modo_mental, false)
           AND NOT COALESCE(e.modo_metabolico, false)
    INTO v_empresa_id, v_somente_compliance
  FROM rh_usuarios ru
  JOIN empresas e ON e.id = ru.empresa_id
  WHERE ru.user_id = auth.uid() AND ru.ativo
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT ativo, cadencia_meses INTO v_ativo, v_cadencia_meses
  FROM psychosocial_instruments WHERE code = p_instrument;

  IF v_ativo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Instrumento desconhecido');
  END IF;
  IF NOT v_ativo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Instrumento ainda não liberado para uso');
  END IF;

  IF p_janela_fim < p_janela_inicio THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Janela inválida');
  END IF;

  SELECT COUNT(*)::int INTO v_colaboradores
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id = v_empresa_id
    AND ec.status IN ('ativo', 'convidado');

  SELECT COUNT(*)::int INTO v_setores_ativos
  FROM empresa_setores es
  WHERE es.empresa_id = v_empresa_id AND es.ativo;

  IF v_setores_ativos = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Cadastre ao menos um setor antes de abrir a campanha.'
    );
  END IF;

  IF p_setores IS NOT NULL AND cardinality(p_setores) > 0 THEN
    SELECT array_agg(selecionado.nome ORDER BY selecionado.nome) INTO v_setores_invalidos
    FROM unnest(p_setores) AS selecionado(nome)
    WHERE NOT EXISTS (
      SELECT 1 FROM empresa_setores es
      WHERE es.empresa_id = v_empresa_id
        AND es.ativo
        AND lower(trim(es.nome)) = lower(trim(selecionado.nome))
    );

    IF COALESCE(cardinality(v_setores_invalidos), 0) > 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Há setor selecionado que não está cadastrado ou está arquivado: ' || array_to_string(v_setores_invalidos, ', ')
      );
    END IF;
  END IF;

  WITH alvo AS (
    SELECT es.nome, es.efetivo,
           (SELECT COUNT(*)::int
              FROM empresa_colaboradores ec
             WHERE ec.empresa_id = es.empresa_id
               AND ec.status IN ('ativo', 'convidado')
               AND lower(trim(ec.setor)) = lower(trim(es.nome))) AS cadastrados
    FROM empresa_setores es
    WHERE es.empresa_id = v_empresa_id
      AND es.ativo
      AND (
        p_setores IS NULL OR cardinality(p_setores) = 0
        OR EXISTS (SELECT 1 FROM unnest(p_setores) s WHERE lower(trim(s)) = lower(trim(es.nome)))
      )
  )
  SELECT array_agg(nome ORDER BY nome) INTO v_setores_sem_numero
  FROM alvo
  WHERE GREATEST(COALESCE(efetivo, 0), cadastrados) <= 0;

  IF COALESCE(cardinality(v_setores_sem_numero), 0) > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Informe quantas pessoas trabalham nos seguintes setores antes de abrir a campanha: ' || array_to_string(v_setores_sem_numero, ', ')
    );
  END IF;

  -- O recorte coletivo é a primeira condição de qualquer campanha. Depois
  -- dele, módulos de cuidado também exigem o cadastro que entrega os demais
  -- serviços; somente Compliance usa apenas links anônimos por setor.
  IF NOT v_somente_compliance AND v_colaboradores = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Empresas com módulos de cuidado precisam cadastrar os colaboradores antes de abrir a campanha. No modo somente Compliance, os links anônimos por setor dispensam esse cadastro.'
    );
  END IF;

  IF v_cadencia_meses IN (1, 3) THEN
    v_inicio_ciclo := make_date(
      EXTRACT(YEAR FROM p_janela_inicio)::INT,
      ((EXTRACT(MONTH FROM p_janela_inicio)::INT - 1) / v_cadencia_meses) * v_cadencia_meses + 1,
      1
    );
    v_fim_ciclo := (v_inicio_ciclo + v_cadencia_meses * INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    IF p_janela_fim <> v_fim_ciclo THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('Esta campanha deve ficar aberta até %s, o fim do ciclo de referência.', to_char(v_fim_ciclo, 'DD/MM/YYYY'))
      );
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM psychosocial_campaigns
    WHERE empresa_id = v_empresa_id
      AND instrument = p_instrument
      AND status = 'aberta'
      AND janela_inicio <= p_janela_fim
      AND janela_fim >= p_janela_inicio
  ) THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Já existe campanha aberta deste instrumento no período');
  END IF;

  INSERT INTO psychosocial_campaigns
    (empresa_id, instrument, janela_inicio, janela_fim, setores, criada_por)
  VALUES
    (v_empresa_id, p_instrument, p_janela_inicio, p_janela_fim,
     NULLIF(p_setores, '{}'::TEXT[]), auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'campaign_id', v_id,
    'distribuicao', CASE WHEN v_somente_compliance THEN 'links_anonimos_por_setor' ELSE 'app_e_links_por_setor' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_criar_campanha(TEXT, DATE, DATE, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_criar_campanha(TEXT, DATE, DATE, TEXT[]) TO authenticated;
