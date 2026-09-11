-- =====================================================
-- Malama — Cargo do responsável pela conta em `empresas`
-- Migration: 20260913_empresa_responsavel_cargo.sql
--
-- Aplicar via SQL Editor.
--
-- POR QUÊ: "Cargo do responsável" já existia no formulário de criação do
-- admin, mas só alimentava `rh_usuarios.cargo` (a conta de login, usada no
-- aceite dos Termos) — não havia coluna em `empresas`, então o dado nunca
-- podia ser revisto ou corrigido depois. O comentário no admin dizia
-- literalmente "não existe em edição". Esta migration cria o lugar.
--
-- Agora o cargo acompanha nome/e-mail/telefone do responsável: editável
-- pelo próprio RH em /rh/empresa (mesma RPC de contato) e pelo admin, na
-- criação e na edição.
-- =====================================================

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS responsavel_cargo TEXT;

COMMENT ON COLUMN public.empresas.responsavel_cargo IS
  'Cargo do responsável pela conta. Editável pelo RH (rh_atualizar_contato) e pelo admin.';


-- ── rh_empresa_perfil(): passa a trazer o cargo ───────────────────────────

DROP FUNCTION IF EXISTS public.rh_empresa_perfil();

CREATE OR REPLACE FUNCTION public.rh_empresa_perfil()
RETURNS JSONB AS $$
  SELECT to_jsonb(x) FROM (
    SELECT
      e.id,
      e.nome,
      e.cnpj,
      e.responsavel_nome,
      e.responsavel_cargo,
      e.responsavel_email,
      e.responsavel_telefone,
      e.status,
      e.data_inicio,
      e.max_assentos,
      e.modo_mental,
      e.modo_metabolico
    FROM public.empresas e
    WHERE e.id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid())
    LIMIT 1
  ) x;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.rh_empresa_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_empresa_perfil() TO authenticated;


-- ── rh_atualizar_contato(): ganha p_cargo ──────────────────────────────────
-- Assinatura muda (3 -> 4 params): DROP explícito da anterior, convenção
-- do projeto para função com assinatura diferente.

DROP FUNCTION IF EXISTS public.rh_atualizar_contato(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.rh_atualizar_contato(
  p_nome     TEXT,
  p_email    TEXT,
  p_telefone TEXT,
  p_cargo    TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_nome    TEXT := NULLIF(TRIM(COALESCE(p_nome, '')), '');
  v_email   TEXT := NULLIF(lower(TRIM(COALESCE(p_email, ''))), '');
  v_tel     TEXT := NULLIF(TRIM(COALESCE(p_telefone, '')), '');
  v_cargo   TEXT := NULLIF(TRIM(COALESCE(p_cargo, '')), '');
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM public.rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'E-mail do responsável inválido');
  END IF;

  UPDATE public.empresas
     SET responsavel_nome     = v_nome,
         responsavel_email    = v_email,
         responsavel_telefone = v_tel,
         responsavel_cargo    = v_cargo
   WHERE id = v_empresa;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rh_atualizar_contato(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_atualizar_contato(TEXT, TEXT, TEXT, TEXT) TO authenticated;
