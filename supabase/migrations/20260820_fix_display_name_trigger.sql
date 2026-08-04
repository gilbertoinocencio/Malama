-- =====================================================
-- Malama — Corrige display_name caindo no e-mail
--
-- handle_new_user() só olhava raw_user_meta_data->>'full_name'. Todo ponto
-- de escrita do app (signUpWithEmail, Apple Sign In, convite do RH em
-- invite-colaborador) grava a chave 'display_name', não 'full_name' — só o
-- OAuth do Google preenche 'full_name' automaticamente. Resultado: qualquer
-- usuário que entrou por convite/e-mail nascia com display_name = e-mail, e
-- só era corrigido se editasse o perfil manualmente depois.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.email
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: só toca perfis hoje travados no e-mail (display_name = email do
-- próprio usuário). Nomes já editados manualmente ficam intactos. Tenta
-- recuperar o nome real do metadata de auth.users antes de cair para a
-- parte local do e-mail (mesmo padrão já usado em 20260731_campanha_links.sql
-- e 20260803_corrige_duplicata_colaborador.sql).
UPDATE profiles p
SET display_name = COALESCE(
  NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
  NULLIF(TRIM(u.raw_user_meta_data->>'display_name'), ''),
  NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
  split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id
  AND p.display_name = u.email;
