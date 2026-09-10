-- =====================================================
-- Malama — Período grátis (cortesia) por empresa
-- Migration: 20260907_periodo_gratis.sql
--
-- Aplicar via SQL Editor, DEPOIS de 20260906.
--
-- Para oferecer meses gratuitos aos primeiros clientes sem depender de
-- "lembrar de não clicar em gerar fatura", e sem o truque de zerar o preço.
--
-- POR QUE NÃO ZERAR O PREÇO DO ASSENTO
--   Preço 0 passa pelo porteiro de empresa_valor_assento() (0 não é NULL),
--   a Edge Function grava a linha em empresa_faturas ANTES de falar com o
--   gateway, e só então o Asaas recusa uma cobrança de valor zero. Sobra
--   uma fatura órfã de R$ 0,00 "pendente", sem boleto, aparecendo no painel
--   do RH como dívida. Além disso o preço real do contrato se perderia —
--   e ele precisa continuar registrado para quando a cortesia acabar.
--
-- O QUE ESTE CAMPO FAZ
--   cortesia_ate é a data do ÚLTIMO dia grátis. Enquanto ela não passa:
--     · a cobrança se recusa a emitir (trava no servidor, não na tela);
--     · o painel do RH mostra o período em vez de dívida.
--   O contrato (assentos e preço por modalidade) continua registrado
--   normalmente — só não é faturado ainda.
-- =====================================================

DO $pre$
BEGIN
  IF to_regprocedure('public.aplicar_assentos_agendados(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Aplique antes a migration 20260906_assentos_agendados_automatico.sql — '
                    'esta aqui recria rh_get_resumo_financeiro em cima dela.';
  END IF;
END
$pre$;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS cortesia_ate DATE;

COMMENT ON COLUMN public.empresas.cortesia_ate IS
  'Último dia do período grátis. Enquanto current_date <= cortesia_ate, nenhuma fatura é emitida. NULL = sem cortesia. O preço do contrato continua valendo nas outras colunas.';


-- ── Resumo do RH devolve a cortesia ───────────────────────────────────────
-- DROP obrigatório: muda as colunas de retorno.

DROP FUNCTION IF EXISTS public.rh_get_resumo_financeiro();

CREATE FUNCTION public.rh_get_resumo_financeiro()
RETURNS TABLE (
  empresa_id            UUID,
  nome                  TEXT,
  cnpj                  TEXT,
  cobranca_email        TEXT,
  cobranca_responsavel  TEXT,
  valor_por_assento     NUMERIC,
  max_assentos          INTEGER,
  assentos_ocupados     BIGINT,
  acesso_bloqueado      BOOLEAN,
  max_assentos_agendado INTEGER,
  max_assentos_vigencia DATE,
  cortesia_ate          DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
BEGIN
  IF NOT public.rh_tem_permissao('financeiro') THEN
    RETURN;
  END IF;

  SELECT r.empresa_id INTO v_empresa
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid() AND r.ativo
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.aplicar_assentos_agendados(v_empresa);

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.cnpj,
    e.cobranca_email,
    e.cobranca_responsavel,
    public.empresa_valor_assento(e.id),
    e.max_assentos,
    (SELECT COUNT(*)
       FROM public.empresa_colaboradores ec
      WHERE ec.empresa_id = e.id
        AND ec.status IN ('ativo', 'convidado')),
    e.acesso_bloqueado,
    e.max_assentos_agendado,
    e.max_assentos_vigencia,
    e.cortesia_ate
  FROM public.empresas e
  WHERE e.id = v_empresa;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_get_resumo_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_get_resumo_financeiro() TO authenticated;
