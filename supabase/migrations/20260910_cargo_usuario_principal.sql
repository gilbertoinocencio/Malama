-- =====================================================
-- Malama — Cargo do usuário principal, capturado na criação da conta
-- Migration: 20260910_cargo_usuario_principal.sql
--
-- Aplicar via SQL Editor.
--
-- POR QUE
--   O passo de aceite dos Termos (migration 20260908) tinha campos de nome
--   e cargo para o usuário principal preencher no primeiro acesso. Só que
--   quem cria essa conta é o admin da Malama, e ele já sabe quem é o
--   responsável e qual o cargo dele — é informação da venda, coletada uma
--   vez. Pedir de novo no onboarding não reforça a prova (a conta já
--   identifica quem é, pelo e-mail de login); só repete um campo que o
--   produto já tinha em outro ponto do cadastro e não aproveitava.
--
--   Esta migration é o lado do cadastro: `rh_usuarios` passa a guardar o
--   cargo, capturado por `create-rh-user` no momento em que a conta nasce.
--   `rh_meu_acesso()` passa a devolvê-lo, para o onboarding usar sem
--   perguntar de novo.
-- =====================================================

ALTER TABLE rh_usuarios ADD COLUMN IF NOT EXISTS cargo TEXT;

COMMENT ON COLUMN rh_usuarios.cargo IS
  'Cargo do usuário principal, capturado pelo admin da Malama na criação da conta (create-rh-user). Alimenta o aceite dos Termos no onboarding sem pedir de novo.';

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
    'cargo', v_rh.cargo,
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
