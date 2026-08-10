-- =====================================================
-- Malama — Conserta "Database error saving new user" no cadastro
-- Migration: 20260822_fix_handle_new_user_search_path.sql
--
-- Aplicar via SQL Editor.
--
-- O QUE QUEBROU
-- 20260821_sincroniza_whatsapp_colaborador_perfil trocou handle_new_user() por
-- uma versão que lê `empresa_colaboradores` SEM qualificar o schema, e a função
-- não declara `SET search_path`. SECURITY DEFINER não muda o search_path: quem
-- resolve o nome é a sessão que disparou o trigger, e o INSERT em auth.users vem
-- do supabase_auth_admin (GoTrue), cujo search_path não inclui `public`.
-- Resultado: `relation "empresa_colaboradores" does not exist`. O handler só
-- captura unique_violation, então o erro subiu e o GoTrue devolveu 500
-- "Database error saving new user" — em TODO cadastro novo, do app inteiro.
--
-- Bate com os dados: o último usuário criado em auth.users é de 03/08/2026
-- 22:18, minutos depois do commit que introduziu essa versão. Sete dias sem
-- nenhuma conta nova.
--
-- O QUE MUDA
-- 1. `SET search_path = public` + nomes qualificados (public.*), como já fazem
--    as funções de 20260815_security_hardening.
-- 2. A busca do WhatsApp vira best-effort num bloco próprio. Copiar o WhatsApp
--    que o RH digitou é conveniência; nunca pode ser motivo para impedir alguém
--    de criar conta. Essa era a falha de fundo — não só o schema faltando.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_whatsapp text;
BEGIN
  -- Best-effort: qualquer falha aqui é ignorada, o cadastro segue sem WhatsApp.
  BEGIN
    SELECT ec.whatsapp INTO v_whatsapp
    FROM public.empresa_colaboradores ec
    WHERE ec.email = NEW.email
      AND ec.status <> 'removido'
      AND ec.whatsapp IS NOT NULL
    ORDER BY ec.data_adicao DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_whatsapp := NULL;
  END;

  INSERT INTO public.profiles (id, display_name, avatar_url, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.email
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    v_whatsapp
  );

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria o profile do usuário recém-registrado. SECURITY DEFINER com search_path fixo: roda sob o supabase_auth_admin, que não enxerga public por padrão.';
