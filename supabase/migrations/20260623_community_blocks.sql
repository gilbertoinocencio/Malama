-- =====================================================
-- Malama — Bloqueio de usuários na comunidade
-- Exigência da App Store (Guideline 1.2): usuários precisam poder
-- bloquear outros usuários abusivos. O app esconde no cliente o conteúdo
-- de quem está na lista; esta tabela guarda os bloqueios por usuário.
-- Rodar no SQL Editor do Supabase (db push não é usado neste projeto).
-- =====================================================

CREATE TABLE IF NOT EXISTS community_blocks (
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT community_blocks_no_self CHECK (blocker_id <> blocked_id)
);

-- Lookup reverso eventual (quem me bloqueou) — opcional, barato.
CREATE INDEX IF NOT EXISTS idx_community_blocks_blocked ON community_blocks(blocked_id);

ALTER TABLE community_blocks ENABLE ROW LEVEL SECURITY;

-- O usuário só enxerga e gerencia os PRÓPRIOS bloqueios.
DROP POLICY IF EXISTS "Usuário vê seus próprios bloqueios" ON community_blocks;
CREATE POLICY "Usuário vê seus próprios bloqueios"
  ON community_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Usuário pode bloquear" ON community_blocks;
CREATE POLICY "Usuário pode bloquear"
  ON community_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Usuário pode desbloquear" ON community_blocks;
CREATE POLICY "Usuário pode desbloquear"
  ON community_blocks FOR DELETE
  USING (auth.uid() = blocker_id);
