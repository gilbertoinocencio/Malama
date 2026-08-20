-- Cria o setor já com seu efetivo. O cadastro atômico evita o estado
-- intermediário "setor criado, quantidade esquecida" e respeita o limite
-- contratado antes de gravar qualquer coisa.

DROP FUNCTION IF EXISTS public.rh_setor_criar_configurado(TEXT, TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION public.rh_setor_criar_configurado(
  p_nome TEXT,
  p_modelos_trabalho TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_turnos TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_efetivo INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_empresa       UUID;
  v_limite        INT;
  v_nome          TEXT := TRIM(COALESCE(p_nome, ''));
  v_existe        public.empresa_setores%ROWTYPE;
  v_id            UUID;
  v_modelos       TEXT[];
  v_turnos        TEXT[];
  v_total_outros  INT;
  v_cadastrados   INT := 0;
BEGIN
  SELECT ru.empresa_id, e.max_assentos
    INTO v_empresa, v_limite
  FROM public.rh_usuarios ru
  JOIN public.empresas e ON e.id = ru.empresa_id
  WHERE ru.user_id = auth.uid() AND ru.ativo
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;
  IF v_nome = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o nome do setor');
  END IF;
  IF length(v_nome) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nome do setor muito longo (máx. 60 caracteres)');
  END IF;
  IF lower(v_nome) = 'sem setor' THEN
    RETURN jsonb_build_object('ok', false, 'error', '"Sem setor" é reservado para quem ainda não foi classificado');
  END IF;
  IF p_efetivo IS NULL OR p_efetivo <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe uma quantidade de pessoas maior que zero');
  END IF;
  IF p_efetivo > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Quantidade de pessoas fora do razoável');
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_modelos_trabalho, ARRAY[]::TEXT[])) item
    WHERE item IS NULL OR lower(trim(item)) NOT IN ('presencial', 'home_office', 'hibrido')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Modelo de trabalho inválido');
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_turnos, ARRAY[]::TEXT[])) item
    WHERE item IS NULL OR lower(trim(item)) NOT IN ('comercial', 'manha', 'tarde', 'noite', 'madrugada', 'flexivel')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Turno inválido');
  END IF;

  SELECT COALESCE(array_agg(item ORDER BY item), ARRAY[]::TEXT[]) INTO v_modelos
  FROM (SELECT DISTINCT lower(trim(item)) AS item
        FROM unnest(COALESCE(p_modelos_trabalho, ARRAY[]::TEXT[])) item) x;
  SELECT COALESCE(array_agg(item ORDER BY item), ARRAY[]::TEXT[]) INTO v_turnos
  FROM (SELECT DISTINCT lower(trim(item)) AS item
        FROM unnest(COALESCE(p_turnos, ARRAY[]::TEXT[])) item) x;

  SELECT * INTO v_existe
  FROM public.empresa_setores
  WHERE empresa_id = v_empresa AND lower(TRIM(nome)) = lower(v_nome)
  LIMIT 1;

  IF FOUND AND v_existe.ativo THEN
    RETURN jsonb_build_object('ok', false, 'error', format('O setor "%s" já existe', v_existe.nome));
  END IF;

  IF FOUND THEN
    SELECT COUNT(*)::int INTO v_cadastrados
    FROM public.empresa_colaboradores ec
    WHERE ec.empresa_id = v_empresa
      AND ec.status IN ('ativo', 'convidado')
      AND lower(TRIM(ec.setor)) = lower(v_existe.nome);

    IF p_efetivo < v_cadastrados THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('O setor já tem %s colaborador(es) com acesso. A quantidade não pode ser menor que isso.', v_cadastrados)
      );
    END IF;
  END IF;

  SELECT COALESCE(SUM(GREATEST(
    COALESCE(s.efetivo, 0),
    (SELECT COUNT(*)::int FROM public.empresa_colaboradores ec
      WHERE ec.empresa_id = v_empresa
        AND ec.status IN ('ativo', 'convidado')
        AND lower(TRIM(ec.setor)) = lower(TRIM(s.nome)))
  )), 0)::int
  INTO v_total_outros
  FROM public.empresa_setores s
  WHERE s.empresa_id = v_empresa
    AND s.ativo
    AND (v_existe.id IS NULL OR s.id <> v_existe.id);

  IF v_limite IS NOT NULL AND v_total_outros + p_efetivo > v_limite THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format(
        'O limite contratado é de %s pessoa(s). Já há %s distribuída(s); o novo setor pode ter no máximo %s.',
        v_limite, v_total_outros, GREATEST(v_limite - v_total_outros, 0)
      ),
      'limite_contratado', v_limite,
      'efetivo_alocado', v_total_outros
    );
  END IF;

  IF v_existe.id IS NOT NULL THEN
    UPDATE public.empresa_setores
    SET ativo = TRUE, nome = v_nome, efetivo = p_efetivo,
        modelos_trabalho = v_modelos, turnos = v_turnos
    WHERE id = v_existe.id;
    RETURN jsonb_build_object(
      'ok', true, 'id', v_existe.id, 'reativado', true,
      'efetivo', p_efetivo, 'limite_contratado', v_limite,
      'efetivo_alocado', v_total_outros + p_efetivo
    );
  END IF;

  INSERT INTO public.empresa_setores (
    empresa_id, nome, criado_por, efetivo, modelos_trabalho, turnos
  ) VALUES (
    v_empresa, v_nome, auth.uid(), p_efetivo, v_modelos, v_turnos
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id, 'reativado', false,
    'efetivo', p_efetivo, 'limite_contratado', v_limite,
    'efetivo_alocado', v_total_outros + p_efetivo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rh_setor_criar_configurado(TEXT, TEXT[], TEXT[], INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_setor_criar_configurado(TEXT, TEXT[], TEXT[], INT) TO authenticated;
