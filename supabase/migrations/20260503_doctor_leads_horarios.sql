-- Substitui modalidade por horarios (array de turnos) em doctor_leads
ALTER TABLE doctor_leads
  DROP COLUMN IF EXISTS modalidade,
  ADD COLUMN IF NOT EXISTS horarios TEXT[] NOT NULL DEFAULT '{}';
