-- =====================================================
-- Malama — Plano de ação de riscos psicossociais (NR-1 / GRO)
-- Migration: 20260801_plano_acao.sql
--
-- Aplicar via SQL Editor, depois de 20260731_absenteismo_ambulatorio.
--
-- Fecha o ciclo do GRO: identificar → avaliar → CONTROLAR → verificar.
-- Sem esta etapa o produto entrega diagnóstico e nada mais — e diagnóstico
-- sem ação não protege a empresa: documenta, com data e assinatura, que
-- ela sabia do risco. É o que transformaria o dossiê em prova de omissão.
--
-- O CAMPO QUE IMPORTA: nivel_controle.
-- A NR-1 trabalha com hierarquia de controle — agir na FONTE vem primeiro,
-- medida organizacional depois, cuidado individual por último. Registrar o
-- nível de cada medida é o que permite dizer, honestamente, quando um setor
-- de risco ocupacional está sendo tratado SÓ com encaminhamento individual.
-- Essa é a situação que a fiscalização enxerga como ausência de ação sobre
-- o risco, e o painel precisa mostrá-la em vez de escondê-la.
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_planos_acao (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  -- Setor a que o risco se refere. NULL = ação de alcance geral.
  setor             TEXT,

  -- O que originou o item (rastreabilidade do inventário de risco)
  origem            TEXT NOT NULL DEFAULT 'manual'
                      CHECK (origem IN ('matriz', 'absenteismo', 'ambulatorio',
                                        'campanha', 'manual')),

  -- Fator de risco psicossocial endereçado
  fator             TEXT NOT NULL
                      CHECK (fator IN ('demanda', 'controle', 'apoio', 'assedio',
                                       'jornada', 'reconhecimento', 'outro')),

  risco_descricao   TEXT NOT NULL CHECK (length(trim(risco_descricao)) > 0),
  medida            TEXT NOT NULL CHECK (length(trim(medida)) > 0),

  -- Hierarquia de controle da NR-1. 'individual' NÃO fecha risco de fonte.
  nivel_controle    TEXT NOT NULL
                      CHECK (nivel_controle IN ('fonte', 'organizacional', 'individual')),

  -- Nome ou cargo do responsável DENTRO da empresa. Texto, não FK: quem
  -- executa a medida em geral não tem conta na plataforma.
  responsavel       TEXT NOT NULL CHECK (length(trim(responsavel)) > 0),
  prazo             DATE NOT NULL,

  status            TEXT NOT NULL DEFAULT 'planejada'
                      CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),

  -- Evidência de execução: o que comprova que a medida foi implementada.
  -- Obrigatória para concluir (validado na RPC).
  evidencia         TEXT,
  concluida_em      DATE,

  criado_por        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_acao_empresa
  ON empresa_planos_acao(empresa_id, status, prazo);
CREATE INDEX IF NOT EXISTS idx_planos_acao_setor
  ON empresa_planos_acao(empresa_id, setor);

DROP TRIGGER IF EXISTS update_planos_acao_updated_at ON empresa_planos_acao;
CREATE TRIGGER update_planos_acao_updated_at
  BEFORE UPDATE ON empresa_planos_acao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE empresa_planos_acao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all planos acao" ON empresa_planos_acao;
CREATE POLICY "super_admin all planos acao"
  ON empresa_planos_acao FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own planos acao" ON empresa_planos_acao;
CREATE POLICY "rh reads own planos acao"
  ON empresa_planos_acao FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- Escrita só pelas RPCs (validam empresa, evidência na conclusão e prazo).


-- =====================================================
-- RPC: criar item do plano
-- =====================================================

DROP FUNCTION IF EXISTS rh_criar_plano_acao(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION rh_criar_plano_acao(
  p_setor           TEXT,
  p_origem          TEXT,
  p_fator           TEXT,
  p_risco_descricao TEXT,
  p_medida          TEXT,
  p_nivel_controle  TEXT,
  p_responsavel     TEXT,
  p_prazo           DATE
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_id      UUID;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF COALESCE(TRIM(p_risco_descricao), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Descreva o risco identificado');
  END IF;
  IF COALESCE(TRIM(p_medida), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Descreva a medida de controle');
  END IF;
  IF COALESCE(TRIM(p_responsavel), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o responsável pela medida');
  END IF;
  IF p_prazo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o prazo');
  END IF;

  INSERT INTO empresa_planos_acao
    (empresa_id, setor, origem, fator, risco_descricao, medida,
     nivel_controle, responsavel, prazo, criado_por)
  VALUES
    (v_empresa, NULLIF(TRIM(p_setor), ''), COALESCE(p_origem, 'manual'), p_fator,
     TRIM(p_risco_descricao), TRIM(p_medida), p_nivel_controle,
     TRIM(p_responsavel), p_prazo, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fator ou nível de controle inválido');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_criar_plano_acao(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_criar_plano_acao(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE)
  TO authenticated;


-- =====================================================
-- RPC: mudar status / registrar evidência
--
-- Concluir SEM evidência é recusado. Um item marcado como concluído sem
-- nada que comprove a execução é pior que item em aberto: vira afirmação
-- não sustentada dentro de um documento que vai ao PGR.
-- =====================================================

DROP FUNCTION IF EXISTS rh_atualizar_plano_acao(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION rh_atualizar_plano_acao(
  p_id        UUID,
  p_status    TEXT,
  p_evidencia TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF p_status NOT IN ('planejada', 'em_andamento', 'concluida', 'cancelada') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  IF p_status = 'concluida' AND COALESCE(TRIM(p_evidencia), '') = '' THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Para concluir, descreva a evidência de execução da medida');
  END IF;

  UPDATE empresa_planos_acao
  SET status       = p_status,
      evidencia    = COALESCE(NULLIF(TRIM(p_evidencia), ''), evidencia),
      concluida_em = CASE WHEN p_status = 'concluida' THEN CURRENT_DATE ELSE NULL END
  WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Item não encontrado');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_atualizar_plano_acao(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_atualizar_plano_acao(UUID, TEXT, TEXT) TO authenticated;


DROP FUNCTION IF EXISTS rh_excluir_plano_acao(UUID);

CREATE OR REPLACE FUNCTION rh_excluir_plano_acao(p_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  DELETE FROM empresa_planos_acao WHERE id = p_id AND empresa_id = v_empresa;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Item não encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_excluir_plano_acao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_excluir_plano_acao(UUID) TO authenticated;


-- =====================================================
-- RPC: listar itens
-- =====================================================

DROP FUNCTION IF EXISTS rh_listar_planos_acao();

CREATE OR REPLACE FUNCTION rh_listar_planos_acao()
RETURNS TABLE (
  id              UUID,
  setor           TEXT,
  origem          TEXT,
  fator           TEXT,
  risco_descricao TEXT,
  medida          TEXT,
  nivel_controle  TEXT,
  responsavel     TEXT,
  prazo           DATE,
  status          TEXT,
  evidencia       TEXT,
  concluida_em    DATE,
  atrasada        BOOLEAN,
  created_at      TIMESTAMPTZ
) AS $$
  SELECT
    p.id, p.setor, p.origem, p.fator, p.risco_descricao, p.medida,
    p.nivel_controle, p.responsavel, p.prazo, p.status, p.evidencia,
    p.concluida_em,
    (p.status IN ('planejada', 'em_andamento') AND p.prazo < CURRENT_DATE),
    p.created_at
  FROM empresa_planos_acao p
  WHERE p.empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  ORDER BY
    CASE p.status WHEN 'em_andamento' THEN 0 WHEN 'planejada' THEN 1
                  WHEN 'concluida' THEN 2 ELSE 3 END,
    p.prazo;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_listar_planos_acao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_listar_planos_acao() TO authenticated;


-- =====================================================
-- RPC: resumo + alerta de "risco tratado só no indivíduo"
--
-- Cruza os setores em risco ocupacional (matriz) com o nível de controle
-- das ações abertas para eles. Setor com risco de fonte e nenhuma medida
-- de fonte ou organizacional em aberto é sinalizado — não porque cuidado
-- individual seja errado, mas porque sozinho ele não encerra o item na
-- lógica da NR-1, e o relatório precisa dizer isso.
-- =====================================================

DROP FUNCTION IF EXISTS rh_planos_acao_resumo(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_planos_acao_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB AS $$
DECLARE
  v_empresa   UUID;
  v_matriz    JSONB;
  v_lacunas   JSONB;
  v_total     INT;
  v_abertas   INT;
  v_concl     INT;
  v_atras     INT;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;
  IF v_empresa IS NULL THEN RETURN NULL; END IF;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status IN ('planejada', 'em_andamento'))::int,
    COUNT(*) FILTER (WHERE status = 'concluida')::int,
    COUNT(*) FILTER (WHERE status IN ('planejada', 'em_andamento')
                       AND prazo < CURRENT_DATE)::int
  INTO v_total, v_abertas, v_concl, v_atras
  FROM empresa_planos_acao
  WHERE empresa_id = v_empresa;

  -- Setores classificados como risco ocupacional pela matriz do período
  v_matriz := rh_matriz_psicossocial(p_inicio, p_fim);

  IF v_matriz IS NULL THEN
    v_lacunas := '[]'::jsonb;
  ELSE
    SELECT COALESCE(jsonb_agg(s.setor ORDER BY s.setor), '[]'::jsonb)
      INTO v_lacunas
    FROM (
      SELECT elem ->> 'setor' AS setor
      FROM jsonb_array_elements(v_matriz -> 'setores') elem
      WHERE elem ->> 'quadrante' = 'risco_ocupacional'
    ) s
    WHERE NOT EXISTS (
      SELECT 1 FROM empresa_planos_acao p
      WHERE p.empresa_id = v_empresa
        -- Medida do próprio setor OU de alcance geral (setor NULL): uma
        -- reestruturação que vale para a empresa toda também cobre o setor,
        -- e sinalizar mesmo assim seria alarme falso.
        AND (p.setor = s.setor OR p.setor IS NULL)
        AND p.status IN ('planejada', 'em_andamento', 'concluida')
        AND p.nivel_controle IN ('fonte', 'organizacional')
    );
  END IF;

  RETURN jsonb_build_object(
    'total',              COALESCE(v_total, 0),
    'abertas',            COALESCE(v_abertas, 0),
    'concluidas',         COALESCE(v_concl, 0),
    'atrasadas',          COALESCE(v_atras, 0),
    -- Setores em risco ocupacional sem nenhuma medida de fonte ou
    -- organizacional registrada.
    'setores_sem_acao_na_fonte', v_lacunas
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_planos_acao_resumo(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_planos_acao_resumo(DATE, DATE) TO authenticated;
