-- A coluna target_fiber estava sendo buscada no SELECT do painel do médico
-- mas não existia na tabela, causando erro 400 e retornando profile = null.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_fiber INTEGER DEFAULT 25;
