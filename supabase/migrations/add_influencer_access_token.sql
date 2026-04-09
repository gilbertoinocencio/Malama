-- =====================================================
-- NURA — Adicionar access_token para login automático do influencer
-- =====================================================

-- Adicionar coluna access_token na tabela influencers
ALTER TABLE public.influencers 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_influencers_access_token 
ON public.influencers(access_token);

-- Política para permitir leitura por token (página de convite)
CREATE POLICY "Permitir leitura de influencer por access_token"
ON public.influencers
FOR SELECT
TO anon
USING (access_token IS NOT NULL);

COMMENT ON COLUMN public.influencers.access_token IS 'Token único para login automático do influencer (gerado na criação)';
