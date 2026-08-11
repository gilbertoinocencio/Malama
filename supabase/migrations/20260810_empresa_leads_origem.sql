-- =====================================================
-- Malama — origem do lead da landing B2B
--
-- Nasceu com a segunda landing (/empresas/saude-mental). Sem esta coluna
-- os dois públicos chegam misturados na mesma caixa, e são conversas
-- comerciais diferentes: "quero cuidar do metabolismo do time" (redução de
-- sinistralidade) vs. "preciso cumprir a NR-1" (conformidade e prazo legal).
--
-- Nullable de propósito: os leads que já entraram antes desta migração não
-- têm origem conhecida, e inventar uma seria pior do que deixar em branco.
-- =====================================================

ALTER TABLE empresa_leads
  ADD COLUMN IF NOT EXISTS origem TEXT;

-- Restringe aos valores que o front realmente envia. NULL continua válido
-- (histórico anterior à coluna).
ALTER TABLE empresa_leads
  DROP CONSTRAINT IF EXISTS empresa_leads_origem_check;

ALTER TABLE empresa_leads
  ADD CONSTRAINT empresa_leads_origem_check
  CHECK (origem IS NULL OR origem IN ('metabolico', 'mental'));

COMMENT ON COLUMN empresa_leads.origem IS
  'Landing de onde veio o lead: metabolico (/empresas) ou mental (/empresas/saude-mental). NULL = anterior à coluna.';
