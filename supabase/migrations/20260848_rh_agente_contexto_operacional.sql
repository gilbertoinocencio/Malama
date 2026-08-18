-- =====================================================
-- Malama — contexto operacional para o copiloto do Portal do RH
--
-- O perfil descreve o trabalho real da empresa. Ele ajuda o copiloto a
-- formular perguntas relevantes, mas nunca é evidência de risco e nunca
-- substitui AEP, PGR, inventário de riscos ou decisão técnica da empresa.
--
-- A leitura usada pela IA é deliberadamente agregada: não inclui respostas
-- individuais, relatos, prontuários, nomes de colaboradores nem narrativas
-- clínicas. A escrita do perfil exige confirmação explícita no cliente.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.empresa_contexto_operacional (
  empresa_id UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_atuacao TEXT CHECK (setor_atuacao IS NULL OR length(trim(setor_atuacao)) <= 120),
  cnae_principal TEXT CHECK (cnae_principal IS NULL OR length(trim(cnae_principal)) <= 20),
  descricao_negocio TEXT CHECK (descricao_negocio IS NULL OR length(trim(descricao_negocio)) <= 2000),
  produtos_servicos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  processos_principais TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  unidades TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  areas_funcoes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  modelo_trabalho TEXT CHECK (modelo_trabalho IS NULL OR length(trim(modelo_trabalho)) <= 120),
  turnos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sazonalidade TEXT CHECK (sazonalidade IS NULL OR length(trim(sazonalidade)) <= 1000),
  contexto_adicional TEXT CHECK (contexto_adicional IS NULL OR length(trim(contexto_adicional)) <= 2000),
  confirmado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmado_em TIMESTAMPTZ,
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(produtos_servicos) <= 20),
  CHECK (cardinality(processos_principais) <= 20),
  CHECK (cardinality(unidades) <= 30),
  CHECK (cardinality(areas_funcoes) <= 50),
  CHECK (cardinality(turnos) <= 12)
);

DROP TRIGGER IF EXISTS update_empresa_contexto_operacional_updated_at
  ON public.empresa_contexto_operacional;
CREATE TRIGGER update_empresa_contexto_operacional_updated_at
  BEFORE UPDATE ON public.empresa_contexto_operacional
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.empresa_contexto_operacional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all contexto operacional"
  ON public.empresa_contexto_operacional;
CREATE POLICY "super_admin all contexto operacional"
  ON public.empresa_contexto_operacional FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Snapshot de cada confirmação. O perfil atual continua simples de consultar,
-- mas nenhuma edição apaga silenciosamente o que a empresa confirmou antes.
CREATE TABLE IF NOT EXISTS public.empresa_contexto_operacional_historico (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  setor_atuacao TEXT,
  cnae_principal TEXT,
  descricao_negocio TEXT,
  produtos_servicos TEXT[] NOT NULL,
  processos_principais TEXT[] NOT NULL,
  unidades TEXT[] NOT NULL,
  areas_funcoes TEXT[] NOT NULL,
  modelo_trabalho TEXT,
  turnos TEXT[] NOT NULL,
  sazonalidade TEXT,
  contexto_adicional TEXT,
  confirmado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmado_em TIMESTAMPTZ,
  salvo_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, versao)
);

ALTER TABLE public.empresa_contexto_operacional_historico ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.registrar_versao_contexto_operacional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.empresa_contexto_operacional_historico (
    empresa_id, versao, setor_atuacao, cnae_principal, descricao_negocio,
    produtos_servicos, processos_principais, unidades, areas_funcoes,
    modelo_trabalho, turnos,
    sazonalidade, contexto_adicional, confirmado_por, confirmado_em
  ) VALUES (
    NEW.empresa_id, NEW.versao, NEW.setor_atuacao, NEW.cnae_principal,
    NEW.descricao_negocio, NEW.produtos_servicos, NEW.processos_principais,
    NEW.unidades, NEW.areas_funcoes, NEW.modelo_trabalho, NEW.turnos,
    NEW.sazonalidade, NEW.contexto_adicional,
    NEW.confirmado_por, NEW.confirmado_em
  ) ON CONFLICT (empresa_id, versao) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrar_versao_contexto_operacional
  ON public.empresa_contexto_operacional;
CREATE TRIGGER registrar_versao_contexto_operacional
  AFTER INSERT OR UPDATE ON public.empresa_contexto_operacional
  FOR EACH ROW EXECUTE FUNCTION public.registrar_versao_contexto_operacional();

REVOKE ALL ON FUNCTION public.registrar_versao_contexto_operacional() FROM PUBLIC;

-- O Portal do RH acessa o perfil somente pelas RPCs abaixo. Assim a mesma
-- checagem de vínculo/permissão vale para leitura e escrita.

CREATE OR REPLACE FUNCTION public.rh_contexto_operacional()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_contexto public.empresa_contexto_operacional%ROWTYPE;
BEGIN
  SELECT r.empresa_id INTO v_empresa
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid() AND r.ativo
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Acesso do RH não encontrado';
  END IF;

  SELECT * INTO v_contexto
  FROM public.empresa_contexto_operacional c
  WHERE c.empresa_id = v_empresa;

  IF v_contexto.empresa_id IS NULL THEN RETURN NULL; END IF;

  RETURN to_jsonb(v_contexto) - 'confirmado_por';
END;
$$;

REVOKE ALL ON FUNCTION public.rh_contexto_operacional() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_contexto_operacional() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_salvar_contexto_operacional(
  p_setor_atuacao TEXT,
  p_cnae_principal TEXT,
  p_descricao_negocio TEXT,
  p_produtos_servicos TEXT[],
  p_processos_principais TEXT[],
  p_unidades TEXT[],
  p_areas_funcoes TEXT[],
  p_modelo_trabalho TEXT,
  p_turnos TEXT[],
  p_sazonalidade TEXT,
  p_contexto_adicional TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_resultado public.empresa_contexto_operacional%ROWTYPE;
BEGIN
  SELECT r.empresa_id INTO v_empresa
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid()
    AND r.ativo
    AND (r.principal OR 'empresa' = ANY(r.permissoes))
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para editar o perfil da empresa';
  END IF;

  INSERT INTO public.empresa_contexto_operacional AS c (
    empresa_id, setor_atuacao, cnae_principal, descricao_negocio,
    produtos_servicos, processos_principais, unidades, areas_funcoes,
    modelo_trabalho, turnos,
    sazonalidade, contexto_adicional, confirmado_por, confirmado_em
  ) VALUES (
    v_empresa,
    NULLIF(trim(p_setor_atuacao), ''),
    NULLIF(trim(p_cnae_principal), ''),
    NULLIF(trim(p_descricao_negocio), ''),
    COALESCE(p_produtos_servicos, ARRAY[]::TEXT[]),
    COALESCE(p_processos_principais, ARRAY[]::TEXT[]),
    COALESCE(p_unidades, ARRAY[]::TEXT[]),
    COALESCE(p_areas_funcoes, ARRAY[]::TEXT[]),
    NULLIF(trim(p_modelo_trabalho), ''),
    COALESCE(p_turnos, ARRAY[]::TEXT[]),
    NULLIF(trim(p_sazonalidade), ''),
    NULLIF(trim(p_contexto_adicional), ''),
    auth.uid(), now()
  )
  ON CONFLICT (empresa_id) DO UPDATE SET
    setor_atuacao = EXCLUDED.setor_atuacao,
    cnae_principal = EXCLUDED.cnae_principal,
    descricao_negocio = EXCLUDED.descricao_negocio,
    produtos_servicos = EXCLUDED.produtos_servicos,
    processos_principais = EXCLUDED.processos_principais,
    unidades = EXCLUDED.unidades,
    areas_funcoes = EXCLUDED.areas_funcoes,
    modelo_trabalho = EXCLUDED.modelo_trabalho,
    turnos = EXCLUDED.turnos,
    sazonalidade = EXCLUDED.sazonalidade,
    contexto_adicional = EXCLUDED.contexto_adicional,
    confirmado_por = auth.uid(),
    confirmado_em = now(),
    versao = c.versao + 1
  RETURNING * INTO v_resultado;

  RETURN to_jsonb(v_resultado) - 'confirmado_por';
END;
$$;

REVOKE ALL ON FUNCTION public.rh_salvar_contexto_operacional(
  TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_salvar_contexto_operacional(
  TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT, TEXT
) TO authenticated;

-- Contexto mínimo que a Edge Function pode entregar ao Caramel. Não há
-- texto livre de relatos, respostas, pessoas ou eventos de saúde.
CREATE OR REPLACE FUNCTION public.rh_agente_contexto()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rh public.rh_usuarios%ROWTYPE;
  v_empresa public.empresas%ROWTYPE;
  v_contexto JSONB;
  v_pode_colaboradores BOOLEAN;
  v_pode_saude BOOLEAN;
  v_pode_plano BOOLEAN;
  v_pode_empresa BOOLEAN;
BEGIN
  SELECT * INTO v_rh
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid() AND r.ativo
  LIMIT 1;
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Acesso do RH não encontrado'; END IF;

  SELECT * INTO v_empresa FROM public.empresas e WHERE e.id = v_rh.empresa_id;
  v_pode_colaboradores := v_rh.principal OR 'colaboradores' = ANY(v_rh.permissoes);
  v_pode_saude := v_rh.principal OR 'saude_mental' = ANY(v_rh.permissoes)
    OR 'compliance' = ANY(v_rh.permissoes);
  v_pode_plano := v_rh.principal OR 'plano_acao' = ANY(v_rh.permissoes)
    OR 'compliance' = ANY(v_rh.permissoes);
  v_pode_empresa := v_rh.principal OR 'empresa' = ANY(v_rh.permissoes);

  SELECT to_jsonb(c) - 'confirmado_por' INTO v_contexto
  FROM public.empresa_contexto_operacional c
  WHERE c.empresa_id = v_rh.empresa_id;

  RETURN jsonb_build_object(
    'empresa', jsonb_build_object(
      'nome', v_empresa.nome,
      'status', v_empresa.status,
      'modo_mental', COALESCE(v_empresa.modo_mental, false),
      'modo_metabolico', COALESCE(v_empresa.modo_metabolico, false),
      'modo_compliance', COALESCE(v_empresa.modo_compliance, false)
    ),
    'usuario', jsonb_build_object(
      'papel', v_rh.papel,
      'principal', v_rh.principal,
      'permissoes', v_rh.permissoes
    ),
    'perfil_operacional', v_contexto,
    'indicadores', jsonb_build_object(
      'setores', (SELECT count(*) FROM public.empresa_setores s
                  WHERE s.empresa_id = v_rh.empresa_id AND s.ativo),
      'colaboradores', CASE WHEN v_pode_colaboradores THEN
        (SELECT count(*) FROM public.empresa_colaboradores ec
         WHERE ec.empresa_id = v_rh.empresa_id AND ec.status <> 'removido') ELSE NULL END,
      'campanhas_abertas', CASE WHEN v_pode_saude THEN
        (SELECT count(*) FROM public.psychosocial_campaigns pc
         WHERE pc.empresa_id = v_rh.empresa_id AND pc.status = 'aberta') ELSE NULL END,
      'campanhas_encerradas', CASE WHEN v_pode_saude THEN
        (SELECT count(*) FROM public.psychosocial_campaigns pc
         WHERE pc.empresa_id = v_rh.empresa_id AND pc.status = 'encerrada') ELSE NULL END,
      'medidas_abertas', CASE WHEN v_pode_plano THEN
        (SELECT count(*) FROM public.empresa_planos_acao pa
         WHERE pa.empresa_id = v_rh.empresa_id
           AND pa.status IN ('planejada', 'em_andamento')) ELSE NULL END,
      'medidas_atrasadas', CASE WHEN v_pode_plano THEN
        (SELECT count(*) FROM public.empresa_planos_acao pa
         WHERE pa.empresa_id = v_rh.empresa_id
           AND pa.status IN ('planejada', 'em_andamento') AND pa.prazo < CURRENT_DATE) ELSE NULL END,
      'ciclos_lideranca_ativos', CASE WHEN v_pode_plano THEN
        (SELECT count(*) FROM public.empresa_lideranca_ciclos lc
         WHERE lc.empresa_id = v_rh.empresa_id AND lc.status = 'ativo') ELSE NULL END
    ),
    'pode_editar_perfil', v_pode_empresa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_agente_contexto() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_agente_contexto() TO authenticated;

-- Quota independente do agente do colaborador. Preserva os escopos antigos e
-- impede que uso do Portal do RH consuma a janela do aplicativo de saúde.
CREATE OR REPLACE FUNCTION public.consume_edge_quota(
  p_scope TEXT, p_limit INTEGER, p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE allowed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_scope NOT IN ('gemini', 'turn', 'rh_agent')
     OR p_limit NOT BETWEEN 1 AND 100 OR p_window_seconds NOT BETWEEN 60 AND 86400 THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::TEXT || ':' || p_scope, 0));
  INSERT INTO public.edge_rate_limits(user_id, scope, window_start, request_count)
  VALUES (auth.uid(), p_scope, now(), 1)
  ON CONFLICT (user_id, scope) DO UPDATE SET
    window_start = CASE
      WHEN public.edge_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
      THEN now() ELSE public.edge_rate_limits.window_start END,
    request_count = CASE
      WHEN public.edge_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
      THEN 1 ELSE public.edge_rate_limits.request_count + 1 END
  RETURNING request_count <= p_limit INTO allowed;
  RETURN allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_quota(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_edge_quota(TEXT, INTEGER, INTEGER) TO authenticated;
