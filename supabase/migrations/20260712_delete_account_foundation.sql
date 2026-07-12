-- =====================================================================
-- Malama — Fundação do delete-account
-- Migration: 20260712_delete_account_foundation.sql
--
-- Apple 5.1.1(v): a conta de login (auth.users) é apagada de verdade.
-- CFM/LGPD: registros clínicos e nutricionais sobrevivem vinculados ao
-- UUID antigo, que vira ID anônimo estável (sem FK para auth.users).
-- Religação: account_deletions guarda hash do email; se o usuário voltar,
-- um fluxo futuro de restore religa o histórico ao novo cadastro.
--
-- RODAR ANTES de deployar a nova versão da function delete-account.
-- Idempotente: FK já removida gera apenas NOTICE, nada aborta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Derruba as FKs das tabelas PRESERVADAS no delete.
--    Sem FK, o patient_id/user_id permanece como UUID puro após o
--    deleteUser — é o ID anônimo estável do desenho.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_constraint TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- clínico / regulatório (CFM)
      ('consultations',            'patient_id', 'auth',   'users'),
      ('prescriptions',            'patient_id', 'auth',   'users'),
      ('doctor_messages',          'patient_id', 'auth',   'users'),
      ('doctor_plan_adjustments',  'patient_id', 'auth',   'users'),
      ('clinical_notes',           'patient_id', 'auth',   'users'),
      ('patient_exams',            'patient_id', 'auth',   'users'),
      ('ai_clinical_reports',      'patient_id', 'auth',   'users'),
      ('clinical_conduct_events',  'patient_id', 'auth',   'users'),
      ('clinical_outcomes',        'patient_id', 'auth',   'users'),
      ('appointment_chats',        'patient_id', 'auth',   'users'),
      ('appointment_chats',        'closed_by',  'auth',   'users'), -- recriada como SET NULL abaixo
      ('glp1_doses',               'user_id',    'auth',   'users'),
      ('glp1_dose_logs',           'user_id',    'auth',   'users'),
      ('body_scans',               'user_id',    'auth',   'users'),
      ('body_scan_sessions',       'user_id',    'auth',   'users'),
      ('body_scan_measurements',   'user_id',    'auth',   'users'),
      ('activities',               'user_id',    'auth',   'users'),
      ('health_daily_metrics',     'user_id',    'auth',   'users'),
      -- chats preservados anonimizados (decisão de produto 12/07/2026)
      ('chat_messages',            'sender_id',  'auth',   'users'),
      ('chat_sessions',            'user_id',    'auth',   'users'),
      ('ai_chat_sessions',         'user_id',    'auth',   'users'),
      ('ai_chat_messages',         'user_id',    'auth',   'users'),
      ('coach_chat_messages',      'user_id',    'auth',   'users'),
      ('historical_summaries',     'user_id',    'auth',   'users'),
      -- billing preservado (auditoria fiscal + payout_items referencia credits)
      ('subscriptions',            'user_id',    'auth',   'users'),
      ('consultation_credits',     'user_id',    'auth',   'users'),
      -- nutricional / comportamental (via profiles) — dataset de treino
      ('daily_logs',                 'user_id', 'public', 'profiles'),
      ('meals',                      'user_id', 'public', 'profiles'),
      ('weight_logs',                'user_id', 'public', 'profiles'),
      ('flow_stats',                 'user_id', 'public', 'profiles'),
      ('quarterly_plans',            'user_id', 'public', 'profiles'),
      ('body_measurement_snapshots', 'user_id', 'public', 'profiles'),
      ('nutritionist_onboarding',    'user_id', 'public', 'profiles'),
      ('daily_checkins',             'user_id', 'public', 'profiles'),
      ('daily_missions',             'user_id', 'public', 'profiles'),
      ('coaching_insights',          'user_id', 'public', 'profiles'),
      ('meal_suggestions',           'user_id', 'public', 'profiles'),
      ('weekly_snapshots',           'user_id', 'public', 'profiles')
    ) AS t(tbl, col, ref_schema, ref_tbl)
  LOOP
    v_constraint := NULL;

    SELECT c.conname INTO v_constraint
    FROM pg_constraint c
    JOIN pg_class      tc ON tc.oid = c.conrelid
    JOIN pg_namespace  tn ON tn.oid = tc.relnamespace
    JOIN pg_class      rc ON rc.oid = c.confrelid
    JOIN pg_namespace  rn ON rn.oid = rc.relnamespace
    JOIN unnest(c.conkey) AS k(attnum) ON true
    JOIN pg_attribute  a  ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f'
      AND tn.nspname = 'public'  AND tc.relname = r.tbl
      AND a.attname  = r.col
      AND rn.nspname = r.ref_schema AND rc.relname = r.ref_tbl
    LIMIT 1;

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, v_constraint);
      RAISE NOTICE 'FK removida: %.% (%)', r.tbl, r.col, v_constraint;
    ELSE
      RAISE NOTICE 'FK inexistente (ok): %.% -> %.%', r.tbl, r.col, r.ref_schema, r.ref_tbl;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2) appointment_chats.closed_by volta como SET NULL
--    (era NO ACTION e bloqueava o deleteUser de quem fechou um chat;
--     a identidade de quem fechou não precisa sobreviver)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointment_chats_closed_by_fkey'
  ) THEN
    ALTER TABLE public.appointment_chats
      ADD CONSTRAINT appointment_chats_closed_by_fkey
      FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) Registro de deleções — trilha LGPD + chave de religação
--    email_hash = SHA-256(lower(email) + ':' + pepper) calculado na
--    edge function (pepper em DELETE_EMAIL_PEPPER, secret da function).
--    Nunca guardar o email em claro aqui.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,          -- UUID antigo = ID anônimo dos registros preservados
  email_hash        TEXT NOT NULL,
  deleted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_user_id  UUID,                   -- preenchido pelo fluxo futuro de restore
  restored_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_deletions_email_hash_idx
  ON public.account_deletions(email_hash);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
-- sem policies de propósito: somente service_role acessa

-- ---------------------------------------------------------------------
-- 4) RPC transacional chamada pela edge function (service_role apenas).
--    Concentra toda a limpeza DB-side num único ponto atômico.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_account_deletion(
  p_user_id    UUID,
  p_email      TEXT,
  p_email_hash TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancela consultas futuras (senão o médico comparece a uma sala vazia)
  UPDATE consultations
     SET status = 'cancelled'
   WHERE patient_id = p_user_id
     AND status = 'scheduled'
     AND scheduled_at > now();

  -- Snapshots históricos guardam display_name, avatar base64 e nascimento
  UPDATE profiles_history
     SET snapshot = (snapshot - 'display_name') - 'avatar_url' - 'date_of_birth'
   WHERE profile_id = p_user_id;

  -- Libera o assento B2B e anonimiza o email do vínculo.
  -- Casa por user_id E por email: cobre convite ainda não ativado.
  UPDATE empresa_colaboradores
     SET status      = 'removido',
         removido_em = COALESCE(removido_em, now()),
         email       = 'removido-' || id || '@anon.invalid'
   WHERE user_id = p_user_id
      OR lower(email) = lower(p_email);

  -- Persona RH (se a conta deletada for de RH)
  UPDATE rh_usuarios
     SET nome  = NULL,
         email = 'removido-' || id || '@anon.invalid'
   WHERE user_id = p_user_id;

  -- Trilha de auditoria + chave de religação futura
  INSERT INTO account_deletions (user_id, email_hash)
  VALUES (p_user_id, p_email_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_account_deletion(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_account_deletion(UUID, TEXT, TEXT)
  TO service_role;
