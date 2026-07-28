-- =====================================================
-- Malama — Marcador próprio para o cadastro do modo Mental
-- Migration: 20260808_onboarding_mental.sql
--
-- Aplicar via SQL Editor.
--
-- POR QUE UMA COLUNA NOVA EM VEZ DE REUSAR onboarding_completed
-- O cadastro do modo Mental é curto (nome, nascimento, contato de
-- emergência, termo) e não coleta nada do que o produto metabólico precisa:
-- altura, peso, metas, janela alimentar, tipo de dieta.
--
-- Se ele marcasse onboarding_completed, o colaborador de uma empresa que
-- DEPOIS contratasse também o modo metabólico nunca passaria pelo cadastro
-- nutricional — e cairia num painel de calorias sem nenhum dos dados que
-- ele precisa para funcionar.
--
-- Dois marcadores independentes resolvem: cada modo pede o seu quando for
-- contratado, na ordem em que for contratado.
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_mental_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.onboarding_mental_completed IS
  'Cadastro curto do modo Mental concluído. Independente de onboarding_completed, que é do modo metabólico.';
