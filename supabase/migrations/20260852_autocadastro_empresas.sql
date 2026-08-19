-- =====================================================
-- Malama — autocadastro de empresas (sem ativação financeira)
--
-- A empresa pode criar sua conta e preparar o portal do RH, mas só passa a
-- entregar serviços e enviar convites depois da ativação comercial manual.
-- =====================================================

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_status_check;

ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_status_check
  CHECK (status IN ('em_configuracao', 'ativa', 'pausada', 'encerrada'));

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS autocadastro_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacidade_aceita_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tamanho_empresa_informado TEXT;

ALTER TABLE public.empresa_colaboradores
  DROP CONSTRAINT IF EXISTS empresa_colaboradores_status_check;

ALTER TABLE public.empresa_colaboradores
  ADD CONSTRAINT empresa_colaboradores_status_check
  CHECK (status IN ('rascunho', 'convidado', 'ativo', 'removido'));

COMMENT ON COLUMN public.empresas.autocadastro_em IS
  'Momento em que a empresa criou a conta pelo fluxo público.';
COMMENT ON COLUMN public.empresas.tamanho_empresa_informado IS
  'Faixa de colaboradores declarada no autocadastro; não substitui os assentos contratados.';
COMMENT ON VALUE 'em_configuracao' IS
  'Conta criada pelo autocadastro. O RH pode preparar dados, mas serviços e convites permanecem bloqueados até ativação comercial.';
