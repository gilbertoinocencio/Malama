-- ================================================================
-- MIGRATION: community_module_v1
-- Módulo de Comunidade completo — 12 funcionalidades
-- ================================================================

-- ----------------------------------------------------------------
-- 1. REACTIONS TABLE (substitui semântica de likes para novos posts)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart','fire','muscle','clap','hug')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS reactions_post_id_idx ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS reactions_user_id_idx ON public.reactions(user_id);

-- ----------------------------------------------------------------
-- 2. THREADING: adicionar parent_id e mentions à tabela comments
-- ----------------------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mentions  TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- ----------------------------------------------------------------
-- 3. BADGES TABLE (definições)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  emoji       TEXT,
  color_hex   TEXT DEFAULT '#2ECC71',
  is_manual   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.badges (code, label, description, emoji, color_hex, is_manual) VALUES
  ('iniciante',    'Iniciante',       'Primeiros 30 dias na plataforma',         '🌱', '#A8D5A2', false),
  ('em_chama',     'Em Chama',        '3 posts por semana durante 4 semanas',    '🔥', '#FF6B35', false),
  ('consistente',  'Consistente',     '3 meses ativo na comunidade',             '💎', '#4ECDC4', false),
  ('transformacao','Transformação',   'Registrou perda de 10kg ou mais',         '⚡', '#FFD700', false),
  ('embaixador',   'Embaixador Nura', 'Concedido manualmente pela equipe Nura',  '👑', '#6C63FF', true),
  ('medico_nura',  'Médico Nura',     'Profissional de saúde verificado',        '🩺', '#2ECC71', true)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. USER_BADGES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES auth.users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_featured BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges(user_id);

-- ----------------------------------------------------------------
-- 5. COMMUNITY_NOTIFICATIONS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN (
                 'comment','reply','reaction','milestone','spotlight',
                 'new_follower','doctor_broadcast','badge_earned')),
  post_id      UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  data         JSONB DEFAULT '{}',
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comm_notif_recipient_idx
  ON public.community_notifications(recipient_id, is_read, created_at DESC);

-- ----------------------------------------------------------------
-- 6. NOTIFICATION_PREFERENCES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  on_comment          BOOLEAN DEFAULT true,
  on_reply            BOOLEAN DEFAULT true,
  on_reaction         BOOLEAN DEFAULT true,
  on_milestone        BOOLEAN DEFAULT true,
  on_spotlight        BOOLEAN DEFAULT true,
  on_new_follower     BOOLEAN DEFAULT true,
  on_doctor_broadcast BOOLEAN DEFAULT true,
  on_badge_earned     BOOLEAN DEFAULT true,
  milestone_opt_out   BOOLEAN DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 7. POST_REPORTS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN ('spam','inappropriate','harassment','misinformation')),
  detail      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS post_reports_post_id_idx ON public.post_reports(post_id, status);
CREATE INDEX IF NOT EXISTS post_reports_status_idx  ON public.post_reports(status, created_at DESC);

-- ----------------------------------------------------------------
-- 8. WEEKLY_SPOTLIGHT TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_spotlight (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  pinned_until TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start)
);

-- ----------------------------------------------------------------
-- 9. MILESTONES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
                   'first_day','one_week','one_month','first_kg','every_5kg','badge_earned')),
  data           JSONB DEFAULT '{}',
  post_id        UUID REFERENCES public.posts(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS milestones_user_id_idx ON public.milestones(user_id, created_at DESC);

-- ----------------------------------------------------------------
-- 10. MODIFICAÇÕES EM TABELAS EXISTENTES
-- ----------------------------------------------------------------

-- posts: novos campos para comunidade
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS report_count   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_hidden      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reason  TEXT,
  ADD COLUMN IF NOT EXISTS media_urls     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url      TEXT,
  ADD COLUMN IF NOT EXISTS video_status   TEXT DEFAULT 'ready'
    CHECK (video_status IN ('processing','ready','failed')),
  ADD COLUMN IF NOT EXISTS is_system_post BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned      BOOLEAN DEFAULT false;

-- profiles: campos de comunidade
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_alias   TEXT,
  ADD COLUMN IF NOT EXISTS is_private        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_opt_out BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS followers_count   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count       INT DEFAULT 0;

-- Índice FTS para busca em posts
CREATE INDEX IF NOT EXISTS posts_fts_idx ON public.posts
  USING gin(to_tsvector('portuguese',
    coalesce(caption,'') || ' ' || coalesce(content::text,'')
  ));

-- ----------------------------------------------------------------
-- 11. RPC FUNCTIONS
-- ----------------------------------------------------------------

-- Upsert de reação (insert ou troca de tipo)
CREATE OR REPLACE FUNCTION public.upsert_reaction(
  p_post_id       UUID,
  p_user_id       UUID,
  p_reaction_type TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.reactions(post_id, user_id, reaction_type)
  VALUES (p_post_id, p_user_id, p_reaction_type)
  ON CONFLICT (post_id, user_id)
  DO UPDATE SET reaction_type = EXCLUDED.reaction_type;
END;
$$;

-- Remoção de reação
CREATE OR REPLACE FUNCTION public.remove_reaction(
  p_post_id UUID,
  p_user_id UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.reactions WHERE post_id = p_post_id AND user_id = p_user_id;
END;
$$;

-- Denúncia com auto-ocultação ao atingir 3 reports
CREATE OR REPLACE FUNCTION public.report_post_fn(
  p_post_id   UUID,
  p_user_id   UUID,
  p_reason    TEXT,
  p_detail    TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.post_reports(post_id, reporter_id, reason, detail)
  VALUES (p_post_id, p_user_id, p_reason, p_detail)
  ON CONFLICT (post_id, reporter_id) DO NOTHING;

  UPDATE public.posts
    SET report_count = report_count + 1
    WHERE id = p_post_id;

  SELECT report_count INTO v_count FROM public.posts WHERE id = p_post_id;
  IF v_count >= 3 THEN
    UPDATE public.posts
      SET is_hidden = true, hidden_reason = 'reports'
      WHERE id = p_post_id;
  END IF;
END;
$$;

-- Follow atômico com atualização de contadores
CREATE OR REPLACE FUNCTION public.follow_user_fn(
  p_follower  UUID,
  p_following UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.follows(follower_id, following_id)
  VALUES (p_follower, p_following)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = p_follower;
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = p_following;
END;
$$;

-- Unfollow atômico
CREATE OR REPLACE FUNCTION public.unfollow_user_fn(
  p_follower  UUID,
  p_following UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.follows
    WHERE follower_id = p_follower AND following_id = p_following;

  UPDATE public.profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = p_follower;
  UPDATE public.profiles
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = p_following;
END;
$$;

-- ----------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- ----------------------------------------------------------------

ALTER TABLE public.reactions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_spotlight        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges                  ENABLE ROW LEVEL SECURITY;

-- Reactions: qualquer autenticado lê; só o dono escreve
CREATE POLICY "reactions_select" ON public.reactions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "reactions_insert" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_update" ON public.reactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications: só o destinatário
CREATE POLICY "comm_notif_all" ON public.community_notifications
  FOR ALL USING (auth.uid() = recipient_id);

-- Preferences: só o próprio
CREATE POLICY "notif_pref_all" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Reports: autenticado insere; só o próprio lê
CREATE POLICY "reports_insert" ON public.post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select" ON public.post_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Badges: leitura pública
CREATE POLICY "badges_select" ON public.badges
  FOR SELECT USING (true);

-- User badges: leitura pública; escrita via SECURITY DEFINER fn
CREATE POLICY "user_badges_select" ON public.user_badges
  FOR SELECT USING (true);
CREATE POLICY "user_badges_update_featured" ON public.user_badges
  FOR UPDATE USING (auth.uid() = user_id);

-- Milestones: só o próprio
CREATE POLICY "milestones_all" ON public.milestones
  FOR ALL USING (auth.uid() = user_id);

-- Spotlight: leitura pública
CREATE POLICY "spotlight_select" ON public.weekly_spotlight
  FOR SELECT USING (true);
