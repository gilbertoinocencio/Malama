-- =====================================================
-- Malama — Programa de Evolução da Liderança
-- Jornada privada do RH por setor, sem ranking e sem login para gestores.
-- Reutiliza o plano de ação para compromissos, prazos e evidências.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.empresa_lideranca_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor TEXT NOT NULL CHECK (length(trim(setor)) > 0),
  inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fim DATE NOT NULL,
  responsavel_rh TEXT NOT NULL CHECK (length(trim(responsavel_rh)) > 0),
  pontos_fortes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  pontos_atencao TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  etapa TEXT NOT NULL DEFAULT 'iniciada' CHECK (etapa IN (
    'iniciada', 'plano_definido', 'em_acao', 'pratica_incorporada', 'evolucao_mantida'
  )),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'arquivado')),
  nota_evolucao TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim >= inicio)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lideranca_ciclo_ativo_setor
  ON public.empresa_lideranca_ciclos(empresa_id, lower(setor))
  WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_lideranca_ciclos_empresa
  ON public.empresa_lideranca_ciclos(empresa_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS update_lideranca_ciclos_updated_at ON public.empresa_lideranca_ciclos;
CREATE TRIGGER update_lideranca_ciclos_updated_at
  BEFORE UPDATE ON public.empresa_lideranca_ciclos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.empresa_lideranca_ciclos ENABLE ROW LEVEL SECURITY;
-- Sem acesso direto: toda leitura e escrita passa pelas RPCs abaixo.

ALTER TABLE public.empresa_planos_acao
  ADD COLUMN IF NOT EXISTS lideranca_ciclo_id UUID
  REFERENCES public.empresa_lideranca_ciclos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_planos_lideranca_ciclo
  ON public.empresa_planos_acao(lideranca_ciclo_id);

CREATE OR REPLACE FUNCTION public.rh_lideranca_listar_ciclos()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID; v_result JSONB;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes))
  LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para o Programa de Evolução da Liderança'; END IF;

  SELECT COALESCE(jsonb_agg(item ORDER BY
    CASE item->>'status' WHEN 'ativo' THEN 0 WHEN 'concluido' THEN 1 ELSE 2 END,
    item->>'updated_at' DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'setor', c.setor, 'inicio', c.inicio, 'fim', c.fim,
      'responsavel_rh', c.responsavel_rh, 'pontos_fortes', c.pontos_fortes,
      'pontos_atencao', c.pontos_atencao, 'etapa', c.etapa, 'status', c.status,
      'nota_evolucao', c.nota_evolucao, 'created_at', c.created_at,
      'updated_at', c.updated_at,
      'acoes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', p.id, 'fator', p.fator, 'medida', p.medida,
          'nivel_controle', p.nivel_controle, 'responsavel', p.responsavel,
          'prazo', p.prazo, 'status', p.status, 'evidencia', p.evidencia,
          'concluida_em', p.concluida_em,
          'atrasada', p.status IN ('planejada','em_andamento') AND p.prazo < CURRENT_DATE
        ) ORDER BY p.prazo)
        FROM public.empresa_planos_acao p WHERE p.lideranca_ciclo_id = c.id
      ), '[]'::jsonb)
    ) AS item
    FROM public.empresa_lideranca_ciclos c
    WHERE c.empresa_id = v_empresa
  ) x;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_listar_ciclos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_listar_ciclos() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lideranca_criar_ciclo(
  p_setor TEXT,
  p_fim DATE,
  p_responsavel_rh TEXT,
  p_pontos_fortes TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_pontos_atencao TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID; v_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para criar a jornada'; END IF;
  IF COALESCE(trim(p_setor),'') = '' THEN RETURN jsonb_build_object('ok',false,'error','Escolha o setor'); END IF;
  IF COALESCE(trim(p_responsavel_rh),'') = '' THEN RETURN jsonb_build_object('ok',false,'error','Informe o responsável do RH'); END IF;
  IF p_fim IS NULL OR p_fim < CURRENT_DATE THEN RETURN jsonb_build_object('ok',false,'error','Informe uma data final válida'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.empresa_setores s
    WHERE s.empresa_id = v_empresa AND s.ativo AND lower(trim(s.nome)) = lower(trim(p_setor))
  ) THEN RETURN jsonb_build_object('ok',false,'error','Setor não encontrado no cadastro da empresa'); END IF;

  INSERT INTO public.empresa_lideranca_ciclos(
    empresa_id, setor, fim, responsavel_rh, pontos_fortes, pontos_atencao, criado_por
  ) VALUES (
    v_empresa, trim(p_setor), p_fim, trim(p_responsavel_rh),
    ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_fortes,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_atencao,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    auth.uid()
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok',false,'error','Este setor já tem uma jornada ativa');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_criar_ciclo(TEXT, DATE, TEXT, TEXT[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_criar_ciclo(TEXT, DATE, TEXT, TEXT[], TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lideranca_atualizar_pontos(
  p_id UUID,
  p_pontos_fortes TEXT[],
  p_pontos_atencao TEXT[],
  p_responsavel_rh TEXT,
  p_fim DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para editar a jornada'; END IF;
  IF COALESCE(trim(p_responsavel_rh),'') = '' OR p_fim IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','Preencha responsável e prazo do ciclo');
  END IF;
  UPDATE public.empresa_lideranca_ciclos SET
    pontos_fortes = ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_fortes,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    pontos_atencao = ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_atencao,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    responsavel_rh = trim(p_responsavel_rh), fim = p_fim
  WHERE id = p_id AND empresa_id = v_empresa;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Jornada não encontrada'); END IF;
  RETURN jsonb_build_object('ok',true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_atualizar_pontos(UUID, TEXT[], TEXT[], TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_atualizar_pontos(UUID, TEXT[], TEXT[], TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lideranca_adicionar_acao(
  p_ciclo_id UUID,
  p_fator TEXT,
  p_objetivo TEXT,
  p_medida TEXT,
  p_nivel_controle TEXT,
  p_responsavel TEXT,
  p_prazo DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID; v_setor TEXT; v_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para criar compromissos'; END IF;
  SELECT setor INTO v_setor FROM public.empresa_lideranca_ciclos
  WHERE id = p_ciclo_id AND empresa_id = v_empresa AND status = 'ativo';
  IF v_setor IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Jornada ativa não encontrada'); END IF;
  IF COALESCE(trim(p_objetivo),'') = '' OR COALESCE(trim(p_medida),'') = '' OR COALESCE(trim(p_responsavel),'') = '' THEN
    RETURN jsonb_build_object('ok',false,'error','Preencha objetivo, ação e responsável');
  END IF;
  INSERT INTO public.empresa_planos_acao(
    empresa_id, setor, origem, fator, risco_descricao, medida, nivel_controle,
    responsavel, prazo, criado_por, lideranca_ciclo_id
  ) VALUES (
    v_empresa, v_setor, 'manual', p_fator, trim(p_objetivo), trim(p_medida),
    p_nivel_controle, trim(p_responsavel), p_prazo, auth.uid(), p_ciclo_id
  ) RETURNING id INTO v_id;
  UPDATE public.empresa_lideranca_ciclos
  SET etapa = CASE WHEN etapa = 'iniciada' THEN 'plano_definido' ELSE etapa END
  WHERE id = p_ciclo_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
EXCEPTION WHEN check_violation THEN
  RETURN jsonb_build_object('ok',false,'error','Fator ou tipo de ação inválido');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_adicionar_acao(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_adicionar_acao(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lideranca_avancar(
  p_id UUID,
  p_etapa TEXT,
  p_nota TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID; v_acoes INT; v_em_acao INT; v_concluidas INT;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para atualizar a jornada'; END IF;
  IF p_etapa NOT IN ('iniciada','plano_definido','em_acao','pratica_incorporada','evolucao_mantida') THEN
    RETURN jsonb_build_object('ok',false,'error','Marco inválido');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.empresa_lideranca_ciclos WHERE id=p_id AND empresa_id=v_empresa AND status='ativo') THEN
    RETURN jsonb_build_object('ok',false,'error','Jornada ativa não encontrada');
  END IF;
  SELECT count(*), count(*) FILTER (WHERE status IN ('em_andamento','concluida')),
         count(*) FILTER (WHERE status='concluida')
  INTO v_acoes, v_em_acao, v_concluidas
  FROM public.empresa_planos_acao WHERE lideranca_ciclo_id=p_id;
  IF p_etapa='plano_definido' AND v_acoes=0 THEN RETURN jsonb_build_object('ok',false,'error','Registre ao menos um combinado primeiro'); END IF;
  IF p_etapa='em_acao' AND v_em_acao=0 THEN RETURN jsonb_build_object('ok',false,'error','Inicie ao menos uma ação primeiro'); END IF;
  IF p_etapa IN ('pratica_incorporada','evolucao_mantida') AND v_concluidas=0 THEN
    RETURN jsonb_build_object('ok',false,'error','Conclua uma ação com evidência primeiro');
  END IF;
  IF p_etapa IN ('pratica_incorporada','evolucao_mantida') AND COALESCE(trim(p_nota),'')='' THEN
    RETURN jsonb_build_object('ok',false,'error','Registre o aprendizado ou evidência deste marco');
  END IF;
  UPDATE public.empresa_lideranca_ciclos SET
    etapa=p_etapa,
    nota_evolucao=COALESCE(NULLIF(trim(p_nota),''),nota_evolucao),
    status=CASE WHEN p_etapa='evolucao_mantida' THEN 'concluido' ELSE status END
  WHERE id=p_id AND empresa_id=v_empresa;
  RETURN jsonb_build_object('ok',true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_avancar(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_avancar(UUID, TEXT, TEXT) TO authenticated;

