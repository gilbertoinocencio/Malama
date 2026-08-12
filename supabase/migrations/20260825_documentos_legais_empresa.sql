-- =====================================================
-- Malama — Documentos legais da empresa e registro de aceite
-- Migration: 20260825_documentos_legais_empresa.sql
--
-- Aplicar via SQL Editor.
--
-- O PROBLEMA
--   O produto tinha UM documento — os Termos de Uso B2C, escritos para o
--   paciente ("você", refeições, GLP-1, Body Scan). Não existia termo da
--   empresa contratante, não existia acordo de tratamento de dados, e não
--   existia registro de aceite de coisa nenhuma: nenhuma tabela, nenhuma
--   coluna, nenhuma data. Ninguém nunca aceitou nada de forma comprovável.
--
--   Isso pesa mais aqui do que num SaaS comum: a Malama trata dado de SAÚDE
--   de colaborador POR CONTA da empresa. Nessa relação a empresa é
--   controladora e a Malama operadora (LGPD art. 39), e o acordo que
--   descreve finalidade, piso de coorte, o que o RH nunca vê,
--   subprocessadores, retenção e resposta a incidente é o documento que o
--   jurídico do cliente pede antes de assinar.
--
-- DUAS TABELAS, DE PROPÓSITO
--   `documentos_legais` é o catálogo VERSIONADO. `empresa_aceites` é o
--   registro de quem aceitou o quê. Separadas porque o mesmo documento vale
--   para muitas empresas, e porque publicar uma versão nova não pode apagar
--   a prova de que a anterior foi aceita.
--
-- O QUE NÃO É COLETADO
--   Sem IP e sem user-agent no aceite. O que identifica quem aceitou é a
--   conta autenticada mais o nome e o cargo declarados no ato — e isso já é
--   o necessário. Guardar IP acrescentaria dado pessoal a uma trilha que
--   convive com a base de saúde sem melhorar a prova.
-- =====================================================

-- =====================================================
-- 1. CATÁLOGO DE DOCUMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS documentos_legais (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = documento da plataforma, vale para todas as empresas.
  -- Preenchido = contrato negociado com AQUELA empresa, que se sobrepõe ao
  -- documento geral do mesmo tipo.
  empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE,

  tipo          TEXT NOT NULL CHECK (tipo IN (
                  'termos_b2b',        -- contrato de adesão / termos da contratante
                  'tratamento_dados',  -- operadora x controladora (LGPD art. 39)
                  'privacidade'        -- política de privacidade vigente
                )),

  versao        TEXT NOT NULL CHECK (length(trim(versao)) > 0),
  titulo        TEXT NOT NULL CHECK (length(trim(titulo)) > 0),

  -- Texto puro. A tela renderiza com whitespace-pre-wrap: sem HTML, sem
  -- markdown, sem dependência nova e sem superfície de injeção numa página
  -- que exibe conteúdo vindo do banco.
  conteudo      TEXT,
  -- Alternativa ao texto: documento que já vive numa página pública.
  url           TEXT,

  -- Documento informativo (a política de privacidade, por exemplo) aparece
  -- para leitura mas não pede assinatura.
  exige_aceite  BOOLEAN NOT NULL DEFAULT TRUE,

  -- Rascunho não aparece para o RH. É o que impede um texto ainda não
  -- revisado pelo jurídico de ser assinado por engano.
  vigente       BOOLEAN NOT NULL DEFAULT FALSE,
  publicado_em  DATE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (conteudo IS NOT NULL OR url IS NOT NULL)
);

-- Um único documento vigente por tipo em cada escopo. Sem isto, publicar a
-- versão nova sem baixar a antiga deixaria duas valendo ao mesmo tempo — e
-- o RH assinaria a que aparecesse primeiro.
CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_vigente_geral
  ON documentos_legais(tipo) WHERE vigente AND empresa_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_vigente_empresa
  ON documentos_legais(tipo, empresa_id) WHERE vigente AND empresa_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_documentos_legais_updated_at ON documentos_legais;
CREATE TRIGGER update_documentos_legais_updated_at
  BEFORE UPDATE ON documentos_legais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE documentos_legais ENABLE ROW LEVEL SECURITY;

-- Publicar/versionar é ato da Malama, não do cliente.
DROP POLICY IF EXISTS "super_admin all documentos" ON documentos_legais;
CREATE POLICY "super_admin all documentos"
  ON documentos_legais FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads documentos aplicaveis" ON documentos_legais;
CREATE POLICY "rh reads documentos aplicaveis"
  ON documentos_legais FOR SELECT TO authenticated
  USING (
    vigente
    AND (
      empresa_id IS NULL
      OR empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
    )
  );


-- =====================================================
-- 2. REGISTRO DE ACEITE
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_aceites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  -- RESTRICT: documento com aceite registrado não pode ser apagado. A prova
  -- precisa continuar apontando para o texto exato que foi assinado.
  documento_id  UUID NOT NULL REFERENCES documentos_legais(id) ON DELETE RESTRICT,

  aceito_por    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Snapshots: o aceite continua legível mesmo se a conta for removida ou
  -- se a pessoa mudar de cargo depois.
  nome          TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  cargo         TEXT,
  email         TEXT,
  versao        TEXT NOT NULL,

  aceito_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma assinatura por versão. Versão nova é OUTRA linha em
  -- documentos_legais, e portanto outro aceite.
  UNIQUE (empresa_id, documento_id)
);

CREATE INDEX IF NOT EXISTS idx_empresa_aceites_empresa
  ON empresa_aceites(empresa_id, aceito_em DESC);

ALTER TABLE empresa_aceites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all aceites" ON empresa_aceites;
CREATE POLICY "super_admin all aceites"
  ON empresa_aceites FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own aceites" ON empresa_aceites;
CREATE POLICY "rh reads own aceites"
  ON empresa_aceites FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- Sem policy de escrita: aceite só pela RPC, que carimba a versão e o autor
-- a partir da sessão. Aceite que o cliente pudesse escrever direto não seria
-- prova de nada.


-- =====================================================
-- 3. SEED
--
-- A política de privacidade já existe e é pública: entra vigente, como
-- leitura, apontando para a página.
--
-- Os dois documentos que faltam entram como RASCUNHO (vigente = FALSE) com
-- o texto por escrever. Publicar é trocar para TRUE depois que o jurídico
-- entregar o texto — enquanto isso eles não aparecem para o RH, que é o
-- comportamento correto: melhor não ter documento do que ter um placeholder
-- assinado como se fosse contrato.
--
--   UPDATE documentos_legais
--      SET conteudo = '<texto revisado>', vigente = TRUE, publicado_em = CURRENT_DATE
--    WHERE tipo = 'termos_b2b' AND empresa_id IS NULL;
-- =====================================================

INSERT INTO documentos_legais (tipo, versao, titulo, url, exige_aceite, vigente, publicado_em)
SELECT 'privacidade', '2026-07-21', 'Política de Privacidade', '/privacidade', FALSE, TRUE, DATE '2026-07-21'
WHERE NOT EXISTS (
  SELECT 1 FROM documentos_legais WHERE tipo = 'privacidade' AND empresa_id IS NULL
);

INSERT INTO documentos_legais (tipo, versao, titulo, conteudo, exige_aceite, vigente)
SELECT 'termos_b2b', '1.0', 'Termos de Uso — Empresa Contratante',
       'Rascunho. Texto pendente de redação e revisão jurídica.',
       TRUE, FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM documentos_legais WHERE tipo = 'termos_b2b' AND empresa_id IS NULL
);

INSERT INTO documentos_legais (tipo, versao, titulo, conteudo, exige_aceite, vigente)
SELECT 'tratamento_dados', '1.0', 'Acordo de Tratamento de Dados Pessoais',
       'Rascunho. Texto pendente de redação e revisão jurídica.',
       TRUE, FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM documentos_legais WHERE tipo = 'tratamento_dados' AND empresa_id IS NULL
);


-- =====================================================
-- 4. rh_empresa_perfil()
--
-- Dados cadastrais completos para a área da empresa. `getMyEmpresa()` não
-- serve: ela não traz e-mail nem telefone do responsável, que são
-- justamente os campos que o RH precisa poder corrigir.
-- =====================================================

DROP FUNCTION IF EXISTS rh_empresa_perfil();

CREATE OR REPLACE FUNCTION rh_empresa_perfil()
RETURNS JSONB AS $$
  SELECT to_jsonb(x) FROM (
    SELECT
      e.id,
      e.nome,
      e.cnpj,
      e.responsavel_nome,
      e.responsavel_email,
      e.responsavel_telefone,
      e.status,
      e.data_inicio,
      e.max_assentos,
      e.modo_mental,
      e.modo_metabolico
    FROM empresas e
    WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
    LIMIT 1
  ) x;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_empresa_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_empresa_perfil() TO authenticated;


-- =====================================================
-- 5. rh_atualizar_contato(nome, email, telefone)
--
-- O RH corrige o contato do responsável, e SÓ isso. Nome da empresa, CNPJ,
-- assentos, preço, status e data de início são termos comerciais: quem
-- muda é o admin da Malama. Uma policy de UPDATE em `empresas` deixaria o
-- cliente editar o próprio limite de assentos.
-- =====================================================

DROP FUNCTION IF EXISTS rh_atualizar_contato(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION rh_atualizar_contato(
  p_nome     TEXT,
  p_email    TEXT,
  p_telefone TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_nome    TEXT := NULLIF(TRIM(COALESCE(p_nome, '')), '');
  v_email   TEXT := NULLIF(lower(TRIM(COALESCE(p_email, ''))), '');
  v_tel     TEXT := NULLIF(TRIM(COALESCE(p_telefone, '')), '');
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'E-mail do responsável inválido');
  END IF;

  UPDATE empresas
     SET responsavel_nome     = v_nome,
         responsavel_email    = v_email,
         responsavel_telefone = v_tel
   WHERE id = v_empresa;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_atualizar_contato(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_atualizar_contato(TEXT, TEXT, TEXT) TO authenticated;


-- =====================================================
-- 6. rh_documentos()
--
-- Documentos vigentes aplicáveis à empresa, com o aceite se houver. Quando
-- existe versão negociada com a empresa, ela ESCONDE a geral do mesmo tipo
-- (DISTINCT ON com o específico na frente) — senão o RH veria dois
-- contratos e não saberia qual vale.
-- =====================================================

DROP FUNCTION IF EXISTS rh_documentos();

CREATE OR REPLACE FUNCTION rh_documentos()
RETURNS TABLE (
  id             UUID,
  tipo           TEXT,
  versao         TEXT,
  titulo         TEXT,
  conteudo       TEXT,
  url            TEXT,
  exige_aceite   BOOLEAN,
  publicado_em   DATE,
  especifico     BOOLEAN,
  aceito_em      TIMESTAMPTZ,
  aceito_por_nome  TEXT,
  aceito_por_cargo TEXT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  ),
  aplicaveis AS (
    SELECT DISTINCT ON (d.tipo)
           d.id, d.tipo, d.versao, d.titulo, d.conteudo, d.url,
           d.exige_aceite, d.publicado_em,
           (d.empresa_id IS NOT NULL) AS especifico,
           -- 0 = contrato da própria empresa, 1 = documento da plataforma.
           CASE WHEN d.empresa_id IS NOT NULL THEN 0 ELSE 1 END AS prio
      FROM documentos_legais d
     WHERE d.vigente
       AND (d.empresa_id IS NULL OR d.empresa_id = (SELECT empresa_id FROM emp))
     ORDER BY d.tipo, prio
  )
  SELECT
    a.id, a.tipo, a.versao, a.titulo, a.conteudo, a.url,
    a.exige_aceite, a.publicado_em, a.especifico,
    ac.aceito_em, ac.nome, ac.cargo
  FROM aplicaveis a
  LEFT JOIN empresa_aceites ac
         ON ac.documento_id = a.id
        AND ac.empresa_id = (SELECT empresa_id FROM emp)
  ORDER BY a.exige_aceite DESC, a.titulo;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_documentos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_documentos() TO authenticated;


-- =====================================================
-- 7. rh_aceitar_documento(documento_id, nome, cargo)
--
-- A versão gravada no aceite vem do BANCO, nunca do cliente: é o que faz o
-- registro dizer qual texto exato foi aceito.
--
-- Nome e cargo são declarados no ato de propósito. Quem opera o portal nem
-- sempre é quem tem poderes para obrigar a empresa, e o registro precisa
-- refletir quem de fato assinou, não só qual login estava aberto.
-- =====================================================

DROP FUNCTION IF EXISTS rh_aceitar_documento(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION rh_aceitar_documento(
  p_documento_id UUID,
  p_nome         TEXT,
  p_cargo        TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_doc     documentos_legais%ROWTYPE;
  v_nome    TEXT := NULLIF(TRIM(COALESCE(p_nome, '')), '');
  v_email   TEXT;
  v_ja      TIMESTAMPTZ;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF v_nome IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o nome de quem está aceitando');
  END IF;

  SELECT * INTO v_doc FROM documentos_legais WHERE id = p_documento_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Documento não encontrado');
  END IF;

  IF NOT v_doc.vigente THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este documento não está vigente');
  END IF;

  IF NOT v_doc.exige_aceite THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este documento é informativo e não exige aceite');
  END IF;

  IF v_doc.empresa_id IS NOT NULL AND v_doc.empresa_id <> v_empresa THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Documento de outra empresa');
  END IF;

  SELECT aceito_em INTO v_ja
    FROM empresa_aceites
   WHERE empresa_id = v_empresa AND documento_id = v_doc.id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'ja_aceito', true, 'aceito_em', v_ja);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO empresa_aceites
    (empresa_id, documento_id, aceito_por, nome, cargo, email, versao)
  VALUES
    (v_empresa, v_doc.id, auth.uid(), v_nome,
     NULLIF(TRIM(COALESCE(p_cargo, '')), ''), v_email, v_doc.versao);

  RETURN jsonb_build_object('ok', true, 'ja_aceito', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_aceitar_documento(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_aceitar_documento(UUID, TEXT, TEXT) TO authenticated;
