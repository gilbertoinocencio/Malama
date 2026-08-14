-- =====================================================
-- Malama — equipe do RH com permissões + relatos confidenciais
--
-- Relatos de assédio/violência são eventos sentinela: não usam corte k>=5.
-- O painel geral recebe apenas o alerta. Narrativa e envolvidos só podem ser
-- abertos por usuários com permissão explícita de apuração, com trilha de acesso.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Papéis e permissões do portal RH ────────────────────────────────────────

ALTER TABLE public.rh_usuarios
  ADD COLUMN IF NOT EXISTS papel TEXT NOT NULL DEFAULT 'gestor_rh',
  ADD COLUMN IF NOT EXISTS permissoes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS principal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES public.rh_usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.rh_usuarios
SET auth_user_id = user_id
WHERE auth_user_id IS NULL AND user_id IS NOT NULL;

-- A conta mais antiga de cada empresa passa a ser a proprietária. Isso preserva
-- empresas já existentes e evita depender de uma recriação pelo super admin.
WITH primeiras AS (
  SELECT DISTINCT ON (empresa_id) id
  FROM public.rh_usuarios
  ORDER BY empresa_id, created_at, id
)
UPDATE public.rh_usuarios r
SET principal = true,
    papel = 'proprietario',
    permissoes = ARRAY[
      'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao',
      'importar', 'financeiro', 'compliance', 'empresa', 'usuarios', 'apuracao'
    ]::TEXT[]
WHERE r.id IN (SELECT id FROM primeiras);

-- Se alguma empresa já tiver membros adicionais criados manualmente, eles
-- mantêm os módulos que existiam antes do RBAC. Gestão de usuários e apuração
-- não são concedidas no backfill porque são capacidades novas e sensíveis.
UPDATE public.rh_usuarios
SET permissoes = ARRAY[
  'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao',
  'importar', 'financeiro', 'compliance', 'empresa'
]::TEXT[]
WHERE NOT principal AND cardinality(permissoes) = 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rh_principal_por_empresa
  ON public.rh_usuarios(empresa_id) WHERE principal AND ativo;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rh_auth_user
  ON public.rh_usuarios(auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.rh_usuarios DROP CONSTRAINT IF EXISTS rh_usuarios_papel_check;
ALTER TABLE public.rh_usuarios ADD CONSTRAINT rh_usuarios_papel_check
  CHECK (papel IN ('proprietario', 'gestor_rh', 'saude_mental', 'compliance', 'financeiro', 'personalizado'));

CREATE OR REPLACE FUNCTION public.rh_tem_permissao(p_permissao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_usuarios r
    WHERE r.user_id = auth.uid()
      AND r.ativo
      AND (r.principal OR p_permissao = ANY(r.permissoes))
  );
$$;

REVOKE ALL ON FUNCTION public.rh_tem_permissao(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_tem_permissao(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_meu_acesso()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rh public.rh_usuarios%ROWTYPE;
BEGIN
  SELECT * INTO v_rh
  FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo
  LIMIT 1;

  IF v_rh.id IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', v_rh.id,
    'empresa_id', v_rh.empresa_id,
    'nome', v_rh.nome,
    'email', v_rh.email,
    'papel', v_rh.papel,
    'principal', v_rh.principal,
    'permissoes', CASE WHEN v_rh.principal THEN ARRAY[
      'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao',
      'importar', 'financeiro', 'compliance', 'empresa', 'usuarios', 'apuracao'
    ]::TEXT[] ELSE v_rh.permissoes END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_meu_acesso() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_meu_acesso() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_listar_usuarios()
RETURNS TABLE (
  id UUID, nome TEXT, email TEXT, papel TEXT, permissoes TEXT[],
  principal BOOLEAN, ativo BOOLEAN, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID;
BEGIN
  SELECT r.empresa_id INTO v_empresa
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid() AND r.ativo AND r.principal;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Apenas o usuário principal pode gerenciar a equipe'; END IF;

  RETURN QUERY
  SELECT r.id, r.nome, r.email, r.papel, r.permissoes, r.principal, r.ativo, r.created_at
  FROM public.rh_usuarios r
  WHERE r.empresa_id = v_empresa
  ORDER BY r.principal DESC, r.ativo DESC, r.nome NULLS LAST, r.email;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_listar_usuarios() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_listar_usuarios() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_atualizar_usuario(
  p_id UUID,
  p_nome TEXT,
  p_papel TEXT,
  p_permissoes TEXT[],
  p_ativo BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gestor public.rh_usuarios%ROWTYPE;
  v_alvo public.rh_usuarios%ROWTYPE;
  v_validas CONSTANT TEXT[] := ARRAY[
    'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao',
    'importar', 'financeiro', 'compliance', 'empresa', 'apuracao'
  ]::TEXT[];
BEGIN
  SELECT * INTO v_gestor FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND principal;
  IF v_gestor.id IS NULL THEN RAISE EXCEPTION 'Apenas o usuário principal pode gerenciar a equipe'; END IF;

  SELECT * INTO v_alvo FROM public.rh_usuarios
  WHERE id = p_id AND empresa_id = v_gestor.empresa_id FOR UPDATE;
  IF v_alvo.id IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  IF v_alvo.principal THEN RAISE EXCEPTION 'A conta principal não pode ser alterada por esta tela'; END IF;
  IF p_papel NOT IN ('gestor_rh', 'saude_mental', 'compliance', 'financeiro', 'personalizado') THEN
    RAISE EXCEPTION 'Papel inválido';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_permissoes, ARRAY[]::TEXT[])) p WHERE NOT (p = ANY(v_validas))) THEN
    RAISE EXCEPTION 'Permissão inválida';
  END IF;

  UPDATE public.rh_usuarios
  SET nome = NULLIF(trim(p_nome), ''),
      papel = p_papel,
      permissoes = ARRAY(SELECT DISTINCT p FROM unnest(COALESCE(p_permissoes, ARRAY[]::TEXT[])) p ORDER BY p),
      ativo = p_ativo,
      -- Remover user_id derruba tanto o guard novo quanto RPCs legadas que
      -- ainda identificam a empresa por esse campo. auth_user_id permite reativar.
      user_id = CASE WHEN p_ativo THEN auth_user_id ELSE NULL END,
      atualizado_em = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_atualizar_usuario(UUID, TEXT, TEXT, TEXT[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_atualizar_usuario(UUID, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- Acesso direto à lista de colaboradores também respeita o módulo concedido.
DROP POLICY IF EXISTS "rh reads own empresa colaboradores" ON public.empresa_colaboradores;
CREATE POLICY "rh reads permitted empresa colaboradores"
  ON public.empresa_colaboradores FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('colaboradores')
    AND empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh inserts own empresa colaboradores" ON public.empresa_colaboradores;
CREATE POLICY "rh inserts permitted empresa colaboradores"
  ON public.empresa_colaboradores FOR INSERT TO authenticated
  WITH CHECK (
    public.rh_tem_permissao('colaboradores')
    AND empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh updates own empresa colaboradores" ON public.empresa_colaboradores;
CREATE POLICY "rh updates permitted empresa colaboradores"
  ON public.empresa_colaboradores FOR UPDATE TO authenticated
  USING (
    public.rh_tem_permissao('colaboradores')
    AND empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo)
  )
  WITH CHECK (
    public.rh_tem_permissao('colaboradores')
    AND empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- ── Canal confidencial de assédio, violência e discriminação ────────────────

CREATE TABLE IF NOT EXISTS public.relatos_confidenciais_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  protocolo TEXT NOT NULL UNIQUE,
  chave_hash TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'assedio_moral', 'assedio_sexual', 'violencia', 'discriminacao', 'retaliacao', 'outro'
  )),
  urgencia TEXT NOT NULL DEFAULT 'normal' CHECK (urgencia IN ('imediata', 'alta', 'normal')),
  descricao TEXT NOT NULL CHECK (char_length(descricao) BETWEEN 20 AND 10000),
  setor TEXT,
  envolvidos TEXT,
  quando_ocorreu TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN (
    'novo', 'acolhimento', 'em_apuracao', 'encaminhado', 'concluido', 'arquivado'
  )),
  retorno_publico TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relatos_empresa_status
  ON public.relatos_confidenciais_trabalho(empresa_id, status, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.relatos_confidenciais_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relato_id UUID NOT NULL REFERENCES public.relatos_confidenciais_trabalho(id) ON DELETE CASCADE,
  rh_usuario_id UUID REFERENCES public.rh_usuarios(id) ON DELETE SET NULL,
  acao TEXT NOT NULL CHECK (acao IN ('abriu', 'alterou_status')),
  detalhes JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.relatos_confidenciais_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatos_confidenciais_auditoria ENABLE ROW LEVEL SECURITY;
-- Sem policies diretas: todo acesso passa pelas funções abaixo.

CREATE OR REPLACE FUNCTION public.tem_canal_confidencial_empresa()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresa_colaboradores ec
    JOIN public.empresas e ON e.id = ec.empresa_id
    WHERE ec.user_id = auth.uid() AND ec.status = 'ativo' AND e.status = 'ativa'
  );
$$;

REVOKE ALL ON FUNCTION public.tem_canal_confidencial_empresa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tem_canal_confidencial_empresa() TO authenticated;

CREATE OR REPLACE FUNCTION public.enviar_relato_confidencial(
  p_categoria TEXT,
  p_urgencia TEXT,
  p_descricao TEXT,
  p_setor TEXT DEFAULT NULL,
  p_envolvidos TEXT DEFAULT NULL,
  p_quando_ocorreu TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_empresa UUID;
  v_protocolo TEXT;
  v_chave TEXT;
BEGIN
  SELECT ec.empresa_id INTO v_empresa
  FROM public.empresa_colaboradores ec
  JOIN public.empresas e ON e.id = ec.empresa_id
  WHERE ec.user_id = auth.uid() AND ec.status = 'ativo' AND e.status = 'ativa'
  ORDER BY ec.data_ativacao DESC NULLS LAST, ec.data_adicao DESC
  LIMIT 1;

  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Benefício empresarial ativo não encontrado'; END IF;
  IF p_categoria NOT IN ('assedio_moral','assedio_sexual','violencia','discriminacao','retaliacao','outro') THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
  IF p_urgencia NOT IN ('imediata','alta','normal') THEN RAISE EXCEPTION 'Urgência inválida'; END IF;
  IF char_length(trim(COALESCE(p_descricao, ''))) < 20 THEN RAISE EXCEPTION 'Descreva o ocorrido com pelo menos 20 caracteres'; END IF;

  v_protocolo := 'MAL-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8));
  v_chave := upper(encode(gen_random_bytes(9), 'hex'));

  INSERT INTO public.relatos_confidenciais_trabalho (
    empresa_id, protocolo, chave_hash, categoria, urgencia, descricao, setor, envolvidos, quando_ocorreu
  ) VALUES (
    v_empresa, v_protocolo, crypt(v_chave, gen_salt('bf')), p_categoria, p_urgencia,
    trim(p_descricao), NULLIF(trim(p_setor), ''), NULLIF(trim(p_envolvidos), ''), NULLIF(trim(p_quando_ocorreu), '')
  );

  -- Nenhum user_id é gravado. Protocolo e chave são a única forma de acompanhamento.
  RETURN jsonb_build_object('ok', true, 'protocolo', v_protocolo, 'chave', v_chave);
END;
$$;

REVOKE ALL ON FUNCTION public.enviar_relato_confidencial(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_relato_confidencial(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.acompanhar_relato_confidencial(p_protocolo TEXT, p_chave TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_relato public.relatos_confidenciais_trabalho%ROWTYPE;
BEGIN
  SELECT * INTO v_relato FROM public.relatos_confidenciais_trabalho
  WHERE protocolo = upper(trim(p_protocolo)) AND chave_hash = crypt(upper(trim(p_chave)), chave_hash);
  IF v_relato.id IS NULL THEN RAISE EXCEPTION 'Protocolo ou chave inválidos'; END IF;
  RETURN jsonb_build_object(
    'protocolo', v_relato.protocolo, 'status', v_relato.status,
    'retorno', v_relato.retorno_publico, 'criado_em', v_relato.criado_em,
    'atualizado_em', v_relato.atualizado_em
  );
END;
$$;

REVOKE ALL ON FUNCTION public.acompanhar_relato_confidencial(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acompanhar_relato_confidencial(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_resumo_relatos()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID; v_total BIGINT; v_novos BIGINT; v_urgentes BIGINT; v_ultimo TIMESTAMPTZ;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND (principal OR 'saude_mental' = ANY(permissoes) OR 'apuracao' = ANY(permissoes));
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sem permissão para visualizar o alerta'; END IF;
  SELECT count(*), count(*) FILTER (WHERE status = 'novo'),
         count(*) FILTER (WHERE urgencia IN ('imediata','alta') AND status NOT IN ('concluido','arquivado')),
         max(criado_em)
  INTO v_total, v_novos, v_urgentes, v_ultimo
  FROM public.relatos_confidenciais_trabalho WHERE empresa_id = v_empresa;
  RETURN jsonb_build_object('total', v_total, 'novos', v_novos, 'urgentes_abertos', v_urgentes, 'ultimo_em', v_ultimo);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_resumo_relatos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_resumo_relatos() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_listar_relatos()
RETURNS TABLE (
  id UUID, protocolo TEXT, categoria TEXT, urgencia TEXT, setor TEXT,
  status TEXT, criado_em TIMESTAMPTZ, atualizado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_empresa UUID;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND (principal OR 'apuracao' = ANY(permissoes));
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Acesso restrito à equipe de apuração'; END IF;
  RETURN QUERY SELECT r.id, r.protocolo, r.categoria, r.urgencia, r.setor, r.status, r.criado_em, r.atualizado_em
  FROM public.relatos_confidenciais_trabalho r WHERE r.empresa_id = v_empresa ORDER BY r.criado_em DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_listar_relatos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_listar_relatos() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_abrir_relato(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rh public.rh_usuarios%ROWTYPE; v_relato public.relatos_confidenciais_trabalho%ROWTYPE;
BEGIN
  SELECT * INTO v_rh FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND (principal OR 'apuracao' = ANY(permissoes));
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Acesso restrito à equipe de apuração'; END IF;
  SELECT * INTO v_relato FROM public.relatos_confidenciais_trabalho
  WHERE id = p_id AND empresa_id = v_rh.empresa_id;
  IF v_relato.id IS NULL THEN RAISE EXCEPTION 'Relato não encontrado'; END IF;
  INSERT INTO public.relatos_confidenciais_auditoria(relato_id, rh_usuario_id, acao)
  VALUES (v_relato.id, v_rh.id, 'abriu');
  RETURN jsonb_build_object(
    'id', v_relato.id, 'protocolo', v_relato.protocolo, 'categoria', v_relato.categoria,
    'urgencia', v_relato.urgencia, 'descricao', v_relato.descricao, 'setor', v_relato.setor,
    'envolvidos', v_relato.envolvidos, 'quando_ocorreu', v_relato.quando_ocorreu,
    'status', v_relato.status, 'retorno_publico', v_relato.retorno_publico,
    'criado_em', v_relato.criado_em, 'atualizado_em', v_relato.atualizado_em
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_abrir_relato(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_abrir_relato(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_atualizar_relato(
  p_id UUID, p_status TEXT, p_retorno_publico TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rh public.rh_usuarios%ROWTYPE; v_anterior TEXT;
BEGIN
  SELECT * INTO v_rh FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND (principal OR 'apuracao' = ANY(permissoes));
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Acesso restrito à equipe de apuração'; END IF;
  IF p_status NOT IN ('novo','acolhimento','em_apuracao','encaminhado','concluido','arquivado') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT status INTO v_anterior FROM public.relatos_confidenciais_trabalho
  WHERE id = p_id AND empresa_id = v_rh.empresa_id FOR UPDATE;
  IF v_anterior IS NULL THEN RAISE EXCEPTION 'Relato não encontrado'; END IF;
  UPDATE public.relatos_confidenciais_trabalho
  SET status = p_status, retorno_publico = NULLIF(trim(p_retorno_publico), ''), atualizado_em = now()
  WHERE id = p_id;
  INSERT INTO public.relatos_confidenciais_auditoria(relato_id, rh_usuario_id, acao, detalhes)
  VALUES (p_id, v_rh.id, 'alterou_status', jsonb_build_object('de', v_anterior, 'para', p_status));
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_atualizar_relato(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_atualizar_relato(UUID, TEXT, TEXT) TO authenticated;
