-- =====================================================
-- Malama — prazos e verificações dos marcos de liderança
-- O prazo é um lembrete de acompanhamento para o RH, não uma avaliação.
-- =====================================================

ALTER TABLE public.empresa_lideranca_ciclos
  ADD COLUMN IF NOT EXISTS marco_prazo DATE,
  ADD COLUMN IF NOT EXISTS marco_status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (marco_status IN ('pendente', 'verificado')),
  ADD COLUMN IF NOT EXISTS marco_verificado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marco_nota TEXT;

UPDATE public.empresa_lideranca_ciclos
SET
  marco_prazo = CASE
    WHEN status = 'concluido' THEN LEAST(fim, CURRENT_DATE)
    WHEN etapa IN ('iniciada', 'plano_definido') THEN LEAST(fim, CURRENT_DATE + 7)
    ELSE LEAST(fim, CURRENT_DATE + 30)
  END,
  marco_status = CASE WHEN status = 'concluido' THEN 'verificado' ELSE 'pendente' END,
  marco_verificado_em = CASE WHEN status = 'concluido' THEN COALESCE(updated_at, now()) ELSE NULL END
WHERE marco_prazo IS NULL;

ALTER TABLE public.empresa_lideranca_ciclos
  ALTER COLUMN marco_prazo SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lideranca_marcos_pendentes
  ON public.empresa_lideranca_ciclos(empresa_id, marco_prazo)
  WHERE status = 'ativo' AND marco_status = 'pendente';

CREATE TABLE IF NOT EXISTS public.empresa_lideranca_marco_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ciclo_id UUID NOT NULL REFERENCES public.empresa_lideranca_ciclos(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL CHECK (etapa IN (
    'iniciada', 'plano_definido', 'em_acao', 'pratica_incorporada', 'evolucao_mantida'
  )),
  resultado TEXT NOT NULL CHECK (resultado IN (
    'realizado', 'parcial', 'nao_realizado', 'nao_verificado'
  )),
  prazo_anterior DATE NOT NULL,
  prazo_novo DATE,
  nota TEXT NOT NULL CHECK (length(trim(nota)) > 0),
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lideranca_marco_eventos_ciclo
  ON public.empresa_lideranca_marco_eventos(ciclo_id, created_at DESC);

ALTER TABLE public.empresa_lideranca_marco_eventos ENABLE ROW LEVEL SECURITY;
-- Sem acesso direto: leitura e escrita passam pelas RPCs do programa.

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
      'nota_evolucao', c.nota_evolucao, 'marco_prazo', c.marco_prazo,
      'marco_status', c.marco_status, 'marco_verificado_em', c.marco_verificado_em,
      'marco_nota', c.marco_nota, 'created_at', c.created_at, 'updated_at', c.updated_at,
      'acoes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', p.id, 'fator', p.fator, 'medida', p.medida,
          'nivel_controle', p.nivel_controle, 'responsavel', p.responsavel,
          'prazo', p.prazo, 'status', p.status, 'evidencia', p.evidencia,
          'concluida_em', p.concluida_em,
          'atrasada', p.status IN ('planejada','em_andamento') AND p.prazo < CURRENT_DATE
        ) ORDER BY p.prazo)
        FROM public.empresa_planos_acao p WHERE p.lideranca_ciclo_id = c.id
      ), '[]'::jsonb),
      'historico_marcos', COALESCE((
        SELECT jsonb_agg(evento ORDER BY evento->>'created_at' DESC)
        FROM (
          SELECT jsonb_build_object(
            'id', e.id, 'etapa', e.etapa, 'resultado', e.resultado,
            'prazo_anterior', e.prazo_anterior, 'prazo_novo', e.prazo_novo,
            'nota', e.nota, 'created_at', e.created_at
          ) AS evento
          FROM public.empresa_lideranca_marco_eventos e
          WHERE e.ciclo_id = c.id
          ORDER BY e.created_at DESC
          LIMIT 20
        ) eventos
      ), '[]'::jsonb)
    ) AS item
    FROM public.empresa_lideranca_ciclos c
    WHERE c.empresa_id = v_empresa
  ) x;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.rh_lideranca_criar_ciclo(TEXT, DATE, TEXT, TEXT[], TEXT[]);
CREATE OR REPLACE FUNCTION public.rh_lideranca_criar_ciclo(
  p_setor TEXT,
  p_fim DATE,
  p_responsavel_rh TEXT,
  p_pontos_fortes TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_pontos_atencao TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_marco_prazo DATE DEFAULT NULL
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
  IF p_marco_prazo IS NULL OR p_marco_prazo < CURRENT_DATE OR p_marco_prazo > p_fim THEN
    RETURN jsonb_build_object('ok',false,'error','A verificação do primeiro marco deve ficar dentro do ciclo');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.empresa_setores s
    WHERE s.empresa_id = v_empresa AND s.ativo AND lower(trim(s.nome)) = lower(trim(p_setor))
  ) THEN RETURN jsonb_build_object('ok',false,'error','Setor não encontrado no cadastro da empresa'); END IF;

  INSERT INTO public.empresa_lideranca_ciclos(
    empresa_id, setor, fim, responsavel_rh, pontos_fortes, pontos_atencao,
    marco_prazo, criado_por
  ) VALUES (
    v_empresa, trim(p_setor), p_fim, trim(p_responsavel_rh),
    ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_fortes,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_atencao,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    p_marco_prazo, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok',false,'error','Este setor já tem uma jornada ativa');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_criar_ciclo(TEXT, DATE, TEXT, TEXT[], TEXT[], DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_criar_ciclo(TEXT, DATE, TEXT, TEXT[], TEXT[], DATE) TO authenticated;

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
DECLARE v_empresa UUID; v_marco_prazo DATE;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para editar a jornada'; END IF;
  IF COALESCE(trim(p_responsavel_rh),'') = '' OR p_fim IS NULL OR p_fim < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok',false,'error','Preencha responsável e prazo válido do ciclo');
  END IF;
  SELECT marco_prazo INTO v_marco_prazo FROM public.empresa_lideranca_ciclos
  WHERE id = p_id AND empresa_id = v_empresa;
  IF v_marco_prazo IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Jornada não encontrada'); END IF;
  IF p_fim < v_marco_prazo THEN
    RETURN jsonb_build_object('ok',false,'error','O fim do ciclo não pode ser anterior à verificação do marco atual');
  END IF;
  UPDATE public.empresa_lideranca_ciclos SET
    pontos_fortes = ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_fortes,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    pontos_atencao = ARRAY(SELECT trim(x) FROM unnest(COALESCE(p_pontos_atencao,ARRAY[]::TEXT[])) x WHERE trim(x) <> ''),
    responsavel_rh = trim(p_responsavel_rh), fim = p_fim
  WHERE id = p_id AND empresa_id = v_empresa;
  RETURN jsonb_build_object('ok',true);
END;
$$;

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
  RETURN jsonb_build_object('ok',true,'id',v_id);
EXCEPTION WHEN check_violation THEN
  RETURN jsonb_build_object('ok',false,'error','Fator ou tipo de ação inválido');
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_lideranca_verificar_marco(
  p_id UUID,
  p_resultado TEXT,
  p_nota TEXT,
  p_novo_prazo DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID; v_ciclo public.empresa_lideranca_ciclos%ROWTYPE;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para verificar o marco'; END IF;
  SELECT * INTO v_ciclo FROM public.empresa_lideranca_ciclos
  WHERE id = p_id AND empresa_id = v_empresa AND status = 'ativo' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Jornada ativa não encontrada'); END IF;
  IF p_resultado NOT IN ('realizado','parcial','nao_realizado','nao_verificado') THEN
    RETURN jsonb_build_object('ok',false,'error','Escolha o resultado da verificação');
  END IF;
  IF COALESCE(trim(p_nota),'') = '' THEN
    RETURN jsonb_build_object('ok',false,'error','Registre uma nota curta sobre a verificação');
  END IF;
  IF p_resultado <> 'realizado' AND (
    p_novo_prazo IS NULL OR p_novo_prazo < CURRENT_DATE OR p_novo_prazo > v_ciclo.fim
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','Defina uma nova verificação dentro do ciclo');
  END IF;

  INSERT INTO public.empresa_lideranca_marco_eventos(
    empresa_id, ciclo_id, etapa, resultado, prazo_anterior, prazo_novo, nota, registrado_por
  ) VALUES (
    v_empresa, p_id, v_ciclo.etapa, p_resultado, v_ciclo.marco_prazo,
    CASE WHEN p_resultado = 'realizado' THEN NULL ELSE p_novo_prazo END,
    trim(p_nota), auth.uid()
  );

  IF p_resultado = 'realizado' THEN
    UPDATE public.empresa_lideranca_ciclos SET
      marco_status = 'verificado', marco_verificado_em = now(), marco_nota = trim(p_nota),
      nota_evolucao = CASE
        WHEN etapa IN ('pratica_incorporada','evolucao_mantida') THEN trim(p_nota)
        ELSE nota_evolucao
      END,
      status = CASE WHEN etapa = 'evolucao_mantida' THEN 'concluido' ELSE status END
    WHERE id = p_id;
  ELSE
    UPDATE public.empresa_lideranca_ciclos SET
      marco_status = 'pendente', marco_verificado_em = NULL, marco_nota = trim(p_nota),
      marco_prazo = p_novo_prazo
    WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('ok',true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_verificar_marco(UUID, TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_verificar_marco(UUID, TEXT, TEXT, DATE) TO authenticated;

DROP FUNCTION IF EXISTS public.rh_lideranca_avancar(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.rh_lideranca_avancar(
  p_id UUID,
  p_etapa TEXT,
  p_proximo_prazo DATE,
  p_nota TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID; v_acoes INT; v_em_acao INT; v_concluidas INT;
  v_ciclo public.empresa_lideranca_ciclos%ROWTYPE; v_etapa_esperada TEXT;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
    AND (principal OR 'plano_acao' = ANY(permissoes)) LIMIT 1;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para atualizar a jornada'; END IF;
  SELECT * INTO v_ciclo FROM public.empresa_lideranca_ciclos
  WHERE id = p_id AND empresa_id = v_empresa AND status = 'ativo' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Jornada ativa não encontrada'); END IF;
  v_etapa_esperada := CASE v_ciclo.etapa
    WHEN 'iniciada' THEN 'plano_definido'
    WHEN 'plano_definido' THEN 'em_acao'
    WHEN 'em_acao' THEN 'pratica_incorporada'
    WHEN 'pratica_incorporada' THEN 'evolucao_mantida'
    ELSE NULL
  END;
  IF p_etapa IS DISTINCT FROM v_etapa_esperada THEN
    RETURN jsonb_build_object('ok',false,'error','Avance somente para o próximo marco');
  END IF;
  IF v_ciclo.marco_status <> 'verificado' THEN
    RETURN jsonb_build_object('ok',false,'error','Verifique o combinado deste marco antes de avançar');
  END IF;
  IF p_proximo_prazo IS NULL OR p_proximo_prazo < CURRENT_DATE OR p_proximo_prazo > v_ciclo.fim THEN
    RETURN jsonb_build_object('ok',false,'error','Defina a próxima verificação dentro do ciclo');
  END IF;

  SELECT count(*), count(*) FILTER (WHERE status IN ('em_andamento','concluida')),
         count(*) FILTER (WHERE status='concluida')
  INTO v_acoes, v_em_acao, v_concluidas
  FROM public.empresa_planos_acao WHERE lideranca_ciclo_id = p_id AND status <> 'cancelada';
  IF p_etapa='plano_definido' AND v_acoes=0 THEN RETURN jsonb_build_object('ok',false,'error','Registre ao menos um combinado primeiro'); END IF;
  IF p_etapa='em_acao' AND v_em_acao=0 THEN RETURN jsonb_build_object('ok',false,'error','Inicie ao menos uma ação primeiro'); END IF;
  IF p_etapa IN ('pratica_incorporada','evolucao_mantida') AND v_concluidas=0 THEN
    RETURN jsonb_build_object('ok',false,'error','Conclua uma ação com evidência primeiro');
  END IF;

  UPDATE public.empresa_lideranca_ciclos SET
    etapa = p_etapa,
    nota_evolucao = COALESCE(NULLIF(trim(p_nota),''), nota_evolucao),
    marco_prazo = p_proximo_prazo,
    marco_status = 'pendente',
    marco_verificado_em = NULL,
    marco_nota = NULL
  WHERE id = p_id;
  RETURN jsonb_build_object('ok',true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_avancar(UUID, TEXT, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_avancar(UUID, TEXT, DATE, TEXT) TO authenticated;
