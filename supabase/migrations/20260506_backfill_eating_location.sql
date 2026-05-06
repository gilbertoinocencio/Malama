-- Backfill: preenche eating_location = 'casa' para perfis que completaram
-- o onboarding mas ficaram com o campo nulo (o valor 'casa' era o default visual
-- do step, mas não era persistido quando o usuário não clicava explicitamente).
-- Só afeta quem já completou onboarding e tem height + weight preenchidos.

UPDATE public.profiles
SET eating_location = 'casa'
WHERE onboarding_completed = true
  AND eating_location IS NULL
  AND weight IS NOT NULL
  AND height IS NOT NULL;
