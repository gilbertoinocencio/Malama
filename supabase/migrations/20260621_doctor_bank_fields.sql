-- Adiciona dados bancários ao médico (banco, agência, conta)
-- além da chave PIX já existente.

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS bank_name    TEXT,
  ADD COLUMN IF NOT EXISTS bank_agency  TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT;
