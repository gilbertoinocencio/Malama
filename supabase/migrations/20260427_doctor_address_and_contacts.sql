-- Adiciona campos de CPF, telefone e endereço à tabela doctors
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS cpf              TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS address_zip      TEXT,
  ADD COLUMN IF NOT EXISTS address_street   TEXT,
  ADD COLUMN IF NOT EXISTS address_number   TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city     TEXT,
  ADD COLUMN IF NOT EXISTS address_state    TEXT;
