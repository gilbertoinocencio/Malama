-- =====================================================================
-- Malama — corrige regressão introduzida em 20260901_correcoes_auditoria.sql
-- (bloco 2 / achado F6)
--
-- O QUE ACONTECEU
-- O bloco 2 daquela migração fechou o achado F6 (qualquer usuário
-- autenticado conseguia inserir notificação forjada para QUALQUER
-- paciente) trocando a policy de INSERT em patient_notifications para
-- `WITH CHECK (false)`. A premissa escrita no comentário era "toda
-- notificação nasce de trigger SECURITY DEFINER" — só que isso está
-- errado: revisão de código encontrou TRÊS inserções diretas do cliente,
-- com a sessão normal do médico/admin (role authenticated), que o
-- `WITH CHECK (false)` passou a barrar sem erro visível na tela:
--
--   • src/services/doctorPortalService.ts:510 — proposeReschedule().
--     Médico/psicólogo propõe novas datas → paciente nunca é avisado.
--   • src/services/supportService.ts:181 — resposta de suporte.
--     Admin responde ticket → usuário nunca vê "Resposta do Suporte".
--   • src/components/DoctorConsultaPage.tsx:382 — receita emitida.
--     Médico emite receita → paciente nunca vê "Nova receita disponível".
--
-- Nas três, o erro do INSERT (42501, RLS) não é tratado — em
-- doctorPortalService.ts e DoctorConsultaPage.tsx nem é checado, então a
-- falha é 100% silenciosa: a função principal (reagendar, emitir receita)
-- continua funcionando normalmente, só a notificação desaparece.
--
-- A CORREÇÃO CERTA não é reabrir para `authenticated` em geral — isso
-- desfaria o F6. É exigir uma relação real entre quem escreve e o
-- paciente-alvo, usando os helpers que o projeto já tem para isso
-- (medico_atende_paciente / psicologo_atende_paciente, de
-- 20260802_acesso_por_tipo_profissional.sql), mais is_super_admin() para
-- o caminho do suporte. Também trava `type` a uma lista fechada, para uma
-- sessão de médico comprometida não conseguir forjar um tipo de
-- notificação diferente do que a tela realmente dispara.
--
-- Triggers SECURITY DEFINER (notify_patient_on_chat_opened, o de
-- chat_message) continuam intactos — não dependem de RLS porque rodam
-- como o dono da função, exatamente como o comentário original dizia;
-- só a premissa de que ERAM OS ÚNICOS estava errada.
-- =====================================================================

BEGIN;

DO $b$
BEGIN
  IF to_regclass('public.patient_notifications') IS NULL THEN
    RAISE NOTICE '[fix] public.patient_notifications nao existe neste banco — nada a fazer.';
    RETURN;
  END IF;

  EXECUTE $ddl$
    DROP POLICY IF EXISTS "patient_notifications_insert_service"
      ON public.patient_notifications
  $ddl$;

  EXECUTE $ddl$
    CREATE POLICY "patient_notifications_insert_by_treating_professional_or_admin"
      ON public.patient_notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        is_super_admin()
        OR (
          type IN ('appointment_reschedule_request', 'prescription_issued')
          AND (
            medico_atende_paciente(user_id)
            OR psicologo_atende_paciente(user_id)
          )
        )
      )
  $ddl$;

  EXECUTE $ddl$
    COMMENT ON POLICY "patient_notifications_insert_by_treating_professional_or_admin"
      ON public.patient_notifications IS
      'Admin insere qualquer tipo (suporte); médico/psicólogo só insere '
      'appointment_reschedule_request ou prescription_issued, e só para '
      'paciente com quem tem vínculo real via medico_atende_paciente/'
      'psicologo_atende_paciente. Corrige regressão de 20260901_correcoes_'
      'auditoria.sql bloco 2, que com WITH CHECK (false) bloqueava as três '
      'inserções diretas do cliente (reagendamento, receita, suporte) sem '
      'reabrir o forjamento arbitrário que o achado F6 fechou.'
  $ddl$;

  -- O bloco anterior revogou INSERT de anon/authenticated inteiro; a nova
  -- policy só tem efeito se o GRANT existir de novo.
  EXECUTE $ddl$
    GRANT INSERT ON public.patient_notifications TO authenticated
  $ddl$;

  RAISE NOTICE '[fix] patient_notifications: INSERT restaurado para médico/psicólogo tratante e admin.';
END
$b$;

COMMIT;

-- =====================================================================
-- VERIFICAÇÃO (não altera nada)
--
-- 1. A policy nova existe e tem o texto esperado:
--
--   SELECT policyname, cmd, with_check
--   FROM pg_policies
--   WHERE tablename = 'patient_notifications' AND cmd = 'INSERT';
--
-- 2. Teste funcional (com a sessão de um médico SEM vínculo com o
--    paciente-alvo — deve falhar):
--
--   INSERT INTO patient_notifications (user_id, type, title)
--   VALUES ('<uuid de paciente que não é dele>', 'prescription_issued', 'x');
--   -- esperado: ERROR 42501 (row-level security policy violation)
--
-- 3. Teste funcional (médico COM consulta ativa para o paciente — deve
--    funcionar): repetir o INSERT acima com um patient_id de paciente
--    real do médico logado.
-- =====================================================================
