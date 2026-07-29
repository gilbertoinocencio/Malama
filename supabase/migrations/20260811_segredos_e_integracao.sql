-- =====================================================
-- Malama — Fecha leitura de segredos e cria log da integração Asaas
-- Migration: 20260811_segredos_e_integracao.sql
--
-- Aplicar via SQL Editor.
--
-- ⚠️ CORREÇÃO DE SEGURANÇA
-- platform_settings tinha a policy "Anyone can read settings" com
-- USING (true) para authenticated: QUALQUER usuário logado — inclusive um
-- paciente — conseguia ler a tabela inteira. E ali dentro está o
-- 'service_role_key_for_cron', que é a service role key da plataforma:
-- acesso irrestrito ao banco, ignorando toda a RLS.
--
-- Na prática, qualquer conta de paciente conseguia extrair a chave que dá
-- acesso a prontuário, dado psicossocial e financeiro de todo mundo.
--
-- A leitura passa a excluir chaves com cara de segredo. Super admin
-- continua lendo tudo (o painel de configurações depende disso), e os jobs
-- do pg_cron não são afetados: rodam como owner do banco, que ignora RLS.
--
-- Fora do admin, o app só lê 'default_platform_fee' e os
-- '*_value_nivel*' — nenhum casa com o filtro.
--
-- NOTA: isto fecha a exposição, mas o certo é a chave não morar nesta
-- tabela. Migrar para o Vault exige reescrever os comandos dos jobs de
-- cron já agendados (billing_cron, payout_schedule) — trabalho separado,
-- com risco próprio, que não cabe embutir aqui.
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read settings" ON platform_settings;

CREATE POLICY "Read non-sensitive settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR NOT (
      key ILIKE '%key%'
      OR key ILIKE '%secret%'
      OR key ILIKE '%token%'
      OR key ILIKE '%password%'
      OR key ILIKE '%senha%'
      OR key ILIKE '%api%'
    )
  );

COMMENT ON TABLE platform_settings IS
  'Configurações da plataforma. Chaves cujo nome contenha key/secret/token/password/senha/api só são legíveis por super admin — ver policy "Read non-sensitive settings". Segredo novo deve ir para secret de Edge Function ou Vault, não para cá.';


-- =====================================================
-- LOG DA INTEGRAÇÃO
--
-- Duas necessidades no mesmo lugar:
--   1. Saber se o Asaas está de fato entregando eventos (hoje só dá para
--      ver no log do Supabase, que ninguém abre por rotina).
--   2. Fechar o ponto cego da emissão de créditos: se ela falhar depois do
--      pagamento, a fatura fica paga, a empresa ativa e os colaboradores
--      sem consulta — sem nenhum sinal no painel.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.integracao_eventos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem     TEXT NOT NULL DEFAULT 'asaas',
  evento     TEXT NOT NULL,
  /** Identificador externo (payment id do Asaas) ou id interno afetado. */
  referencia TEXT,
  status     TEXT NOT NULL CHECK (status IN ('ok', 'erro', 'ignorado')),
  /** Mensagem curta. NUNCA gravar payload cru: vem com dado de cliente. */
  detalhe    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integracao_eventos_recentes
  ON public.integracao_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integracao_eventos_erro
  ON public.integracao_eventos(created_at DESC)
  WHERE status = 'erro';

ALTER TABLE public.integracao_eventos ENABLE ROW LEVEL SECURITY;

-- Só super admin lê. O webhook escreve com service_role, que ignora RLS.
DROP POLICY IF EXISTS "super_admin reads integracao_eventos" ON public.integracao_eventos;
CREATE POLICY "super_admin reads integracao_eventos"
  ON public.integracao_eventos FOR SELECT TO authenticated
  USING (is_super_admin());


-- =====================================================
-- Resumo para o painel: últimos eventos + contagem de falhas recentes
-- =====================================================

DROP FUNCTION IF EXISTS admin_integracao_status(INT);

CREATE OR REPLACE FUNCTION admin_integracao_status(p_limite INT DEFAULT 20)
RETURNS JSONB AS $$
DECLARE
  v_eventos JSONB;
  v_erros   INT;
  v_ultimo  TIMESTAMPTZ;
BEGIN
  IF NOT is_super_admin() THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(e ORDER BY (e ->> 'created_at') DESC), '[]'::jsonb)
    INTO v_eventos
  FROM (
    SELECT to_jsonb(x) AS e FROM (
      SELECT id, origem, evento, referencia, status, detalhe, created_at
      FROM public.integracao_eventos
      ORDER BY created_at DESC
      LIMIT GREATEST(p_limite, 1)
    ) x
  ) y;

  SELECT COUNT(*)::int INTO v_erros
  FROM public.integracao_eventos
  WHERE status = 'erro' AND created_at >= now() - INTERVAL '7 days';

  SELECT MAX(created_at) INTO v_ultimo FROM public.integracao_eventos;

  RETURN jsonb_build_object(
    'eventos', v_eventos,
    'erros_7d', COALESCE(v_erros, 0),
    'ultimo_evento', v_ultimo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION admin_integracao_status(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_integracao_status(INT) TO authenticated;
