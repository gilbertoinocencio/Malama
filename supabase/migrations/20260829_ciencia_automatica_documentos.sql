-- =====================================================
-- Malama — Ciência automática dos documentos no acesso ao painel
-- Migration: 20260829_ciencia_automatica_documentos.sql
--
-- Aplicar via SQL Editor, depois de 20260828.
--
-- DECISÃO DO PRODUTO
--   O aceite deixa de exigir clique: quem tem conta de RH está ciente por
--   força da contratação. O registro passa a ser gravado sozinho no primeiro
--   acesso ao painel enquanto o documento estiver vigente.
--
-- POR QUE O REGISTRO GANHA UMA COLUNA `modo`
--   Um aceite gravado sem ato do usuário não é a mesma coisa que um clique
--   em "li e aceito", e a trilha não pode fingir que é. Se um dia a empresa
--   disser que nunca concordou, a diferença entre as duas coisas é o centro
--   da discussão. Então o registro grava a verdade:
--     · 'automatico' — ciência registrada no acesso ao painel;
--     · 'explicito'  — alguém clicou, declarando nome e cargo.
--   Os dois carregam versão, data e o usuário autenticado. O explícito é
--   mais forte; o automático não deixa de existir por isso.
--
--   O caminho explícito continua disponível: se o RH aceitar formalmente um
--   documento que já tinha ciência automática, o registro é PROMOVIDO a
--   'explicito' com nome e cargo, mantendo a data original da ciência.
-- =====================================================

-- =====================================================
-- 1. COLUNA `modo`
-- =====================================================

ALTER TABLE empresa_aceites
  ADD COLUMN IF NOT EXISTS modo TEXT NOT NULL DEFAULT 'explicito'
    CHECK (modo IN ('explicito', 'automatico'));

-- Ciência automática não tem quem declare nome: cai para o dono da sessão.
ALTER TABLE empresa_aceites
  ADD COLUMN IF NOT EXISTS ciencia_em TIMESTAMPTZ;

COMMENT ON COLUMN empresa_aceites.modo IS
  'explicito = clique com nome/cargo declarados; automatico = ciência registrada no acesso ao painel';
COMMENT ON COLUMN empresa_aceites.ciencia_em IS
  'Quando a ciência automática foi registrada. Preservado se o aceite for promovido a explícito.';


-- =====================================================
-- 2. rh_registrar_ciencia()
--
-- Chamada pelo portal a cada carga. Insere o que falta e não faz nada
-- quando já está tudo registrado — que é o caso na esmagadora maioria das
-- chamadas.
--
-- Mesma regra de precedência de rh_documentos(): quando existe contrato
-- específico da empresa, é ele que vale, e a ciência é registrada nele, não
-- no documento geral do mesmo tipo.
-- =====================================================

DROP FUNCTION IF EXISTS rh_registrar_ciencia();

CREATE OR REPLACE FUNCTION rh_registrar_ciencia()
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_nome    TEXT;
  v_email   TEXT;
  v_n       INT;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = auth.uid();

  SELECT NULLIF(TRIM(p.display_name), '') INTO v_nome
    FROM profiles p WHERE p.id = auth.uid();

  v_nome := COALESCE(v_nome, split_part(v_email, '@', 1), 'Responsável pela conta');

  WITH aplicaveis AS (
    SELECT DISTINCT ON (d.tipo)
           d.id, d.tipo, d.versao,
           CASE WHEN d.empresa_id IS NOT NULL THEN 0 ELSE 1 END AS prio
      FROM documentos_legais d
     WHERE d.vigente
       AND d.exige_aceite
       AND (d.empresa_id IS NULL OR d.empresa_id = v_empresa)
     ORDER BY d.tipo, prio
  ),
  inseridos AS (
    INSERT INTO empresa_aceites
      (empresa_id, documento_id, aceito_por, nome, cargo, email, versao, modo, ciencia_em)
    SELECT v_empresa, a.id, auth.uid(), v_nome, NULL, v_email, a.versao, 'automatico', now()
      FROM aplicaveis a
     WHERE NOT EXISTS (
       SELECT 1 FROM empresa_aceites ea
        WHERE ea.empresa_id = v_empresa AND ea.documento_id = a.id
     )
    ON CONFLICT (empresa_id, documento_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_n FROM inseridos;

  RETURN jsonb_build_object('ok', true, 'registrados', v_n);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_registrar_ciencia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_registrar_ciencia() TO authenticated;


-- =====================================================
-- 3. rh_documentos() passa a devolver o modo
--
-- A tela precisa poder dizer "ciência registrada no acesso" em vez de
-- "aceito por Fulano", que seria mentira no caso automático.
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
  aceito_por_cargo TEXT,
  modo           TEXT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  ),
  aplicaveis AS (
    SELECT DISTINCT ON (d.tipo)
           d.id, d.tipo, d.versao, d.titulo, d.conteudo, d.url,
           d.exige_aceite, d.publicado_em,
           (d.empresa_id IS NOT NULL) AS especifico,
           CASE WHEN d.empresa_id IS NOT NULL THEN 0 ELSE 1 END AS prio
      FROM documentos_legais d
     WHERE d.vigente
       AND (d.empresa_id IS NULL OR d.empresa_id = (SELECT empresa_id FROM emp))
     ORDER BY d.tipo, prio
  )
  SELECT
    a.id, a.tipo, a.versao, a.titulo, a.conteudo, a.url,
    a.exige_aceite, a.publicado_em, a.especifico,
    COALESCE(ac.aceito_em, ac.ciencia_em), ac.nome, ac.cargo, ac.modo
  FROM aplicaveis a
  LEFT JOIN empresa_aceites ac
         ON ac.documento_id = a.id
        AND ac.empresa_id = (SELECT empresa_id FROM emp)
  ORDER BY a.exige_aceite DESC, a.titulo;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_documentos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_documentos() TO authenticated;


-- =====================================================
-- 4. Aceite explícito PROMOVE a ciência automática
--
-- Antes, um documento já registrado devolvia 'ja_aceito' e ia embora. Com
-- ciência automática isso tornaria o aceite formal impossível — todo
-- documento já estaria registrado. Agora o clique sobe o registro de
-- 'automatico' para 'explicito', grava nome e cargo declarados e carimba a
-- data do aceite, preservando a data da ciência original.
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
  v_atual   empresa_aceites%ROWTYPE;
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

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_atual
    FROM empresa_aceites
   WHERE empresa_id = v_empresa AND documento_id = v_doc.id;

  IF FOUND THEN
    IF v_atual.modo = 'explicito' THEN
      RETURN jsonb_build_object('ok', true, 'ja_aceito', true, 'aceito_em', v_atual.aceito_em);
    END IF;

    UPDATE empresa_aceites
       SET modo       = 'explicito',
           nome       = v_nome,
           cargo      = NULLIF(TRIM(COALESCE(p_cargo, '')), ''),
           email      = v_email,
           aceito_por = auth.uid(),
           aceito_em  = now(),
           ciencia_em = COALESCE(v_atual.ciencia_em, v_atual.aceito_em)
     WHERE id = v_atual.id;

    RETURN jsonb_build_object('ok', true, 'ja_aceito', false, 'promovido', true);
  END IF;

  INSERT INTO empresa_aceites
    (empresa_id, documento_id, aceito_por, nome, cargo, email, versao, modo)
  VALUES
    (v_empresa, v_doc.id, auth.uid(), v_nome,
     NULLIF(TRIM(COALESCE(p_cargo, '')), ''), v_email, v_doc.versao, 'explicito');

  RETURN jsonb_build_object('ok', true, 'ja_aceito', false, 'promovido', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_aceitar_documento(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_aceitar_documento(UUID, TEXT, TEXT) TO authenticated;
