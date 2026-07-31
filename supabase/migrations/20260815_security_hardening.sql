-- Malama: hardening de acesso para o piloto mobile B2B.
-- Esta migration fecha exposicoes anonimas, corrige IDORs/RPCs, protege
-- campos administrativos e torna anexos clinicos privados.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Profissionais: tabela completa somente para o proprio profissional/admin.
-- ---------------------------------------------------------------------------
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'doctors'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.doctors', p.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.doctors FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.doctors TO authenticated;

CREATE POLICY doctors_own_select ON public.doctors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY doctors_own_insert ON public.doctors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY doctors_own_update ON public.doctors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY doctors_admin_all ON public.doctors
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.protect_doctor_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.platform_fee_percent IS DISTINCT FROM OLD.platform_fee_percent
     OR NEW.nivel IS DISTINCT FROM OLD.nivel
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.total_consultations IS DISTINCT FROM OLD.total_consultations THEN
    RAISE EXCEPTION 'Campos administrativos do profissional nao podem ser alterados pelo proprio usuario';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_doctor_privileged_fields ON public.doctors;
CREATE TRIGGER protect_doctor_privileged_fields
  BEFORE INSERT OR UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.protect_doctor_privileged_fields();

DROP VIEW IF EXISTS public.public_doctors;
CREATE VIEW public.public_doctors WITH (security_barrier = true) AS
SELECT
  id, name, tipo_profissional, crm, crm_state,
  conselho_tipo, conselho_numero, conselho_uf,
  specialty, specialty_custom, objectives, bio, photo_url,
  consultation_price, consultation_duration, rating, total_consultations,
  status
FROM public.doctors
WHERE status = 'approved';

REVOKE ALL ON public.public_doctors FROM PUBLIC;
GRANT SELECT ON public.public_doctors TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_doctor_referral_preview(p_token text)
RETURNS TABLE(id uuid, name text, specialty text, specialty_custom text, photo_url text, bio text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT d.id, d.name, d.specialty::text, d.specialty_custom, d.photo_url, d.bio
  FROM public.doctors d
  WHERE d.patient_referral_token = p_token AND d.status = 'approved'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_doctor_referral_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_referral_preview(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_doctor_invite_preview(p_token text)
RETURNS TABLE(id uuid, email text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT d.id, d.email FROM public.doctors d
  WHERE d.invite_token = p_token AND d.status = 'pending'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_doctor_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_invite_preview(text) TO anon, authenticated;

-- Tokens que estiveram expostos deixam de ser validos.
UPDATE public.doctors
SET invite_token = CASE WHEN invite_token IS NULL THEN NULL ELSE 'invite_' || replace(gen_random_uuid()::text, '-', '') END,
    patient_referral_token = CASE WHEN patient_referral_token IS NULL THEN NULL ELSE 'ref_' || replace(gen_random_uuid()::text, '-', '') END
WHERE invite_token IS NOT NULL OR patient_referral_token IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Influenciadores: sem leitura direta publica e sem token usado como senha.
-- ---------------------------------------------------------------------------
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'influencers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.influencers', p.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.influencers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencers TO authenticated;

CREATE POLICY influencers_own_select ON public.influencers
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY influencers_admin_all ON public.influencers
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.get_influencer_referral_preview(p_token text)
RETURNS TABLE(id uuid, name text, instagram_handle text, commission_per_referral numeric)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT i.id, i.name, i.instagram_handle, i.commission_per_referral
  FROM public.influencers i
  WHERE i.referral_token = p_token AND i.status = 'active'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_influencer_referral_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_influencer_referral_preview(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_influencer_setup_preview(p_token text)
RETURNS TABLE(id uuid, name text, email text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT i.id, i.name, i.email
  FROM public.influencers i
  WHERE i.setup_token = p_token AND i.user_id IS NULL AND i.status = 'active'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_influencer_setup_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_influencer_setup_preview(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_influencer_account(p_setup_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;

  UPDATE public.influencers i
  SET user_id = auth.uid(), setup_token = NULL, updated_at = now()
  WHERE i.setup_token = p_setup_token
    AND i.user_id IS NULL
    AND i.status = 'active'
    AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_influencer_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_influencer_account(text) TO authenticated;

-- O valor da comissao vem do banco, nunca do cliente.
CREATE OR REPLACE FUNCTION public.register_influencer_referral(p_influencer_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;

  INSERT INTO public.influencer_referrals(influencer_id, user_id, commission_amount)
  SELECT i.id, auth.uid(), i.commission_per_referral
  FROM public.influencers i
  WHERE i.id = p_influencer_id AND i.status = 'active'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.register_influencer_referral(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_influencer_referral(uuid) TO authenticated;

-- Invalida todos os segredos que podiam ser enumerados.
UPDATE public.influencers
SET access_token = NULL,
    setup_token = CASE WHEN setup_token IS NULL THEN NULL ELSE 'setup_' || replace(gen_random_uuid()::text, '-', '') END,
    referral_token = 'inf_' || replace(gen_random_uuid()::text, '-', '');

-- Nenhum usuario registra ou paga comissao por escrita direta.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'influencer_referrals'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.influencer_referrals', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.influencer_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY influencer_referrals_owner_read ON public.influencer_referrals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = influencer_id AND i.user_id = auth.uid()
  ));
CREATE POLICY influencer_referrals_admin_all ON public.influencer_referrals
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 3. RPCs: o ator sempre e auth.uid(); parametros de user_id nao dao poder.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_reaction(p_post_id uuid, p_user_id uuid, p_reaction_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF p_reaction_type NOT IN ('heart', 'fire', 'muscle', 'clap', 'hug') THEN RAISE EXCEPTION 'Reacao invalida'; END IF;
  INSERT INTO public.reactions(post_id, user_id, reaction_type)
  VALUES (p_post_id, auth.uid(), p_reaction_type)
  ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_reaction(p_post_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM public.reactions WHERE post_id = p_post_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.report_post_fn(p_post_id uuid, p_user_id uuid, p_reason text, p_detail text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted integer; v_count integer;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF length(coalesce(p_reason, '')) NOT BETWEEN 1 AND 80 OR length(coalesce(p_detail, '')) > 1000 THEN
    RAISE EXCEPTION 'Denuncia invalida';
  END IF;
  INSERT INTO public.post_reports(post_id, reporter_id, reason, detail)
  VALUES (p_post_id, auth.uid(), p_reason, p_detail)
  ON CONFLICT (post_id, reporter_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 1 THEN
    UPDATE public.posts SET report_count = report_count + 1 WHERE id = p_post_id
      RETURNING report_count INTO v_count;
    IF v_count >= 3 THEN
      UPDATE public.posts SET is_hidden = true, hidden_reason = 'reports' WHERE id = p_post_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.follow_user_fn(p_follower uuid, p_following uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted integer;
BEGIN
  IF auth.uid() IS NULL OR p_follower IS DISTINCT FROM auth.uid() OR p_following = auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO public.follows(follower_id, following_id) VALUES (auth.uid(), p_following)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 1 THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = auth.uid();
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = p_following;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_user_fn(p_follower uuid, p_following uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE removed integer;
BEGIN
  IF auth.uid() IS NULL OR p_follower IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM public.follows WHERE follower_id = auth.uid() AND following_id = p_following;
  GET DIAGNOSTICS removed = ROW_COUNT;
  IF removed = 1 THEN
    UPDATE public.profiles SET following_count = greatest(0, following_count - 1) WHERE id = auth.uid();
    UPDATE public.profiles SET followers_count = greatest(0, followers_count - 1) WHERE id = p_following;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_water_intake(p_user_id uuid, p_date date, p_ml integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_water_goal integer; v_new_total integer;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF p_ml NOT BETWEEN 1 AND 2000 OR p_date NOT BETWEEN current_date - 1 AND current_date + 1 THEN
    RAISE EXCEPTION 'Registro de agua invalido';
  END IF;
  SELECT greatest(3000, round(coalesce(weight, 70) * 35)::integer)
       + CASE activity_level WHEN 'intense' THEN 600 WHEN 'moderate' THEN 300 ELSE 0 END
  INTO v_water_goal FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.daily_logs(user_id, date, water_intake, water_goal)
  VALUES (auth.uid(), p_date, p_ml, coalesce(v_water_goal, 3000))
  ON CONFLICT (user_id, date) DO UPDATE
    SET water_intake = public.daily_logs.water_intake + p_ml, updated_at = now()
  RETURNING water_intake INTO v_new_total;
  RETURN v_new_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_name_for_doctor(p_patient_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.consultations c
    JOIN public.doctors d ON d.id = c.doctor_id
    WHERE d.user_id = auth.uid() AND c.patient_id = p_patient_id
  ) THEN
    RAISE EXCEPTION 'Paciente nao vinculado ao profissional';
  END IF;
  SELECT nullif(trim(p.display_name), '') INTO v_name FROM public.profiles p WHERE p.id = p_patient_id;
  IF v_name IS NOT NULL THEN RETURN v_name; END IF;
  SELECT split_part(u.email, '@', 1) INTO v_name FROM auth.users u WHERE u.id = p_patient_id;
  RETURN coalesce(v_name, 'Paciente');
END;
$$;

DO $$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.upsert_reaction(uuid,uuid,text)', 'public.remove_reaction(uuid,uuid)',
    'public.report_post_fn(uuid,uuid,text,text)', 'public.follow_user_fn(uuid,uuid)',
    'public.unfollow_user_fn(uuid,uuid)', 'public.log_water_intake(uuid,date,integer)',
    'public.get_patient_name_for_doctor(uuid)'
  ] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO authenticated';
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Gate B2B e quotas atomicas para APIs de custo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_mobile_app()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'rh')
    OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.influencers i WHERE i.user_id = auth.uid() AND i.status = 'active')
    OR EXISTS (
      SELECT 1 FROM public.empresa_colaboradores ec
      JOIN public.empresas e ON e.id = ec.empresa_id
      WHERE (ec.user_id = auth.uid() OR lower(ec.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
        AND ec.status IN ('convidado', 'ativo')
        AND e.status = 'ativa' AND e.acesso_bloqueado = false
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_mobile_app() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_mobile_app() TO authenticated;

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  user_id uuid NOT NULL,
  scope text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, scope)
);
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_edge_quota(p_scope text, p_limit integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed boolean;
BEGIN
  IF auth.uid() IS NULL OR p_scope NOT IN ('gemini', 'turn')
     OR p_limit NOT BETWEEN 1 AND 100 OR p_window_seconds NOT BETWEEN 60 AND 86400 THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_scope, 0));
  INSERT INTO public.edge_rate_limits(user_id, scope, window_start, request_count)
  VALUES (auth.uid(), p_scope, now(), 1)
  ON CONFLICT (user_id, scope) DO UPDATE SET
    window_start = CASE WHEN public.edge_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
                        THEN now() ELSE public.edge_rate_limits.window_start END,
    request_count = CASE WHEN public.edge_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
                         THEN 1 ELSE public.edge_rate_limits.request_count + 1 END
  RETURNING request_count <= p_limit INTO allowed;
  RETURN allowed;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_edge_quota(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_edge_quota(text, integer, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Chat e exames: objetos privados, caminhos internos e remetente imutavel.
-- ---------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id IN ('chat-files', 'patient-exams');

UPDATE public.chat_messages
SET file_url = regexp_replace(file_url, '^.*/object/public/chat-files/', '')
WHERE file_url LIKE '%/object/public/chat-files/%';
UPDATE public.patient_exams
SET file_url = regexp_replace(file_url, '^.*/object/public/patient-exams/', '')
WHERE file_url LIKE '%/object/public/patient-exams/%';

CREATE OR REPLACE FUNCTION public.protect_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE role_for_user text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.chat_id := OLD.chat_id; NEW.sender_id := OLD.sender_id; NEW.sender_role := OLD.sender_role;
    NEW.content := OLD.content; NEW.file_url := OLD.file_url; NEW.file_name := OLD.file_name;
    NEW.file_type := OLD.file_type; NEW.file_size_kb := OLD.file_size_kb;
    RETURN NEW;
  END IF;

  SELECT CASE WHEN EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.appointment_chats ac ON ac.doctor_id = d.id
      WHERE ac.id = NEW.chat_id AND d.user_id = auth.uid() AND ac.status = 'open'
    ) THEN 'doctor'
    WHEN EXISTS (
      SELECT 1 FROM public.appointment_chats ac
      WHERE ac.id = NEW.chat_id AND ac.patient_id = auth.uid() AND ac.status = 'open'
    ) THEN 'patient' END INTO role_for_user;
  IF role_for_user IS NULL THEN RAISE EXCEPTION 'Usuario nao participa deste chat aberto'; END IF;

  NEW.sender_id := auth.uid(); NEW.sender_role := role_for_user;
  IF length(coalesce(NEW.content, '')) > 5000 THEN RAISE EXCEPTION 'Mensagem muito longa'; END IF;
  IF NEW.file_url IS NOT NULL THEN
    IF NEW.file_url NOT LIKE format('chats/%s/%%', NEW.chat_id)
       OR NEW.file_type NOT IN ('application/pdf','image/jpeg','image/jpg','image/png','image/webp','image/heic','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain')
       OR coalesce(NEW.file_size_kb, 0) NOT BETWEEN 1 AND 10240
       OR length(coalesce(NEW.file_name, '')) NOT BETWEEN 1 AND 255 THEN
      RAISE EXCEPTION 'Anexo de chat invalido';
    END IF;
  ELSIF length(trim(coalesce(NEW.content, ''))) = 0 THEN
    RAISE EXCEPTION 'Mensagem vazia';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_chat_message ON public.chat_messages;
CREATE TRIGGER protect_chat_message BEFORE INSERT OR UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.protect_chat_message();

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') ILIKE '%chat-files%' OR coalesce(with_check, '') ILIKE '%chat-files%')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname); END LOOP;
END $$;

CREATE POLICY chat_files_participant_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = 'chats' AND EXISTS (
  SELECT 1 FROM public.appointment_chats ac
  WHERE ac.id::text = (storage.foldername(name))[2] AND ac.status = 'open'
    AND (ac.patient_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.doctors d WHERE d.id = ac.doctor_id AND d.user_id = auth.uid()
    ))
));
CREATE POLICY chat_files_participant_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = 'chats' AND EXISTS (
  SELECT 1 FROM public.appointment_chats ac
  WHERE ac.id::text = (storage.foldername(name))[2]
    AND (ac.patient_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.doctors d WHERE d.id = ac.doctor_id AND d.user_id = auth.uid()
    ))
));

COMMIT;
