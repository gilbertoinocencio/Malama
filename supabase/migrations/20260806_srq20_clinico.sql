-- =====================================================
-- Malama — SRQ-20 aplicado em sessão (instrumento clínico)
-- Migration: 20260806_srq20_clinico.sql
--
-- Aplicar via SQL Editor, depois de 20260804_anamnese_e_crise.
--
-- ⚠️ TABELA SEPARADA DE PROPÓSITO.
-- O SRQ-20 NÃO vai para psychosocial_assessments. Aquela tabela alimenta o
-- relatório agregado que a empresa lê; esta é prontuário. São dois destinos
-- que nunca se cruzam, e essa separação é a razão de o SRQ-20 ter saído do
-- aplicativo e ido para dentro do consultório.
--
-- Quem lê: qualquer psicólogo que atenda o paciente — como a anamnese e o
-- histórico de risco, é história clínica que a continuidade do cuidado exige.
-- Não é conteúdo de sessão (esse fica em psychology_notes, só do autor).
-- O médico não lê. O RH não existe nesta conversa.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.psychology_srq20 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  psychologist_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,

  -- Respostas por chave estável do instrumento: {"q1": true, "q2": false, ...}
  -- Guardadas em bruto para o resultado ser auditável contra o instrumento.
  answers         JSONB NOT NULL,

  -- Soma das respostas afirmativas (0–20). Calculada em código, nunca por IA.
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 20),

  -- Item de ideação suicida respondido "sim". Coluna própria porque é o que
  -- dispara conduta — não pode depender de ler o JSON para descobrir.
  item_risco      BOOLEAN NOT NULL DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srq20_patient
  ON public.psychology_srq20(patient_id, created_at DESC);

ALTER TABLE public.psychology_srq20 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "srq20_read_psi" ON public.psychology_srq20;
CREATE POLICY "srq20_read_psi"
  ON public.psychology_srq20 FOR SELECT TO authenticated
  USING (psicologo_atende_paciente(psychology_srq20.patient_id));

DROP POLICY IF EXISTS "srq20_insert_psi" ON public.psychology_srq20;
CREATE POLICY "srq20_insert_psi"
  ON public.psychology_srq20 FOR INSERT TO authenticated
  WITH CHECK (
    psicologo_atende_paciente(psychology_srq20.patient_id)
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = psychology_srq20.psychologist_id
        AND d.user_id = auth.uid()
        AND d.tipo_profissional = 'psicologo'
    )
  );

-- Sem UPDATE e sem DELETE: aplicação de instrumento validado é registro
-- pontual. Aplicou errado, aplica de novo — o histórico mostra as duas.
