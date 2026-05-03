-- Adiciona status e invited_at nas tabelas de leads
ALTER TABLE doctor_leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'convidado')),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE patient_leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'convidado')),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
