-- Campanhas com cadência mensal ou trimestral não podem terminar em uma
-- janela curta arbitrária. A empresa pode abrir no meio do ciclo, mas a
-- coleta segue até o último dia do mês/trimestre de referência.

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
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

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

  -- Uma campanha aberta por instrumento de cada vez, sem sobreposição de
  -- janela: duas campanhas simultâneas do mesmo instrumento gerariam
  -- respostas concorrentes e taxa de resposta sem sentido.
  IF EXISTS (
    SELECT 1 FROM psychosocial_campaigns
    WHERE empresa_id = v_empresa_id
      AND instrument = p_instrument
      AND status = 'aberta'
      AND janela_inicio <= p_janela_fim
      AND janela_fim    >= p_janela_inicio
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

  RETURN jsonb_build_object('ok', true, 'campaign_id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_criar_campanha(TEXT, DATE, DATE, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_criar_campanha(TEXT, DATE, DATE, TEXT[]) TO authenticated;

-- Corrige somente campanhas ainda abertas e que pertencem ao ciclo atual.
-- Campanhas encerradas permanecem intactas para preservar o histórico.
WITH janelas AS (
  SELECT
    c.id,
    (
      make_date(
        EXTRACT(YEAR FROM c.janela_inicio)::INT,
        ((EXTRACT(MONTH FROM c.janela_inicio)::INT - 1) / i.cadencia_meses) * i.cadencia_meses + 1,
        1
      ) + i.cadencia_meses * INTERVAL '1 month' - INTERVAL '1 day'
    )::DATE AS fim_ciclo
  FROM psychosocial_campaigns c
  JOIN psychosocial_instruments i ON i.code = c.instrument
  WHERE c.status = 'aberta'
    AND i.cadencia_meses IN (1, 3)
)
UPDATE psychosocial_campaigns c
SET janela_fim = j.fim_ciclo
FROM janelas j
WHERE c.id = j.id
  AND CURRENT_DATE BETWEEN c.janela_inicio AND j.fim_ciclo
  AND c.janela_fim <> j.fim_ciclo;
