-- Add objectives column to doctors table
-- Stores which patient goals the doctor serves (used for filtering in scheduling)
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS objectives text[] DEFAULT NULL;

-- Index to speed up array containment queries (@>)
CREATE INDEX IF NOT EXISTS idx_doctors_objectives ON doctors USING GIN (objectives);

COMMENT ON COLUMN doctors.objectives IS 'Patient goals the doctor serves: emagrecimento, performance_esportiva, saude_bem_estar';
