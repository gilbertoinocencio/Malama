-- =====================================================================
-- Malama — Correção pós-teste E2E do delete-account
-- Migration: 20260713_delete_account_fix_profiles.sql
--
-- O teste E2E revelou que a FK profiles.id -> auth.users NÃO existe no
-- banco (um INSERT em profiles com UUID inexistente passa). Sem ela, o
-- deleteUser apaga o login mas deixa o profile (display_name = PII) e
-- todo o conteúdo de comunidade vivos.
--
-- Correção dupla:
--   1) Recria a FK com CASCADE (removendo profiles órfãos primeiro,
--      senão a validação da constraint falha).
--   2) A RPC finalize_account_deletion passa a apagar o profile
--      explicitamente — o fluxo de exclusão deixa de depender da FK.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Restaura profiles.id -> auth.users ON DELETE CASCADE
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_orphans INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public' AND t.relname = 'profiles'
      AND c.confrelid = 'auth.users'::regclass
  ) THEN
    -- Perfis órfãos (login já não existe) impedem a validação da FK.
    -- Apagá-los cascade-remove o conteúdo de comunidade deles — que é
    -- exatamente o destino decidido para contas excluídas.
    DELETE FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
    GET DIAGNOSTICS v_orphans = ROW_COUNT;
    RAISE NOTICE 'profiles órfãos removidos: %', v_orphans;

    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'FK profiles.id -> auth.users (CASCADE) recriada';
  ELSE
    RAISE NOTICE 'FK profiles -> auth.users já existe, nada a fazer';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) RPC apaga o profile explicitamente (defesa em profundidade)
--    Mesma assinatura, CREATE OR REPLACE é suficiente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_account_deletion(
  p_user_id    UUID,
  p_email      TEXT,
  p_email_hash TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancela consultas futuras (senão o médico comparece a uma sala vazia)
  UPDATE consultations
     SET status = 'cancelled'
   WHERE patient_id = p_user_id
     AND status = 'scheduled'
     AND scheduled_at > now();

  -- Snapshots históricos guardam display_name, avatar base64 e nascimento
  UPDATE profiles_history
     SET snapshot = (snapshot - 'display_name') - 'avatar_url' - 'date_of_birth'
   WHERE profile_id = p_user_id;

  -- Libera o assento B2B e anonimiza o email do vínculo.
  -- Casa por user_id E por email: cobre convite ainda não ativado.
  UPDATE empresa_colaboradores
     SET status      = 'removido',
         removido_em = COALESCE(removido_em, now()),
         email       = 'removido-' || id || '@anon.invalid'
   WHERE user_id = p_user_id
      OR lower(email) = lower(p_email);

  -- Persona RH (se a conta deletada for de RH)
  UPDATE rh_usuarios
     SET nome  = NULL,
         email = 'removido-' || id || '@anon.invalid'
   WHERE user_id = p_user_id;

  -- Apaga o perfil (PII) sem depender do cascade de auth.users — a FK
  -- esteve ausente no banco e o profile sobreviveu ao deleteUser no
  -- teste E2E. O cascade a partir de profiles leva a comunidade junto
  -- (posts, comments, likes, follows...), conforme decidido.
  DELETE FROM profiles WHERE id = p_user_id;

  -- Trilha de auditoria + chave de religação futura
  INSERT INTO account_deletions (user_id, email_hash)
  VALUES (p_user_id, p_email_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_account_deletion(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_account_deletion(UUID, TEXT, TEXT)
  TO service_role;
