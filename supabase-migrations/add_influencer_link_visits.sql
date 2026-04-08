-- Adicionar contador de visitas ao link do influenciador
ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS link_visits INTEGER NOT NULL DEFAULT 0;

-- Função RPC para incrementar de forma atômica (evita race conditions)
-- SECURITY DEFINER: roda com permissão do owner, não do chamador
-- Isso permite que usuários anônimos (visitantes da landing page) incrementem o contador
CREATE OR REPLACE FUNCTION increment_influencer_visits(p_token TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE influencers
  SET link_visits = link_visits + 1
  WHERE referral_token = p_token
    AND status = 'active';
$$;

-- Permitir que anon e authenticated chamem a função
GRANT EXECUTE ON FUNCTION increment_influencer_visits(TEXT) TO anon, authenticated;
