-- =====================================================
-- Malama — Valor probatório dos documentos emitidos ao RH
--
-- Três correções de risco jurídico, na mesma migração porque são o mesmo
-- problema: documento de evidência que não se reproduz, ou que afirma mais
-- do que o dado sustenta, enfraquece a defesa da empresa em vez de apoiá-la.
--
--  1. RELATÓRIOS REGISTRADOS. WHO-5 e JSS eram gerados no navegador e não
--     ficavam em lugar nenhum: o número saía de data+período (dois PDFs do
--     mesmo dia colidiam) e o conteúdo era recalculado ao vivo, então
--     reemitir depois dava resultado diferente do arquivado. Em perícia isso
--     é atacado como documento produzido para o processo. Agora cada emissão
--     grava o SNAPSHOT do que foi impresso, com número sequencial do
--     servidor e hash de verificação; reemitir lê daqui e nunca recalcula.
--
--  2. MÉTRICAS DE COMPLIANCE POR PESSOA. `empresa_colaboradores` guarda
--     histórico: contar linhas inflava "elegíveis" e afundava a adesão de
--     quem foi readmitido. Passa a contar pessoas distintas, como
--     rh_alvo_total() já fazia.
--
--  3. CERTIFICADO PARA QUEM SAIU. A RPC escondia `removido`, justamente o
--     caso em que o certificado é necessário — a defesa costuma ser contra
--     ex-colaborador. Agora devolve todos, com a data de saída, para o
--     documento declarar um período fechado em vez de disponibilidade em
--     aberto. Também colapsa duplicidade de histórico por pessoa.
--
-- Aplicar via SQL Editor.
-- =====================================================

-- =====================================================
-- 1. TABELA: relatórios psicossociais emitidos
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_relatorios_emitidos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('jss', 'who5')),
  numero_doc        TEXT NOT NULL,
  periodo_inicio    DATE NOT NULL,
  periodo_fim       DATE NOT NULL,
  -- Tudo que foi impresso, exatamente como foi impresso. É este campo que
  -- torna o documento reproduzível anos depois.
  payload           JSONB NOT NULL,
  -- SHA-256 do payload canônico, calculado no cliente e impresso no PDF.
  -- Permite conferir que o arquivo em mãos é o que foi registrado.
  hash_verificacao  TEXT NOT NULL,
  emitido_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emitido_por_nome  TEXT,
  emitido_por_email TEXT,
  emitido_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, numero_doc)
);

CREATE INDEX IF NOT EXISTS idx_relatorios_emitidos_empresa
  ON empresa_relatorios_emitidos(empresa_id, tipo, emitido_em DESC);

ALTER TABLE empresa_relatorios_emitidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all relatorios emitidos" ON empresa_relatorios_emitidos;
CREATE POLICY "super_admin all relatorios emitidos"
  ON empresa_relatorios_emitidos FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own relatorios emitidos" ON empresa_relatorios_emitidos;
CREATE POLICY "rh reads own relatorios emitidos"
  ON empresa_relatorios_emitidos FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- Sem policy de INSERT/UPDATE/DELETE de propósito: registro de evidência só
-- nasce pela RPC abaixo, e nunca é alterado nem apagado depois.

-- =====================================================
-- 2. RPC: registrar uma emissão
--
-- A numeração é gerada AQUI, sequencial por empresa/tipo/ano. No cliente ela
-- vinha de data+período e dois relatórios do mesmo dia recebiam o mesmo
-- número com conteúdos diferentes.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_registrar_relatorio(
  p_tipo           TEXT,
  p_periodo_inicio DATE,
  p_periodo_fim    DATE,
  p_payload        JSONB,
  p_hash           TEXT
) RETURNS JSONB AS $$
DECLARE
  v_empresa  UUID;
  v_seq      INT;
  v_numero   TEXT;
  v_nome     TEXT;
  v_email    TEXT;
  v_id       UUID;
  v_prefixo  TEXT;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem empresa vinculada.');
  END IF;

  IF p_tipo NOT IN ('jss', 'who5') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tipo de relatório inválido.');
  END IF;

  SELECT nome, email INTO v_nome, v_email
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  v_prefixo := CASE p_tipo WHEN 'jss' THEN 'MAL-JSS' ELSE 'MAL-WHO5' END;

  -- Sequencial por ano civil. O lock evita dois números iguais quando duas
  -- abas do mesmo RH emitem ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtext(v_empresa::text || p_tipo));

  SELECT COALESCE(MAX(
           NULLIF(regexp_replace(numero_doc, '^.*-', ''), '')::INT
         ), 0) + 1
    INTO v_seq
    FROM empresa_relatorios_emitidos
   WHERE empresa_id = v_empresa
     AND tipo = p_tipo
     AND EXTRACT(YEAR FROM emitido_em) = EXTRACT(YEAR FROM now());

  v_numero := v_prefixo || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::TEXT, 4, '0');

  INSERT INTO empresa_relatorios_emitidos
    (empresa_id, tipo, numero_doc, periodo_inicio, periodo_fim, payload,
     hash_verificacao, emitido_por, emitido_por_nome, emitido_por_email)
  VALUES
    (v_empresa, p_tipo, v_numero, p_periodo_inicio, p_periodo_fim, p_payload,
     p_hash, auth.uid(), v_nome, v_email)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id, 'numero_doc', v_numero,
    'emitido_por_nome', v_nome, 'emitido_por_email', v_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_registrar_relatorio(TEXT, DATE, DATE, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_registrar_relatorio(TEXT, DATE, DATE, JSONB, TEXT) TO authenticated;

-- =====================================================
-- 3. RPC: histórico (sem payload) e reemissão (com payload)
-- =====================================================

CREATE OR REPLACE FUNCTION rh_listar_relatorios_emitidos()
RETURNS TABLE (
  id                UUID,
  tipo              TEXT,
  numero_doc        TEXT,
  periodo_inicio    DATE,
  periodo_fim       DATE,
  hash_verificacao  TEXT,
  emitido_por_nome  TEXT,
  emitido_em        TIMESTAMPTZ
) AS $$
  SELECT r.id, r.tipo, r.numero_doc, r.periodo_inicio, r.periodo_fim,
         r.hash_verificacao, r.emitido_por_nome, r.emitido_em
  FROM empresa_relatorios_emitidos r
  WHERE r.empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  ORDER BY r.emitido_em DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_listar_relatorios_emitidos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_listar_relatorios_emitidos() TO authenticated;

CREATE OR REPLACE FUNCTION rh_obter_relatorio_emitido(p_id UUID)
RETURNS JSONB AS $$
  SELECT to_jsonb(r) FROM empresa_relatorios_emitidos r
  WHERE r.id = p_id
    AND r.empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_obter_relatorio_emitido(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_obter_relatorio_emitido(UUID) TO authenticated;

-- =====================================================
-- 4. Métricas de compliance: contar PESSOAS, não linhas
--
-- Sem o DISTINCT, quem foi readmitido entrava duas vezes em "elegíveis" e a
-- taxa exibida no documento ficava menor que a real. `rh_alvo_total()` já
-- contava assim; era a métrica do documento jurídico que estava frouxa.
-- =====================================================

DROP FUNCTION IF EXISTS rh_compliance_metricas();

CREATE OR REPLACE FUNCTION rh_compliance_metricas()
RETURNS TABLE (
  empresa_id              UUID,
  nome                    TEXT,
  cnpj                    TEXT,
  data_inicio             DATE,
  colaboradores_elegiveis INT,
  colaboradores_ativos    INT,
  consultas_realizadas    INT
) AS $$
  WITH minha_empresa AS (
    SELECT e.id, e.nome, e.cnpj, e.data_inicio
    FROM empresas e
    WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
    LIMIT 1
  )
  SELECT
    me.id,
    me.nome,
    me.cnpj,
    me.data_inicio,
    (SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::INT
       FROM empresa_colaboradores ec
      WHERE ec.empresa_id = me.id AND ec.status <> 'removido'),
    (SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::INT
       FROM empresa_colaboradores ec
      WHERE ec.empresa_id = me.id AND ec.status = 'ativo'),
    (SELECT COUNT(*)::INT FROM consultations c
      WHERE c.status = 'completed'
        AND c.patient_id IN (
          SELECT ec.user_id FROM empresa_colaboradores ec
          WHERE ec.empresa_id = me.id AND ec.user_id IS NOT NULL AND ec.status <> 'removido'
        ))
  FROM minha_empresa me;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_compliance_metricas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_compliance_metricas() TO authenticated;

-- =====================================================
-- 5. Certificado: incluir quem saiu, com data de saída
--
-- O certificado existe para provar diligência contra alegação de
-- adoecimento — e quem alega costuma ser EX-colaborador. Esconder
-- `removido` apagava a prova exatamente quando ela era necessária.
--
-- DISTINCT ON por pessoa: histórico de readmissão gerava dois certificados
-- com datas divergentes para o mesmo nome.
-- =====================================================

DROP FUNCTION IF EXISTS rh_certificado_colaboradores();

CREATE OR REPLACE FUNCTION rh_certificado_colaboradores()
RETURNS TABLE (
  colaborador_id UUID,
  nome           TEXT,
  setor          TEXT,
  funcao         TEXT,
  data_adicao    TIMESTAMPTZ,
  data_ativacao  TIMESTAMPTZ,
  data_saida     TIMESTAMPTZ,
  status         TEXT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  ),
  linhas AS (
    SELECT
      ec.id,
      COALESCE(
        NULLIF(TRIM(p.display_name), ''),
        split_part(u.email, '@', 1),
        'Colaborador'
      ) AS nome,
      ec.setor,
      ec.funcao,
      ec.data_adicao,
      ec.data_ativacao,
      ec.removido_em,
      ec.status,
      -- Chave da pessoa: sem conta ainda, cai no id da própria linha.
      COALESCE(ec.user_id::text, ec.id::text) AS pessoa
    FROM empresa_colaboradores ec
    LEFT JOIN public.profiles p ON p.id = ec.user_id
    LEFT JOIN auth.users u      ON u.id = ec.user_id
    WHERE ec.empresa_id = (SELECT empresa_id FROM emp)
  ),
  -- Uma linha por pessoa: o vínculo vigente vence o histórico, mas o "desde"
  -- é sempre a entrada mais antiga — é a data que sustenta a diligência.
  ranqueado AS (
    SELECT
      l.*,
      ROW_NUMBER() OVER (
        PARTITION BY l.pessoa
        ORDER BY (l.status <> 'removido') DESC, l.data_adicao DESC
      ) AS rn,
      MIN(l.data_adicao)   OVER (PARTITION BY l.pessoa) AS primeira_adicao,
      MIN(l.data_ativacao) OVER (PARTITION BY l.pessoa) AS primeira_ativacao
    FROM linhas l
  )
  SELECT
    r.id, r.nome, r.setor, r.funcao,
    r.primeira_adicao, r.primeira_ativacao,
    CASE WHEN r.status = 'removido' THEN r.removido_em END,
    r.status
  FROM ranqueado r
  WHERE r.rn = 1
  ORDER BY r.nome;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_certificado_colaboradores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_certificado_colaboradores() TO authenticated;

-- =====================================================
-- 6. Compliance docs: quem emitiu e hash de verificação
-- =====================================================

ALTER TABLE empresa_compliance_docs
  ADD COLUMN IF NOT EXISTS emitido_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emitido_por_nome  TEXT,
  ADD COLUMN IF NOT EXISTS hash_verificacao  TEXT;

COMMENT ON COLUMN empresa_compliance_docs.hash_verificacao IS
  'SHA-256 do snapshot impresso. Sem isto o PDF é irreproduzível e qualquer editor o recria.';
