-- =====================================================
-- Malama — Ciclo de vida do crédito de consulta, server-side
-- Migration: 20260823_ciclo_credito_e_psi.sql
--
-- Aplicar via SQL Editor (ou supabase db query --linked --file).
--
-- O QUE ESTA MIGRAÇÃO CONSERTA
--
-- 1. CRÉDITO PSI NUNCA ERA EMITIDO NO UPSELL.
--    emitir_creditos_empresa decidia a especialidade só por empresas.modo_mental.
--    O caminho do upsell (empresas.plano_psicologico + assento alocado pelo RH
--    em empresa_colaboradores.plano_psicologico) não era consultado por
--    ninguém: rh_alocar_psicologo só liga a flag. O RH via o toggle verde e o
--    colaborador nunca recebia crédito — falha silenciosa.
--
-- 2. TODO O CICLO DE VIDA DO CRÉDITO ERA UM NO-OP EM PRODUÇÃO.
--    consultation_credits tem RLS ligada e NENHUMA policy de INSERT/UPDATE
--    para authenticated (só SELECT do dono, SELECT do médico e ALL do super
--    admin). Todas as escritas do app são diretas na tabela:
--      - creditService.markAsScheduled (agendar)       → 0 linhas
--      - creditService.markAsRealized (finalizar)      → 0 linhas
--      - creditService.handleAppointmentCancellation   → 0 linhas
--    UPDATE bloqueado por RLS não levanta erro: afeta 0 linhas e o app segue
--    como se tivesse dado certo. Consequências reais: crédito agendado
--    continua 'disponivel' (consulta ilimitada com um crédito só) e crédito
--    de consulta realizada nunca vira 'realizada' — ou seja, NUNCA entra na
--    base de repasse (get_unpaid_realized_credits lê 'realizada').
--    Verificado com SET LOCAL ROLE authenticated: 0 linhas no UPDATE do dono
--    e do médico, exceção no INSERT.
--
-- 3. REMARCAÇÃO PÓS-FALTA DESTRUÍA O CRÉDITO B2B.
--    O crédito substituto era criado sem empresa_id e sem especialidade. Sem
--    empresa_id, um crédito B2B (subscription_id NULL) viola
--    credits_origem_check e o INSERT falha → o colaborador fica sem nada.
--    Sem especialidade, um crédito psi renascia como 'medico'.
--
-- DESENHO ADOTADO
-- A regra de negócio do crédito passa a viver em UM lugar — aqui — em
-- funções SECURITY DEFINER. O app e a Edge Function chamam; nenhum dos dois
-- escreve na tabela. Isso resolve o RLS sem abrir policy de escrita numa
-- tabela de faturamento (policy ampla deixaria o paciente emitir o próprio
-- crédito pelo console do browser) e elimina a regra das 24h/2 faltas
-- duplicada em TypeScript em dois lugares.
-- =====================================================


-- =====================================================
-- 0. AGENDAR VOLTOU A SER POSSÍVEL
--
-- price, platform_fee e doctor_payout são NOT NULL sem default — resto do
-- modelo B2C em que o paciente pagava a consulta. Em 01/08 (commit ab54405)
-- o bookConsultation deixou de preenchê-los de propósito, porque a tela de
-- financeiro somava esses campos e mostrava dinheiro que não existe. Só que
-- a coluna continuou NOT NULL: desde então TODO agendamento morre com
-- 23502 antes de chegar ao crédito. Nenhuma consulta foi criada no banco
-- depois dessa data.
--
-- Default 0 em vez de DROP NOT NULL: as linhas históricas guardam o preço
-- real cobrado e continuam válidas; zero diz "esta consulta não teve preço
-- ao paciente", que é o modelo B2B atual.
-- =====================================================

ALTER TABLE consultations ALTER COLUMN price         SET DEFAULT 0;
ALTER TABLE consultations ALTER COLUMN platform_fee  SET DEFAULT 0;
ALTER TABLE consultations ALTER COLUMN doctor_payout SET DEFAULT 0;


-- =====================================================
-- 1. EMISSÃO: MODALIDADE POR COLABORADOR, NÃO SÓ POR EMPRESA
--
-- Duas origens de crédito psi, e o colaborador tem direito por qualquer uma:
--   (a) modo_mental na empresa → todo assento recebe;
--   (b) upsell: empresas.plano_psicologico + o assento alocado pelo RH.
-- Por isso as modalidades passam a ser calculadas DENTRO do laço de
-- colaboradores. Idempotência continua por (user, especialidade, competência).
-- =====================================================

DROP FUNCTION IF EXISTS emitir_creditos_empresa(UUID, DATE);

CREATE OR REPLACE FUNCTION emitir_creditos_empresa(
  p_empresa_id  UUID,
  p_competencia DATE
)
RETURNS JSONB AS $$
DECLARE
  e             RECORD;
  v_mes         DATE := date_trunc('month', p_competencia)::date;
  v_expira      TIMESTAMPTZ := now() + INTERVAL '30 days';
  v_base        TEXT[] := ARRAY[]::TEXT[];
  v_modos       TEXT[];
  v_modo        TEXT;
  v_criados     INT := 0;
  v_existentes  INT := 0;
  colab         RECORD;
BEGIN
  SELECT id, status, modo_mental, modo_metabolico, plano_psicologico
    INTO e
  FROM empresas WHERE id = p_empresa_id;

  IF e IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empresa não encontrada');
  END IF;
  IF e.status <> 'ativa' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empresa não está ativa');
  END IF;

  -- acesso_bloqueado NÃO é checado aqui de propósito: o webhook do Asaas
  -- emite os créditos ANTES de desbloquear a empresa que acabou de pagar.
  -- Checar aqui deixaria justamente quem regularizou sem crédito.
  -- array_append, não `|| 'texto'`: com o literal sem tipo o Postgres resolve
  -- o operador para array_cat e tenta ler 'medico' como array_literal, o que
  -- estourava "malformed array literal" na PRIMEIRA emissão B2B da vida.
  IF COALESCE(e.modo_metabolico, false) THEN v_base := array_append(v_base, 'medico');    END IF;
  IF COALESCE(e.modo_mental, false)     THEN v_base := array_append(v_base, 'psicologo'); END IF;

  IF array_length(v_base, 1) IS NULL AND NOT COALESCE(e.plano_psicologico, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empresa sem modalidade contratada');
  END IF;

  -- Colaborador convidado que ainda não abriu o app não tem user_id; ele
  -- recebe o crédito na competência seguinte à ativação (a reconciliação
  -- diária abaixo pega isso dentro do próprio mês).
  FOR colab IN
    SELECT ec.user_id, COALESCE(ec.plano_psicologico, false) AS upsell_psi
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = p_empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND ec.user_id IS NOT NULL
  LOOP
    v_modos := v_base;

    -- Upsell psicológico: vale para ESTE colaborador, se a empresa contratou
    -- o plano e o RH alocou o assento a ele.
    IF COALESCE(e.plano_psicologico, false)
       AND colab.upsell_psi
       AND NOT ('psicologo' = ANY(v_modos)) THEN
      v_modos := array_append(v_modos, 'psicologo');
    END IF;

    IF array_length(v_modos, 1) IS NULL THEN CONTINUE; END IF;

    FOREACH v_modo IN ARRAY v_modos LOOP
      IF EXISTS (
        SELECT 1 FROM consultation_credits c
        WHERE c.user_id = colab.user_id
          AND c.especialidade = v_modo
          AND c.month_reference = v_mes
      ) THEN
        v_existentes := v_existentes + 1;
        CONTINUE;
      END IF;

      INSERT INTO consultation_credits
        (user_id, subscription_id, empresa_id, status, especialidade,
         month_reference, expires_at)
      VALUES
        (colab.user_id, NULL, p_empresa_id, 'disponivel', v_modo,
         v_mes, v_expira);

      v_criados := v_criados + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'competencia', v_mes,
    'modalidades_empresa', v_base,
    'creditos_criados', v_criados,
    'ja_existiam', v_existentes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION emitir_creditos_empresa(UUID, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION emitir_creditos_empresa(UUID, DATE) TO service_role;


-- =====================================================
-- 2. RECONCILIAÇÃO DIÁRIA
--
-- "Assento ativo e mês pago" é a única condição para o colaborador ter o
-- crédito do mês. O webhook do Asaas emite no instante do pagamento, mas
-- quem vira elegível DEPOIS (colaborador que abriu o app, assento psi que o
-- RH alocou no dia 10) ficava esperando a próxima fatura.
--
-- A reconciliação roda todo dia e reemite para as empresas com a competência
-- corrente paga. É a mesma função idempotente, então quem já tem crédito não
-- ganha outro.
-- =====================================================

CREATE OR REPLACE FUNCTION empresa_competencia_paga(
  p_empresa_id  UUID,
  p_competencia DATE
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM empresa_faturas f
    WHERE f.empresa_id = p_empresa_id
      AND date_trunc('month', f.competencia) = date_trunc('month', p_competencia)
      AND f.status = 'pago'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION empresa_competencia_paga(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION empresa_competencia_paga(UUID, DATE) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION reconciliar_creditos_empresas(
  p_competencia DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  emp        RECORD;
  v_res      JSONB;
  v_criados  INT := 0;
  v_empresas INT := 0;
BEGIN
  FOR emp IN
    SELECT id FROM empresas
    WHERE status = 'ativa'
      AND COALESCE(acesso_bloqueado, false) = false
      AND empresa_competencia_paga(id, p_competencia)
  LOOP
    v_res := emitir_creditos_empresa(emp.id, p_competencia);
    v_empresas := v_empresas + 1;
    v_criados := v_criados + COALESCE((v_res->>'creditos_criados')::int, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'competencia', date_trunc('month', p_competencia)::date,
    'empresas_processadas', v_empresas,
    'creditos_criados', v_criados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION reconciliar_creditos_empresas(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reconciliar_creditos_empresas(DATE) TO service_role;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron não habilitado — habilite a extensão e reexecute este bloco.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconciliar-creditos-empresas') THEN
    PERFORM cron.unschedule('reconciliar-creditos-empresas');
  END IF;

  -- 04:10 diário. Depois do expire-credits (00:05) de propósito: primeiro
  -- vencem os créditos velhos, depois nasce o do mês.
  PERFORM cron.schedule(
    'reconciliar-creditos-empresas',
    '10 4 * * *',
    $job$ SELECT reconciliar_creditos_empresas(); $job$
  );
END $$;


-- =====================================================
-- 3. ALOCAÇÃO DO ASSENTO PSI JÁ ENTREGA O CRÉDITO
--
-- Ligar o toggle no painel do RH e o colaborador só receber a sessão no mês
-- seguinte é indistinguível de bug para quem está usando. Se a competência
-- corrente está paga, o crédito sai na hora.
-- =====================================================

DROP FUNCTION IF EXISTS rh_alocar_psicologo(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION rh_alocar_psicologo(
  p_colaborador_id UUID,
  p_ativar         BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id   UUID;
  v_plano_ativo  BOOLEAN;
  v_max_psi      INT;
  v_em_uso       INT;
  v_colab_emp    UUID;
  v_emissao      JSONB := NULL;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT empresa_id INTO v_colab_emp
  FROM empresa_colaboradores
  WHERE id = p_colaborador_id AND status <> 'removido';

  IF v_colab_emp IS NULL OR v_colab_emp <> v_empresa_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Colaborador não pertence à sua empresa');
  END IF;

  SELECT plano_psicologico, COALESCE(max_assentos_psi, 0)
    INTO v_plano_ativo, v_max_psi
  FROM empresas WHERE id = v_empresa_id;

  IF NOT COALESCE(v_plano_ativo, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Plano psicológico não está ativo para a empresa');
  END IF;

  IF p_ativar THEN
    SELECT COUNT(*) INTO v_em_uso
    FROM empresa_colaboradores
    WHERE empresa_id = v_empresa_id
      AND plano_psicologico = true
      AND status <> 'removido'
      AND id <> p_colaborador_id;

    IF v_em_uso >= v_max_psi THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Limite de assentos psicológicos atingido');
    END IF;
  END IF;

  UPDATE empresa_colaboradores
  SET plano_psicologico = p_ativar
  WHERE id = p_colaborador_id;

  -- Desligar NÃO revoga crédito já emitido: o mês já foi pago pela empresa.
  IF p_ativar AND empresa_competencia_paga(v_empresa_id, CURRENT_DATE) THEN
    v_emissao := emitir_creditos_empresa(v_empresa_id, CURRENT_DATE);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'plano_psicologico', p_ativar,
    'emissao', v_emissao
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_alocar_psicologo(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_alocar_psicologo(UUID, BOOLEAN) TO authenticated;


-- =====================================================
-- 4. RESERVA DO CRÉDITO NO AGENDAMENTO
--
-- Substitui creditService.markAsScheduled, que era bloqueado por RLS.
-- Valida o que o cliente não tem como garantir: dono, validade, e que a
-- especialidade do crédito bate com o tipo do profissional — sem isso um
-- crédito psi pagaria uma consulta médica (e vice-versa), porque o
-- agendamento escolhia o crédito só pelo vencimento mais próximo.
-- =====================================================

DROP FUNCTION IF EXISTS reservar_credito(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION reservar_credito(
  p_credit_id      UUID,
  p_appointment_id UUID,
  p_doctor_id      UUID
)
RETURNS JSONB AS $$
DECLARE
  c        RECORD;
  v_tipo   TEXT;
  v_dono   UUID;
BEGIN
  SELECT id, user_id, status, expires_at, especialidade
    INTO c
  FROM consultation_credits WHERE id = p_credit_id
  FOR UPDATE;

  IF c IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Crédito não encontrado');
  END IF;
  IF c.user_id <> auth.uid() AND NOT is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Crédito de outro usuário');
  END IF;
  IF c.status <> 'disponivel' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Crédito não está disponível');
  END IF;
  IF c.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Crédito vencido');
  END IF;

  SELECT patient_id INTO v_dono FROM consultations WHERE id = p_appointment_id;
  IF v_dono IS NULL OR v_dono <> c.user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Consulta não pertence ao dono do crédito');
  END IF;

  SELECT COALESCE(tipo_profissional, 'medico') INTO v_tipo
  FROM doctors WHERE id = p_doctor_id;

  IF v_tipo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profissional não encontrado');
  END IF;
  IF v_tipo <> COALESCE(c.especialidade, 'medico') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Crédito é de outra especialidade');
  END IF;

  UPDATE consultation_credits
  SET status = 'agendada',
      appointment_id = p_appointment_id,
      doctor_id = p_doctor_id,
      updated_at = now()
  WHERE id = p_credit_id;

  RETURN jsonb_build_object('ok', true, 'especialidade', c.especialidade);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION reservar_credito(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reservar_credito(UUID, UUID, UUID) TO authenticated, service_role;


-- =====================================================
-- 5. CANCELAMENTO E FALTA — PONTO ÚNICO
--
-- A mesma regra estava escrita em TypeScript em dois lugares
-- (billingService.handleAppointmentCancellation e a Edge Function
-- send-consultation-reminders), e as duas cópias criavam o crédito
-- substituto sem empresa_id e sem especialidade. Para um crédito B2B isso
-- viola credits_origem_check e o colaborador fica SEM crédito nenhum.
--
-- Regra preservada: >=24h de antecedência libera sem penalidade; abaixo
-- disso (ou falta) conta strike — 1º libera com validade mínima de 7 dias,
-- 2º perde o crédito do ciclo.
-- =====================================================

DROP FUNCTION IF EXISTS liberar_credito_consulta(UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION liberar_credito_consulta(
  p_credit_id   UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  c         RECORD;
  v_tardio  BOOLEAN;
  v_count   INT;
  v_expira  TIMESTAMPTZ;
  v_pode    BOOLEAN;
BEGIN
  SELECT id, user_id, subscription_id, empresa_id, especialidade,
         month_reference, expires_at, COALESCE(late_cancellations_count, 0) AS strikes,
         status, appointment_id
    INTO c
  FROM consultation_credits WHERE id = p_credit_id
  FOR UPDATE;

  IF c IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Crédito não encontrado');
  END IF;

  -- Quem pode liberar: o dono, o profissional da consulta vinculada, o super
  -- admin, ou o service_role (cron de no-show).
  v_pode := c.user_id = auth.uid()
    OR is_super_admin()
    OR COALESCE(auth.role(), '') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM consultations s
        JOIN doctors d ON d.id = s.doctor_id
      WHERE s.id = c.appointment_id AND d.user_id = auth.uid()
    );

  IF NOT v_pode THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão sobre este crédito');
  END IF;

  -- Idempotência: crédito que já saiu de 'agendada' foi processado por outro
  -- lado (cron e paciente disputam o mesmo no-show).
  IF c.status <> 'agendada' THEN
    RETURN jsonb_build_object('ok', true, 'ja_processado', true, 'credito_perdido', false);
  END IF;

  v_tardio := (p_scheduled_at - now()) < INTERVAL '24 hours';

  IF NOT v_tardio THEN
    UPDATE consultation_credits
    SET status = 'cancelada_reagendada',
        appointment_id = NULL, doctor_id = NULL, updated_at = now()
    WHERE id = c.id;

    -- Herda o expires_at ORIGINAL: cancelar não estende o prazo de 30 dias.
    INSERT INTO consultation_credits
      (user_id, subscription_id, empresa_id, status, especialidade,
       month_reference, expires_at, late_cancellations_count)
    VALUES
      (c.user_id, c.subscription_id, c.empresa_id, 'disponivel', c.especialidade,
       c.month_reference, c.expires_at, c.strikes);

    RETURN jsonb_build_object('ok', true, 'credito_perdido', false, 'tardio', false);
  END IF;

  v_count := c.strikes + 1;

  IF v_count >= 2 THEN
    UPDATE consultation_credits
    SET status = 'perdida_cancelamento',
        late_cancellations_count = v_count,
        appointment_id = NULL, doctor_id = NULL, updated_at = now()
    WHERE id = c.id;

    RETURN jsonb_build_object('ok', true, 'credito_perdido', true, 'tardio', true);
  END IF;

  UPDATE consultation_credits
  SET status = 'cancelada_reagendada',
      late_cancellations_count = v_count,
      appointment_id = NULL, doctor_id = NULL, updated_at = now()
  WHERE id = c.id;

  -- Piso de 7 dias: crédito à beira do vencimento tornaria a remarcação
  -- única impossível.
  v_expira := GREATEST(c.expires_at, now() + INTERVAL '7 days');

  INSERT INTO consultation_credits
    (user_id, subscription_id, empresa_id, status, especialidade,
     month_reference, expires_at, late_cancellations_count)
  VALUES
    (c.user_id, c.subscription_id, c.empresa_id, 'disponivel', c.especialidade,
     c.month_reference, v_expira, v_count);

  RETURN jsonb_build_object('ok', true, 'credito_perdido', false, 'tardio', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION liberar_credito_consulta(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION liberar_credito_consulta(UUID, TIMESTAMPTZ) TO authenticated, service_role;


-- =====================================================
-- 6. CONSULTA CONCLUÍDA REALIZA O CRÉDITO — NO BANCO
--
-- Existem três telas que encerram consulta (modal da agenda, sala do médico,
-- sala do psicólogo) e cada uma escrevia status='completed' do seu jeito;
-- só uma delas tentava marcar o crédito como realizado, e mesmo essa era
-- barrada pela RLS. Como 'realizada' é o que alimenta o repasse, sessão
-- encerrada na sala nunca virava dinheiro para o profissional.
--
-- Trigger em vez de chamada no app: a transição vira consequência do fato
-- (consulta concluída), não da tela que o profissional usou.
-- =====================================================

CREATE OR REPLACE FUNCTION realizar_credito_da_consulta()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE consultation_credits
  SET status = 'realizada',
      realized_at = COALESCE(realized_at, now()),
      updated_at = now()
  WHERE appointment_id = NEW.id
    AND status = 'agendada';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_realizar_credito_da_consulta ON consultations;
CREATE TRIGGER trg_realizar_credito_da_consulta
  AFTER UPDATE OF status ON consultations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION realizar_credito_da_consulta();


-- Backfill: consultas já concluídas cujo crédito ficou preso em 'agendada'
-- por causa do bug de RLS. Sem isso o profissional não recebe pelo que já
-- atendeu. realized_at recebe o fim da consulta, não now(), para o crédito
-- cair na competência correta do repasse.
UPDATE consultation_credits c
SET status = 'realizada',
    realized_at = COALESCE(c.realized_at, s.ended_at, s.scheduled_at, now()),
    updated_at = now()
FROM consultations s
WHERE s.id = c.appointment_id
  AND s.status = 'completed'
  AND c.status = 'agendada';


-- =====================================================
-- 7. PRONTUÁRIO MÉDICO É DO MÉDICO
--
-- 20260802 fechou o acesso do psicólogo às tabelas de dado do paciente, mas
-- clinical_notes ficou de fora: a policy só exige que a nota seja do próprio
-- profissional, sem olhar tipo_profissional. Combinado com a agenda — que
-- oferece ao psicólogo o mesmo modal de encerramento com diagnóstico e
-- prescrição —, o psicólogo escreveria prontuário médico. O registro dele é
-- psychology_notes.
-- =====================================================

DROP POLICY IF EXISTS clinical_notes_doctor_crud ON public.clinical_notes;
CREATE POLICY clinical_notes_doctor_crud
  ON public.clinical_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = clinical_notes.doctor_id
        AND d.user_id = auth.uid()
        AND COALESCE(d.tipo_profissional, 'medico') = 'medico'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = clinical_notes.doctor_id
        AND d.user_id = auth.uid()
        AND COALESCE(d.tipo_profissional, 'medico') = 'medico'
    )
  );


-- =====================================================
-- 8. CONFERÊNCIA
--
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('emitir_creditos_empresa','empresa_competencia_paga',
--    'reconciliar_creditos_empresas','reservar_credito',
--    'liberar_credito_consulta','realizar_credito_da_consulta');   -- 6 linhas
--
-- SELECT jobname FROM cron.job WHERE jobname='reconciliar-creditos-empresas';
--
-- SELECT count(*) FROM consultation_credits c JOIN consultations s
--   ON s.id=c.appointment_id WHERE s.status='completed' AND c.status='agendada';
--                                                                  -- 0 linhas
-- =====================================================
