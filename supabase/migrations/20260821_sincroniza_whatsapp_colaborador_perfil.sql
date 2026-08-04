-- =====================================================
-- Malama — Leva o WhatsApp coletado pelo RH no cadastro do
-- colaborador (empresa_colaboradores.whatsapp) para o perfil do
-- paciente (profiles.whatsapp), sem exigir que ele digite de novo
-- no app. Cobre os dois momentos em que o vínculo pode se formar:
--
--   1) Conta já existia quando o RH adicionou o colaborador — a
--      Edge Function invite-colaborador já atualiza profiles direto.
--   2) Conta é criada depois (convite aceito ou o próprio colaborador
--      se cadastra com o mesmo e-mail) — pego aqui no handle_new_user,
--      no momento em que o profile nasce.
--
-- Em ambos os casos, só preenche se o usuário ainda não tiver o
-- próprio WhatsApp salvo — o dado dele tem prioridade sobre o que o
-- RH informou.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.email
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    (
      SELECT ec.whatsapp FROM empresa_colaboradores ec
      WHERE ec.email = NEW.email
        AND ec.status <> 'removido'
        AND ec.whatsapp IS NOT NULL
      ORDER BY ec.data_adicao DESC
      LIMIT 1
    )
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: vínculos que já existem hoje entre colaborador e conta
-- (user_id já setado) onde o RH informou WhatsApp mas o perfil ainda
-- não tem.
UPDATE profiles p
SET whatsapp = ec.whatsapp
FROM empresa_colaboradores ec
WHERE ec.user_id = p.id
  AND ec.status <> 'removido'
  AND ec.whatsapp IS NOT NULL
  AND (p.whatsapp IS NULL OR TRIM(p.whatsapp) = '');
