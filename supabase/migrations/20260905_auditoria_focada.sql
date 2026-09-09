-- =====================================================
-- Malama — Registro de alterações (versão focada)
-- Migration: 20260905_auditoria_focada.sql
--
-- Aplicar via SQL Editor.
--
-- Não é um log genérico de todo UPDATE do sistema — isso vira infraestrutura
-- cara e ruído que ninguém olha. É rastro de autoria só onde uma disputa ou
-- auditoria de verdade pode perguntar "quem fez isso":
--   1. Mudança de permissão/papel/status de alguém da equipe do RH
--      (rh_atualizar_usuario) — quem pode ver o quê é a superfície mais
--      sensível do portal.
--   2. Mudança do efetivo declarado de um setor (rh_setor_definir_efetivo)
--      — alimenta indicador de cobertura usado em relatório de compliance.
--   3. O canal confidencial (assédio/violência) JÁ grava quem abriu e quem
--      mudou status em relatos_confidenciais_auditoria desde a migration
--      20260836 — só que ninguém nunca leu essa tabela de volta. A tela
--      (RhRelatos.tsx) até promete "fica registrado na trilha de
--      auditoria" sem nunca mostrar essa trilha. Aqui ela passa a aparecer.
--
-- Só o usuário principal vê o registro geral (rh_listar_auditoria), mesma
-- trava que já protege rh_listar_usuarios/rh_atualizar_usuario. O histórico
-- de UM relato aparece pra quem já pode abrir aquele relato (principal ou
-- 'apuracao') — não é permissão nova, é expor o que a apuração já registra.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rh_auditoria (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rh_usuario_id UUID REFERENCES public.rh_usuarios(id) ON DELETE SET NULL,
  acao          TEXT NOT NULL,
  detalhes      JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_auditoria_empresa
  ON public.rh_auditoria(empresa_id, criado_em DESC);

ALTER TABLE public.rh_auditoria ENABLE ROW LEVEL SECURITY;
-- Sem policies diretas, igual relatos_confidenciais_auditoria: todo acesso
-- passa pelas funções SECURITY DEFINER abaixo.


-- ── 1. Efetivo do setor: registra de/para quando o valor muda de fato ──────

CREATE OR REPLACE FUNCTION rh_setor_definir_efetivo(p_id UUID, p_efetivo INT)
RETURNS JSONB AS $$
DECLARE
  v_rh_id         UUID;
  v_empresa       UUID;
  v_n             INT;
  v_limite        INT;
  v_total_outros  INT;
  v_total_novo    INT;
  v_setor_ativo   BOOLEAN;
  v_setor_nome    TEXT;
  v_efetivo_antes INT;
BEGIN
  SELECT ru.id, ru.empresa_id, e.max_assentos
    INTO v_rh_id, v_empresa, v_limite
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

  SELECT s.ativo, s.nome, s.efetivo INTO v_setor_ativo, v_setor_nome, v_efetivo_antes
  FROM empresa_setores s
  WHERE s.id = p_id AND s.empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;

  SELECT COUNT(*)::int INTO v_n
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id = v_empresa
    AND ec.status IN ('ativo', 'convidado')
    AND lower(TRIM(ec.setor)) = lower(TRIM(v_setor_nome));

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

  IF v_efetivo_antes IS DISTINCT FROM p_efetivo THEN
    INSERT INTO rh_auditoria (empresa_id, rh_usuario_id, acao, detalhes)
    VALUES (
      v_empresa, v_rh_id, 'setor.efetivo_alterado',
      jsonb_build_object(
        'setor_id', p_id, 'setor_nome', v_setor_nome,
        'de', v_efetivo_antes, 'para', p_efetivo
      )
    );
  END IF;

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


-- ── 2. Equipe do RH: registra de/para de papel, permissões e ativo ─────────

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
  v_permissoes_novas TEXT[];
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

  v_permissoes_novas := ARRAY(SELECT DISTINCT p FROM unnest(COALESCE(p_permissoes, ARRAY[]::TEXT[])) p ORDER BY p);

  UPDATE public.rh_usuarios
  SET nome = NULLIF(trim(p_nome), ''),
      papel = p_papel,
      permissoes = v_permissoes_novas,
      ativo = p_ativo,
      -- Remover user_id derruba tanto o guard novo quanto RPCs legadas que
      -- ainda identificam a empresa por esse campo. auth_user_id permite reativar.
      user_id = CASE WHEN p_ativo THEN auth_user_id ELSE NULL END,
      atualizado_em = now()
  WHERE id = p_id;

  IF v_alvo.papel IS DISTINCT FROM p_papel
     OR v_alvo.permissoes IS DISTINCT FROM v_permissoes_novas
     OR v_alvo.ativo IS DISTINCT FROM p_ativo THEN
    INSERT INTO public.rh_auditoria (empresa_id, rh_usuario_id, acao, detalhes)
    VALUES (
      v_gestor.empresa_id, v_gestor.id, 'equipe.acesso_alterado',
      jsonb_build_object(
        'usuario_id', v_alvo.id,
        'usuario_nome', COALESCE(v_alvo.nome, v_alvo.email),
        'usuario_email', v_alvo.email,
        'papel_de', v_alvo.papel, 'papel_para', p_papel,
        'permissoes_de', to_jsonb(v_alvo.permissoes), 'permissoes_para', to_jsonb(v_permissoes_novas),
        'ativo_de', v_alvo.ativo, 'ativo_para', p_ativo
      )
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_atualizar_usuario(UUID, TEXT, TEXT, TEXT[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_atualizar_usuario(UUID, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;


-- ── 3. Expor o histórico que o canal confidencial já grava ─────────────────
-- Mesma trava de acesso que já abre o relato (principal ou 'apuracao').
-- Nenhuma permissão nova: só devolve o que rh_abrir_relato/rh_atualizar_relato
-- já inserem em relatos_confidenciais_auditoria desde a 20260836.

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
    'status', v_relato.status, 'registro_apuracao', v_relato.registro_apuracao,
    'origem', v_relato.origem,
    'criado_em', v_relato.criado_em, 'atualizado_em', v_relato.atualizado_em,
    'historico', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'acao', a.acao, 'detalhes', a.detalhes, 'criado_em', a.criado_em,
          'autor_nome', COALESCE(u.nome, u.email)
        ) ORDER BY a.criado_em
      ), '[]'::jsonb)
      FROM public.relatos_confidenciais_auditoria a
      LEFT JOIN public.rh_usuarios u ON u.id = a.rh_usuario_id
      WHERE a.relato_id = v_relato.id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_abrir_relato(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_abrir_relato(UUID) TO authenticated;


-- ── 4. Leitura do registro geral: só o usuário principal ───────────────────

CREATE OR REPLACE FUNCTION public.rh_listar_auditoria(p_limite INT DEFAULT 200)
RETURNS TABLE (
  id UUID, acao TEXT, detalhes JSONB, criado_em TIMESTAMPTZ,
  autor_nome TEXT, autor_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rh public.rh_usuarios%ROWTYPE;
BEGIN
  SELECT * INTO v_rh FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND principal;
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Apenas o usuário principal pode ver o registro de alterações'; END IF;

  RETURN QUERY
  SELECT a.id, a.acao, a.detalhes, a.criado_em, u.nome, u.email
  FROM public.rh_auditoria a
  LEFT JOIN public.rh_usuarios u ON u.id = a.rh_usuario_id
  WHERE a.empresa_id = v_rh.empresa_id
  ORDER BY a.criado_em DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 200), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_listar_auditoria(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_listar_auditoria(INT) TO authenticated;
