-- =====================================================
-- Malama — Anamnese psicológica, contato de emergência e protocolo de crise
-- Migration: 20260804_anamnese_e_crise.sql
--
-- Aplicar via SQL Editor, depois de 20260803_prontuario_psicologico.
--
-- POR QUE A ANAMNESE NÃO SEGUE A REGRA DO PRONTUÁRIO
-- psychology_notes é escopo do autor: evolução de sessão não sai de lá. A
-- anamnese é o oposto — é história factual (diagnósticos, medicação, terapia
-- anterior) e precisa ser lida por QUALQUER psicólogo que atenda o paciente.
-- Se ela ficasse restrita ao autor, a troca de profissional obrigaria a
-- pessoa a recontar tudo, que é exatamente o problema que a passagem de
-- bastão existe para resolver.
--
-- Uma anamnese por paciente, atualizável por qualquer psicólogo que o atenda.
-- =====================================================


-- =====================================================
-- 1. ANAMNESE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.psychology_intake (
  patient_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  queixa_inicial            TEXT,
  diagnosticos_previos      TEXT,
  medicacoes_psiquiatricas  TEXT,
  psicoterapia_anterior     TEXT,
  historico_familiar        TEXT,
  uso_substancias           TEXT,
  rede_apoio                TEXT,

  -- Histórico de risco. Campo separado e explícito porque muda conduta desde
  -- a primeira sessão — não pode ficar diluído em texto livre.
  historico_tentativa       BOOLEAN,
  historico_tentativa_obs   TEXT,

  preenchido_por            UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  atualizado_por            UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_psychology_intake_updated_at ON public.psychology_intake;
CREATE TRIGGER update_psychology_intake_updated_at
  BEFORE UPDATE ON public.psychology_intake
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.psychology_intake ENABLE ROW LEVEL SECURITY;

-- Qualquer psicólogo que atende o paciente lê e escreve. O médico não.
DROP POLICY IF EXISTS "psychology_intake_psi" ON public.psychology_intake;
CREATE POLICY "psychology_intake_psi"
  ON public.psychology_intake FOR ALL TO authenticated
  USING (psicologo_atende_paciente(psychology_intake.patient_id))
  WITH CHECK (psicologo_atende_paciente(psychology_intake.patient_id));


-- =====================================================
-- 2. CONTATO DE EMERGÊNCIA
--
-- Fica em profiles, preenchido pelo paciente. O psicólogo NÃO lê profiles
-- (20260802), então o acesso é por RPC dedicada — e dedicada de propósito:
-- revelar o contato tem que ser um ato deliberado na tela, não um dado
-- ambiente que fica exposto em toda consulta.
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome     TEXT,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone TEXT,
  ADD COLUMN IF NOT EXISTS contato_emergencia_relacao  TEXT;

COMMENT ON COLUMN public.profiles.contato_emergencia_nome IS
  'Contato de emergência informado pelo paciente. Acionado por decisão clínica do profissional em caso de risco grave — nunca automaticamente pelo sistema.';

DROP FUNCTION IF EXISTS psi_contato_emergencia(UUID);

CREATE OR REPLACE FUNCTION psi_contato_emergencia(p_patient_id UUID)
RETURNS JSONB AS $$
  SELECT CASE
    WHEN NOT psicologo_atende_paciente(p_patient_id) THEN NULL
    ELSE (
      SELECT jsonb_build_object(
        'nome',     p.contato_emergencia_nome,
        'telefone', p.contato_emergencia_telefone,
        'relacao',  p.contato_emergencia_relacao
      )
      FROM public.profiles p WHERE p.id = p_patient_id
    )
  END;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION psi_contato_emergencia(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION psi_contato_emergencia(UUID) TO authenticated;


-- =====================================================
-- 3. PROTOCOLO DE CRISE
--
-- O sistema NÃO aciona ninguém. Quebra de sigilo por risco grave à vida é
-- decisão clínica do psicólogo, tomada por julgamento — automatizar isso por
-- gatilho de software transformaria um falso positivo em quebra indevida.
--
-- O que o sistema faz: dá o contato à mão e registra o que foi feito. O
-- registro protege o paciente (continuidade do cuidado) e o profissional
-- (demonstra a conduta adotada).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.psychology_crisis_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  psychologist_id  UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  consultation_id  UUID REFERENCES public.consultations(id) ON DELETE SET NULL,

  nivel            TEXT NOT NULL CHECK (nivel IN (
                     'ideacao',          -- ideação sem plano
                     'plano',            -- ideação com plano
                     'tentativa_recente',
                     'outro'
                   )),
  acoes_tomadas    TEXT NOT NULL CHECK (length(trim(acoes_tomadas)) > 0),
  contato_acionado BOOLEAN NOT NULL DEFAULT false,
  encaminhamento   TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_patient
  ON public.psychology_crisis_events(patient_id, created_at DESC);

ALTER TABLE public.psychology_crisis_events ENABLE ROW LEVEL SECURITY;

-- Legível por qualquer psicólogo que atenda o paciente: quem assumir o caso
-- depois precisa saber que houve episódio de risco. Sem UPDATE nem DELETE —
-- é registro de conduta.
DROP POLICY IF EXISTS "crisis_read_psi" ON public.psychology_crisis_events;
CREATE POLICY "crisis_read_psi"
  ON public.psychology_crisis_events FOR SELECT TO authenticated
  USING (psicologo_atende_paciente(psychology_crisis_events.patient_id));

DROP POLICY IF EXISTS "crisis_insert_psi" ON public.psychology_crisis_events;
CREATE POLICY "crisis_insert_psi"
  ON public.psychology_crisis_events FOR INSERT TO authenticated
  WITH CHECK (
    psicologo_atende_paciente(psychology_crisis_events.patient_id)
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = psychology_crisis_events.psychologist_id
        AND d.user_id = auth.uid()
        AND d.tipo_profissional = 'psicologo'
    )
  );


-- =====================================================
-- 4. PACIENTES DO PSICÓLOGO
--    A lista do painel. Sem tocar em profiles, que o psicólogo não lê.
-- =====================================================

DROP FUNCTION IF EXISTS psi_meus_pacientes();

CREATE OR REPLACE FUNCTION psi_meus_pacientes()
RETURNS TABLE (
  patient_id       UUID,
  nome             TEXT,
  sessoes          INT,
  ultima_sessao    TIMESTAMPTZ,
  proxima_sessao   TIMESTAMPTZ,
  tem_anamnese     BOOLEAN,
  who5_ultimo      INT
) AS $$
  WITH meu AS (
    SELECT d.id FROM public.doctors d
    WHERE d.user_id = auth.uid() AND d.tipo_profissional = 'psicologo'
    LIMIT 1
  )
  SELECT
    c.patient_id,
    p.display_name,
    COUNT(*) FILTER (WHERE c.status = 'completed')::int,
    MAX(c.scheduled_at) FILTER (WHERE c.status = 'completed'),
    MIN(c.scheduled_at) FILTER (WHERE c.status = 'scheduled'
                                  AND c.scheduled_at >= now()),
    EXISTS (SELECT 1 FROM public.psychology_intake i WHERE i.patient_id = c.patient_id),
    (SELECT pa.score FROM public.psychosocial_assessments pa
      WHERE pa.user_id = c.patient_id AND pa.instrument = 'who5'
        AND pa.reference_month IS NOT NULL
      ORDER BY pa.reference_month DESC LIMIT 1)
  FROM public.consultations c
  JOIN public.profiles p ON p.id = c.patient_id
  WHERE c.doctor_id = (SELECT id FROM meu)
  GROUP BY c.patient_id, p.display_name
  ORDER BY MAX(c.scheduled_at) DESC NULLS LAST;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION psi_meus_pacientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION psi_meus_pacientes() TO authenticated;
