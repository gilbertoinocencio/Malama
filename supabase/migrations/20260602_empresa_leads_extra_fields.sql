-- Campos adicionais no formulário da landing /empresas
ALTER TABLE empresa_leads
  ADD COLUMN IF NOT EXISTS cargo   TEXT,
  ADD COLUMN IF NOT EXISTS cnpj    TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT;
