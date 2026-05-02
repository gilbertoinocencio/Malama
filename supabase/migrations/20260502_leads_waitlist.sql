-- =====================================================
-- Leads de lista de espera — médicos e pacientes
-- =====================================================

-- Leads de médicos
CREATE TABLE IF NOT EXISTS doctor_leads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT        NOT NULL,
  crm          TEXT        NOT NULL,
  crm_uf       TEXT        NOT NULL,
  especialidade TEXT       NOT NULL,
  email        TEXT        NOT NULL,
  modalidade   TEXT        NOT NULL CHECK (modalidade IN ('online', 'presencial', 'hibrido')),
  origem       TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE doctor_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon insert doctor_leads"
  ON doctor_leads FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Auth read doctor_leads"
  ON doctor_leads FOR SELECT TO authenticated
  USING (true);

-- Leads de pacientes
CREATE TABLE IF NOT EXISTS patient_leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  objetivo   TEXT        NOT NULL CHECK (objetivo IN (
    'perda_peso', 'ganho_muscular', 'saude_longevidade',
    'condicao_clinica', 'acompanhamento_glp1', 'outro'
  )),
  origem     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE patient_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon insert patient_leads"
  ON patient_leads FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Auth read patient_leads"
  ON patient_leads FOR SELECT TO authenticated
  USING (true);
