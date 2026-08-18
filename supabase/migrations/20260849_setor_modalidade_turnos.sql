-- =====================================================
-- Malama — organização do trabalho por setor
-- Migration: 20260849_setor_modalidade_turnos.sql
--
-- Modalidade e turno descrevem o trabalho de cada setor, não a empresa
-- inteira. A mudança é aditiva: os setores existentes continuam válidos e
-- recebem listas vazias até que o RH complete as informações.
-- =====================================================

ALTER TABLE public.empresa_setores
  ADD COLUMN IF NOT EXISTS modelos_trabalho TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS turnos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.empresa_setores
  DROP CONSTRAINT IF EXISTS empresa_setores_modelos_trabalho_validos,
  DROP CONSTRAINT IF EXISTS empresa_setores_turnos_validos;

ALTER TABLE public.empresa_setores
  ADD CONSTRAINT empresa_setores_modelos_trabalho_validos CHECK (
    cardinality(modelos_trabalho) <= 3
    AND modelos_trabalho <@ ARRAY['presencial', 'home_office', 'hibrido']::TEXT[]
  ),
  ADD CONSTRAINT empresa_setores_turnos_validos CHECK (
    cardinality(turnos) <= 6
    AND turnos <@ ARRAY['comercial', 'manha', 'tarde', 'noite', 'madrugada', 'flexivel']::TEXT[]
  );

COMMENT ON COLUMN public.empresa_setores.modelos_trabalho IS
  'Modalidades declaradas para o setor: presencial, home_office e/ou hibrido.';
COMMENT ON COLUMN public.empresa_setores.turnos IS
  'Turnos declarados para o setor: comercial, manha, tarde, noite, madrugada e/ou flexivel.';


-- A lista administrativa preserva todos os campos anteriores e acrescenta
-- a organização do trabalho. Nenhum relatório passa a usar esses campos
-- automaticamente: eles são contexto declaratório para o RH e o copiloto.
DROP FUNCTION IF EXISTS public.rh_setores_admin();

CREATE OR REPLACE FUNCTION public.rh_setores_admin()
RETURNS TABLE (
  id                UUID,
  nome              TEXT,
  ativo             BOOLEAN,
  n                 INT,
  em_uso            BOOLEAN,
  efetivo           INT,
  modelos_trabalho  TEXT[],
  turnos            TEXT[]
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM public.rh_usuarios
    WHERE user_id = auth.uid() AND ativo
  )
  SELECT
    s.id,
    s.nome,
    s.ativo,
    (SELECT COUNT(*)::int FROM public.empresa_colaboradores ec
      WHERE ec.empresa_id = s.empresa_id
        AND ec.status IN ('ativo', 'convidado')
        AND lower(TRIM(ec.setor)) = lower(TRIM(s.nome))),
    (EXISTS (SELECT 1 FROM public.empresa_afastamentos a
              WHERE a.empresa_id = s.empresa_id
                AND lower(TRIM(a.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM public.empresa_ambulatorio am
                 WHERE am.empresa_id = s.empresa_id
                   AND lower(TRIM(am.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM public.empresa_planos_acao p
                 WHERE p.empresa_id = s.empresa_id
                   AND lower(TRIM(p.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM public.psychosocial_campaigns c
                 WHERE c.empresa_id = s.empresa_id
                   AND EXISTS (SELECT 1 FROM unnest(c.setores) x
                                WHERE lower(TRIM(x)) = lower(TRIM(s.nome))))
    ),
    s.efetivo,
    s.modelos_trabalho,
    s.turnos
  FROM public.empresa_setores s
  WHERE s.empresa_id IN (SELECT empresa_id FROM emp)
  ORDER BY s.ativo DESC, s.nome;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.rh_setores_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_setores_admin() TO authenticated;


-- Cria (ou reativa) um setor já com a configuração escolhida. A RPC antiga
-- rh_setor_criar(TEXT) permanece disponível para consumidores anteriores.
CREATE OR REPLACE FUNCTION public.rh_setor_criar_configurado(
  p_nome TEXT,
  p_modelos_trabalho TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_turnos TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  v_empresa  UUID;
  v_nome     TEXT := TRIM(COALESCE(p_nome, ''));
  v_existe   public.empresa_setores%ROWTYPE;
  v_id       UUID;
  v_modelos  TEXT[];
  v_turnos   TEXT[];
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM public.rh_usuarios
   WHERE user_id = auth.uid() AND ativo
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

  IF FOUND THEN
    IF v_existe.ativo THEN
      RETURN jsonb_build_object('ok', false, 'error', format('O setor "%s" já existe', v_existe.nome));
    END IF;
    UPDATE public.empresa_setores
       SET ativo = TRUE, nome = v_nome,
           modelos_trabalho = v_modelos, turnos = v_turnos
     WHERE id = v_existe.id;
    RETURN jsonb_build_object('ok', true, 'id', v_existe.id, 'reativado', true);
  END IF;

  INSERT INTO public.empresa_setores (
    empresa_id, nome, criado_por, modelos_trabalho, turnos
  ) VALUES (
    v_empresa, v_nome, auth.uid(), v_modelos, v_turnos
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'reativado', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rh_setor_criar_configurado(TEXT, TEXT[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_setor_criar_configurado(TEXT, TEXT[], TEXT[]) TO authenticated;


-- Permite completar setores antigos e corrigir a configuração depois da
-- criação, sempre limitando a alteração à empresa vinculada ao JWT.
CREATE OR REPLACE FUNCTION public.rh_setor_atualizar_operacao(
  p_id UUID,
  p_modelos_trabalho TEXT[],
  p_turnos TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_modelos TEXT[];
  v_turnos  TEXT[];
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM public.rh_usuarios
   WHERE user_id = auth.uid() AND ativo
   LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
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

  UPDATE public.empresa_setores
     SET modelos_trabalho = v_modelos, turnos = v_turnos
   WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rh_setor_atualizar_operacao(UUID, TEXT[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_setor_atualizar_operacao(UUID, TEXT[], TEXT[]) TO authenticated;
