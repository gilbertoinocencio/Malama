-- =====================================================
-- Malama — Prontuário psicológico, notas interprofissionais e contexto
-- Migration: 20260803_prontuario_psicologico.sql
--
-- Aplicar via SQL Editor, depois de 20260802_acesso_por_tipo_profissional.
--
-- TRÊS NÍVEIS DE INFORMAÇÃO, três destinos diferentes:
--
--   privada        → psychology_notes. Evolução da sessão, sob guarda do
--                    psicólogo autor. Não sai para ninguém.
--   psicologia     → care_team_notes (visibilidade='psicologia'). Passagem
--                    de bastão entre psicólogos que atendem o paciente.
--   equipe clínica → care_team_notes (visibilidade='equipe_clinica'). O que
--                    médico e psicólogo precisam saber um do outro para não
--                    errar a conduta.
--
-- O nível é escolhido no ATO DE ESCREVER, e a interface tem que dizer quem
-- vai ler antes de a pessoa digitar. Um campo só, com seletor discreto, faria
-- o profissional escrever como se fosse privado e vazar.
--
-- O paciente NÃO lê estas tabelas no app. Prontuário psicológico bruto não é
-- documento de entrega: pelo CFP o que se entrega é declaração, atestado,
-- relatório ou laudo, elaborados pelo profissional. Acesso do titular existe,
-- mas mediado — como em atendimento convencional. Tela de transparência do
-- que é compartilhado sobre ele fica para depois, e é um bom diferencial.
-- =====================================================


-- =====================================================
-- 1. PRONTUÁRIO PSICOLÓGICO
--    Escopo por AUTOR, mesmo padrão que clinical_notes já usa e que a
--    auditoria confirmou estar correto.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.psychology_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  psychologist_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Seções da evolução. Sem exame físico, sem diagnóstico médico, sem sinais
  -- vitais — o clinical_notes do médico não serve para isto.
  queixa          TEXT,   -- o que a pessoa traz hoje
  evolucao        TEXT,   -- o que aconteceu na sessão
  plano           TEXT,   -- combinados e direção para a próxima
  observacoes     TEXT,   -- impressões do profissional

  is_draft        BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psychology_notes_patient
  ON public.psychology_notes(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psychology_notes_consultation
  ON public.psychology_notes(consultation_id);

DROP TRIGGER IF EXISTS update_psychology_notes_updated_at ON public.psychology_notes;
CREATE TRIGGER update_psychology_notes_updated_at
  BEFORE UPDATE ON public.psychology_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.psychology_notes ENABLE ROW LEVEL SECURITY;

-- Só o autor. Nem outro psicólogo, nem o médico, nem o RH, nem o paciente.
DROP POLICY IF EXISTS "psychology_notes_author_crud" ON public.psychology_notes;
CREATE POLICY "psychology_notes_author_crud"
  ON public.psychology_notes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = psychology_notes.psychologist_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = psychology_notes.psychologist_id
        AND d.user_id = auth.uid()
        AND d.tipo_profissional = 'psicologo'
    )
  );


-- =====================================================
-- 2. NOTAS INTERPROFISSIONAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.care_team_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  consultation_id  UUID REFERENCES public.consultations(id) ON DELETE SET NULL,

  visibilidade     TEXT NOT NULL
                     CHECK (visibilidade IN ('equipe_clinica', 'psicologia')),

  texto            TEXT NOT NULL CHECK (length(trim(texto)) > 0),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_team_notes_patient
  ON public.care_team_notes(patient_id, created_at DESC);

ALTER TABLE public.care_team_notes ENABLE ROW LEVEL SECURITY;

-- Leitura conforme o nível escolhido por quem escreveu.
DROP POLICY IF EXISTS "care_team_notes_read" ON public.care_team_notes;
CREATE POLICY "care_team_notes_read"
  ON public.care_team_notes FOR SELECT TO authenticated
  USING (
    -- Autor sempre lê o que escreveu
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = care_team_notes.author_doctor_id AND d.user_id = auth.uid()
    )
    OR (
      visibilidade = 'equipe_clinica'
      AND (
        medico_atende_paciente(care_team_notes.patient_id)
        OR psicologo_atende_paciente(care_team_notes.patient_id)
      )
    )
    OR (
      visibilidade = 'psicologia'
      AND psicologo_atende_paciente(care_team_notes.patient_id)
    )
  );

-- Escrita: só profissional que atende o paciente, e assinando como ele mesmo.
DROP POLICY IF EXISTS "care_team_notes_insert" ON public.care_team_notes;
CREATE POLICY "care_team_notes_insert"
  ON public.care_team_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = care_team_notes.author_doctor_id AND d.user_id = auth.uid()
    )
    AND (
      medico_atende_paciente(care_team_notes.patient_id)
      OR psicologo_atende_paciente(care_team_notes.patient_id)
    )
  );

-- Sem UPDATE: nota que outro profissional já leu e usou na conduta não deve
-- mudar de conteúdo depois. Correção = nova nota.
DROP POLICY IF EXISTS "care_team_notes_delete_author" ON public.care_team_notes;
CREATE POLICY "care_team_notes_delete_author"
  ON public.care_team_notes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = care_team_notes.author_doctor_id AND d.user_id = auth.uid()
    )
  );


-- =====================================================
-- 3. CONTEXTO DO PACIENTE PARA A PSICOLOGIA
--
-- Este é O contrato: tudo que a psicologia enxerga do paciente passa por
-- aqui. A migração anterior fechou o acesso direto às tabelas justamente
-- para que esta função seja o único lugar a auditar.
--
-- O que entra: humor, energia, motivação, sono, atividade, WHO-5, frequência.
-- O que NÃO entra: refeições, macros, peso absoluto, composição corporal,
-- exames, doses de GLP-1. A variação de peso entra só como percentual
-- derivado, porque mudança rápida é critério de humor e de transtorno
-- alimentar — sem abrir a série de peso.
-- =====================================================

DROP FUNCTION IF EXISTS psi_contexto_paciente(UUID);

CREATE OR REPLACE FUNCTION psi_contexto_paciente(p_patient_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_nome        TEXT;
  v_idade       INT;
  v_who5        JSONB;
  v_checkins    JSONB;
  v_sono_disp   JSONB;
  v_atividade   JSONB;
  v_peso_pct    NUMERIC;
  v_sessoes     JSONB;
  v_alertas     JSONB := '[]'::jsonb;

  v_who5_ultimo   INT;
  v_who5_primeiro INT;
  v_sono_medio    NUMERIC;
  v_humor_rec     NUMERIC;
  v_humor_ant     NUMERIC;
  v_ativ_rec      INT;
  v_ativ_ant      INT;
  v_faltas        INT;
BEGIN
  -- Só psicólogo que atende este paciente.
  IF NOT psicologo_atende_paciente(p_patient_id) THEN
    RETURN NULL;
  END IF;

  SELECT p.display_name,
         CASE WHEN p.date_of_birth IS NULL THEN NULL
              ELSE EXTRACT(YEAR FROM age(p.date_of_birth))::int END
    INTO v_nome, v_idade
  FROM public.profiles p WHERE p.id = p_patient_id;

  -- ── WHO-5: série dos últimos 12 meses ──
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('mes', reference_month, 'score', score)
           ORDER BY reference_month
         ), '[]'::jsonb)
    INTO v_who5
  FROM public.psychosocial_assessments
  WHERE user_id = p_patient_id
    AND instrument = 'who5'
    AND reference_month >= (CURRENT_DATE - INTERVAL '12 months');

  -- reference_month passou a ser nullable no motor de campanhas
  -- (20260728); em DESC o NULL viria primeiro e devolveria o escore errado.
  SELECT score INTO v_who5_ultimo
  FROM public.psychosocial_assessments
  WHERE user_id = p_patient_id AND instrument = 'who5'
    AND reference_month IS NOT NULL
  ORDER BY reference_month DESC LIMIT 1;

  SELECT score INTO v_who5_primeiro
  FROM public.psychosocial_assessments
  WHERE user_id = p_patient_id AND instrument = 'who5'
    AND reference_month >= (CURRENT_DATE - INTERVAL '6 months')
  ORDER BY reference_month ASC LIMIT 1;

  -- ── Check-ins diários: 60 dias ──
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'data',            checkin_date,
             'humor',           mood,
             'energia',         energy_level,
             'motivacao',       motivation,
             'sono_horas',      sleep_hours,
             'sono_qualidade',  sleep_quality
           ) ORDER BY checkin_date
         ), '[]'::jsonb)
    INTO v_checkins
  FROM public.daily_checkins
  WHERE user_id = p_patient_id
    AND checkin_date >= (CURRENT_DATE - INTERVAL '60 days');

  -- ── Sono do dispositivo (Health Connect / Apple Health): 60 dias ──
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('data', metric_date, 'minutos', sleep_minutes)
           ORDER BY metric_date
         ) FILTER (WHERE sleep_minutes IS NOT NULL), '[]'::jsonb)
    INTO v_sono_disp
  FROM public.health_daily_metrics
  WHERE user_id = p_patient_id
    AND metric_date >= (CURRENT_DATE - INTERVAL '60 days');

  -- ── Atividade física por semana: 8 semanas ──
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('semana', semana, 'minutos', minutos) ORDER BY semana
         ), '[]'::jsonb)
    INTO v_atividade
  FROM (
    SELECT date_trunc('week', activity_date)::date AS semana,
           ROUND(SUM(COALESCE(duration_seconds, 0)) / 60.0)::int AS minutos
    FROM public.activities
    WHERE user_id = p_patient_id
      AND activity_date >= (CURRENT_DATE - INTERVAL '8 weeks')
    GROUP BY 1
  ) a;

  -- ── Variação de peso em 90 dias: só o percentual ──
  SELECT ROUND(((ultimo - primeiro) / NULLIF(primeiro, 0)) * 100, 1)
    INTO v_peso_pct
  FROM (
    SELECT
      (SELECT weight_kg FROM public.weight_logs
        WHERE user_id = p_patient_id
          AND logged_at >= (now() - INTERVAL '90 days')
        ORDER BY logged_at ASC LIMIT 1) AS primeiro,
      (SELECT weight_kg FROM public.weight_logs
        WHERE user_id = p_patient_id
        ORDER BY logged_at DESC LIMIT 1) AS ultimo
  ) w;

  -- ── Sessões com psicólogos ──
  SELECT jsonb_build_object(
           'realizadas', COUNT(*) FILTER (WHERE c.status = 'completed'),
           'ultima',     MAX(c.scheduled_at) FILTER (WHERE c.status = 'completed'),
           'faltas',     COUNT(*) FILTER (WHERE c.status = 'no_show')
         ),
         COUNT(*) FILTER (WHERE c.status = 'no_show'
                            AND c.scheduled_at >= (now() - INTERVAL '6 months'))::int
    INTO v_sessoes, v_faltas
  FROM public.consultations c
  JOIN public.doctors d ON d.id = c.doctor_id
  WHERE c.patient_id = p_patient_id
    AND d.tipo_profissional = 'psicologo';

  -- =====================================================
  -- Alertas — regras determinísticas, nunca IA.
  -- Só uso ponto de corte publicado (WHO-5) ou comparação do paciente com
  -- ele mesmo. Não invento limiar para escala interna não validada: por isso
  -- humor e energia entram como TENDÊNCIA, não como "humor abaixo de X".
  -- =====================================================

  IF v_who5_ultimo IS NOT NULL AND v_who5_ultimo <= 28 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'who5_faixa_atencao',
      'texto',  'WHO-5 em ' || v_who5_ultimo || ' (faixa de atenção, <= 28).');
  ELSIF v_who5_ultimo IS NOT NULL AND v_who5_ultimo < 50 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'who5_reduzido',
      'texto',  'WHO-5 em ' || v_who5_ultimo || ' (bem-estar reduzido, < 50).');
  END IF;

  IF v_who5_ultimo IS NOT NULL AND v_who5_primeiro IS NOT NULL
     AND v_who5_ultimo < v_who5_primeiro - 10 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'who5_em_queda',
      'texto',  'WHO-5 caiu de ' || v_who5_primeiro || ' para ' || v_who5_ultimo
                || ' nos últimos 6 meses.');
  END IF;

  SELECT ROUND(AVG(sleep_hours), 1) INTO v_sono_medio
  FROM public.daily_checkins
  WHERE user_id = p_patient_id
    AND checkin_date >= (CURRENT_DATE - INTERVAL '14 days')
    AND sleep_hours IS NOT NULL;

  IF v_sono_medio IS NOT NULL AND v_sono_medio < 6 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'sono_curto',
      'texto',  'Média de ' || v_sono_medio || 'h de sono nos últimos 14 dias.');
  END IF;

  SELECT AVG(mood) INTO v_humor_rec FROM public.daily_checkins
  WHERE user_id = p_patient_id AND mood IS NOT NULL
    AND checkin_date >= (CURRENT_DATE - INTERVAL '14 days');
  SELECT AVG(mood) INTO v_humor_ant FROM public.daily_checkins
  WHERE user_id = p_patient_id AND mood IS NOT NULL
    AND checkin_date >= (CURRENT_DATE - INTERVAL '28 days')
    AND checkin_date <  (CURRENT_DATE - INTERVAL '14 days');

  IF v_humor_rec IS NOT NULL AND v_humor_ant IS NOT NULL
     AND v_humor_rec < v_humor_ant * 0.8 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'humor_em_queda',
      'texto',  'Humor autorrelatado caiu em relação às duas semanas anteriores.');
  END IF;

  SELECT COUNT(*)::int INTO v_ativ_rec FROM public.activities
  WHERE user_id = p_patient_id AND activity_date >= (now() - INTERVAL '14 days');
  SELECT COUNT(*)::int INTO v_ativ_ant FROM public.activities
  WHERE user_id = p_patient_id
    AND activity_date >= (now() - INTERVAL '45 days')
    AND activity_date <  (now() - INTERVAL '14 days');

  IF v_ativ_rec = 0 AND v_ativ_ant >= 4 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'atividade_parou',
      'texto',  'Nenhuma atividade física registrada nos últimos 14 dias (havia rotina antes).');
  END IF;

  IF v_peso_pct IS NOT NULL AND ABS(v_peso_pct) >= 5 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'peso_variacao',
      'texto',  'Variação de peso de ' || v_peso_pct || '% em 90 dias.');
  END IF;

  IF COALESCE(v_faltas, 0) >= 2 THEN
    v_alertas := v_alertas || jsonb_build_object(
      'codigo', 'faltas',
      'texto',  v_faltas || ' faltas em sessões nos últimos 6 meses.');
  END IF;

  RETURN jsonb_build_object(
    'paciente',         jsonb_build_object('nome', v_nome, 'idade', v_idade),
    'who5',             v_who5,
    'checkins',         v_checkins,
    'sono_dispositivo', v_sono_disp,
    'atividade',        v_atividade,
    'peso_variacao_pct', v_peso_pct,
    'sessoes',          COALESCE(v_sessoes, '{}'::jsonb),
    'alertas',          v_alertas
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION psi_contexto_paciente(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION psi_contexto_paciente(UUID) TO authenticated;
