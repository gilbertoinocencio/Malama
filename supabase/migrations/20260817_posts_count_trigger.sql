-- =====================================================
-- Malama — profiles.posts_count mantido por trigger
-- Migration: 20260817_posts_count_trigger.sql
--
-- A coluna existe desde 20260410_community_module.sql e é exibida no
-- perfil da comunidade, mas nada nunca a atualizou: os dois call sites
-- chamavam uma RPC `increment_posts_count` que não existe em migration
-- nenhuma (e ainda discordavam entre si no nome do parâmetro —
-- p_user_id vs user_id). Resultado: contador travado em 0 para todo
-- mundo, silenciosamente, porque supabase-js devolve o erro em vez de
-- lançar e ambos os call sites ignoravam.
--
-- Trigger em vez de RPC: posts são hard-deleted (communityService
-- .deletePost), então incrementar na criação sem decrementar na exclusão
-- deixaria o contador inflado. O trigger cobre os dois lados e não
-- depende do cliente lembrar de chamar.
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET posts_count = COALESCE(posts_count, 0) + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET posts_count = GREATEST(0, COALESCE(posts_count, 0) - 1)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_posts_count ON public.posts;
CREATE TRIGGER trg_sync_posts_count
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_posts_count();

-- Backfill: reconcilia o que ficou para trás desde 20260410.
UPDATE profiles p
SET posts_count = COALESCE(c.total, 0)
FROM (
  SELECT id AS profile_id,
         (SELECT COUNT(*) FROM posts WHERE posts.user_id = profiles.id) AS total
  FROM profiles
) c
WHERE p.id = c.profile_id
  AND COALESCE(p.posts_count, 0) IS DISTINCT FROM COALESCE(c.total, 0);
