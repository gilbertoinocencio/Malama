-- =====================================================
-- Malama — Ajuste de assentos passa a valer sozinho na data
-- Migration: 20260906_assentos_agendados_automatico.sql
--
-- Aplicar via SQL Editor.
--
-- ⚠️ LEIA ANTES DE APLICAR: esta migration corrige o valor por assento
--    exibido ao RH (ver bloco 3). Empresa com modalidade contratada e SEM
--    preço definido para ela passa a exibir R$ 0,00 — de propósito, é o
--    mesmo critério que a cobrança usa. Hoje isso vale para "Nalu Poke"
--    (modo_mental = true, valor_assento_mental = NULL). Para ela voltar a
--    exibir o mesmo valor de antes, defina o preço da modalidade:
--
--      UPDATE empresas SET valor_assento_mental = 169.90
--       WHERE id = '6eec4f5a-5379-4f54-aad8-20a8f48d8723';
--
-- ─────────────────────────────────────────────────────────────────────
-- PROBLEMA 1 — o ajuste agendado nunca virava sozinho
--
--   rh_agendar_assentos grava max_assentos_agendado + max_assentos_vigencia
--   e para por aí. O ÚNICO lugar que promovia agendado → max_assentos era um
--   trecho dentro da Edge Function empresa-cobranca, ou seja: só acontecia
--   como efeito colateral de o super admin gerar manualmente a próxima
--   fatura. Sem fatura nova, o contrato ficava congelado no valor velho
--   indefinidamente, mesmo com a vigência vencida — que é exatamente o
--   estado atual da Nalu Poke (vigência 2026-09-01 vencida, painel ainda
--   mostrando 147 em vez de 143, última fatura de junho).
--
--   Acoplar "atualizar o contrato" a "emitir fatura" é frágil: qualquer
--   atraso no faturamento faz o painel do RH mentir sobre o próprio
--   contrato, contradizendo o aviso da tela ("passam a valer no mês
--   seguinte"). Agora a promoção é da DATA, não do faturamento:
--     · aplicar_assentos_agendados() faz o trabalho;
--     · pg_cron roda diariamente (00:10 de Brasília);
--     · rh_get_resumo_financeiro() também chama antes de responder, para
--       o painel se autocorrigir mesmo se o cron estiver fora do ar.
--   O trecho equivalente dentro de empresa-cobranca continua lá e vira
--   apenas rede de segurança (é idempotente: depois de promovido, o
--   agendado é NULL e ele não faz nada).
--
-- PROBLEMA 2 — a migration 20260843 não está aplicada neste banco
--
--   Evidência: empresa_valor_assento('Nalu Poke') devolve NULL, mas o
--   painel exibe R$ 169,90 — valor que só existe na coluna legada
--   valor_por_assento. Ou seja, rh_get_resumo_financeiro em produção ainda
--   é a versão de 20260622. Três consequências reais:
--
--     a) VALOR EXIBIDO ≠ VALOR COBRADO. A tela mostra a coluna legada; a
--        cobrança usa a soma das modalidades. Em "muchies" a diferença é
--        de R$ 66,00 para R$ 176,00 por assento — o portal subestima a
--        fatura em quase 3x.
--     b) AUMENTO DE ASSENTOS BLOQUEADO. A versão antiga de
--        rh_agendar_assentos recusa qualquer p_novo >= atual ("fale com a
--        Malama"), enquanto a tela promete "aumentos e reduções".
--     c) SEM CHECAGEM DE PERMISSÃO. A versão antiga não exige o módulo
--        'financeiro': qualquer RH ativo consegue alterar o contrato.
--
--   As três são corrigidas aqui, reaplicando o conteúdo da 20260843 junto
--   com a mudança acima.
-- =====================================================


-- ── 0. Evento de billing ganha o tipo do ajuste automático ────────────────
-- O super admin precisa enxergar que o contrato mudou sem ninguém ter
-- clicado em nada. O CHECK original só previa eventos de cobrança.

ALTER TABLE public.empresa_billing_eventos
  DROP CONSTRAINT IF EXISTS empresa_billing_eventos_tipo_check;

ALTER TABLE public.empresa_billing_eventos
  ADD CONSTRAINT empresa_billing_eventos_tipo_check
  CHECK (tipo IN ('inadimplente', 'bloqueio', 'reativacao', 'cobranca_gerada', 'ajuste_assentos'));


-- ── 1. A promoção em si ───────────────────────────────────────────────────
-- p_empresa_id NULL = varre todas (uso do cron). Com id = só aquela
-- empresa (uso da leitura do painel, para não escrever no banco inteiro a
-- cada carregamento de página de um RH).
--
-- A data de corte é a de Brasília, não a do servidor: às 00:30 UTC do dia 1
-- ainda são 21:30 do dia 30 no Brasil, e aplicar ali anteciparia a mudança
-- de contrato para o mês anterior.
--
-- Sem GRANT para authenticated de propósito: quem chama é o cron (dono do
-- banco) ou rh_get_resumo_financeiro, que é SECURITY DEFINER e executa como
-- dono. Ninguém precisa poder disparar isso direto do cliente.

CREATE OR REPLACE FUNCTION public.aplicar_assentos_agendados(p_empresa_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       RECORD;
  v_total INTEGER := 0;
BEGIN
  FOR r IN
    SELECT e.id,
           e.max_assentos           AS antigo,
           e.max_assentos_agendado  AS novo
    FROM public.empresas e
    WHERE e.max_assentos_agendado IS NOT NULL
      AND e.max_assentos_vigencia IS NOT NULL
      AND e.max_assentos_vigencia <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
      AND (p_empresa_id IS NULL OR e.id = p_empresa_id)
    FOR UPDATE
  LOOP
    -- A condição repetida no UPDATE fecha a corrida entre duas chamadas
    -- simultâneas (cron + carregamento do painel no mesmo instante): a
    -- segunda encontra o agendado já NULL e não grava evento duplicado.
    UPDATE public.empresas
    SET max_assentos          = r.novo,
        max_assentos_agendado = NULL,
        max_assentos_vigencia = NULL,
        updated_at            = now()
    WHERE id = r.id
      AND max_assentos_agendado IS NOT NULL;

    IF FOUND THEN
      INSERT INTO public.empresa_billing_eventos (empresa_id, tipo, descricao)
      VALUES (
        r.id, 'ajuste_assentos',
        format('Ajuste agendado aplicado automaticamente: %s → %s assentos contratados.',
               COALESCE(r.antigo::text, '—'), r.novo)
      );
      v_total := v_total + 1;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_assentos_agendados(UUID) FROM PUBLIC, anon, authenticated;


-- ── 2. Cron diário ────────────────────────────────────────────────────────
-- 03:10 UTC = 00:10 de Brasília. É SQL puro: não precisa de service role
-- key nem de pg_net, então não depende do Vault como os outros jobs.

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('aplicar-assentos-agendados')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aplicar-assentos-agendados');

    PERFORM cron.schedule(
      'aplicar-assentos-agendados',
      '10 3 * * *',
      $job$ SELECT public.aplicar_assentos_agendados(); $job$
    );
    RAISE NOTICE 'Job aplicar-assentos-agendados agendado (03:10 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron ausente — a promoção continua acontecendo na leitura do painel do RH.';
  END IF;
END
$cron$;


-- ── 3. Resumo financeiro: promove antes de responder ──────────────────────
-- Deixa de ser LANGUAGE sql STABLE porque agora escreve. As colunas de
-- retorno são as mesmas; o DROP é a precaução padrão deste projeto para
-- recriar função com corpo/linguagem diferente.
--
-- valor_por_assento passa a vir de empresa_valor_assento() — a mesma conta
-- que a Edge Function de cobrança usa. É o que corrige a divergência entre
-- o que o RH lê na tela e o que chega na fatura.

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
  max_assentos_vigencia DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
BEGIN
  -- Conjunto vazio (e não exceção) quando falta permissão: é o mesmo
  -- comportamento do WHERE da versão anterior, e a tela já sabe tratar
  -- "sem dados financeiros".
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
    e.max_assentos_vigencia
  FROM public.empresas e
  WHERE e.id = v_empresa;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_get_resumo_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_get_resumo_financeiro() TO authenticated;


-- ── 4. Agendamento: permissão, trava de concorrência e aumento liberado ───
-- Conteúdo da 20260843 (que este banco não tem), com uma correção: a
-- vigência também passa a ser calculada no fuso de Brasília, senão quem
-- agenda depois das 21h do último dia do mês recebe vigência de DOIS meses
-- à frente, porque em UTC o mês já virou.

CREATE OR REPLACE FUNCTION public.rh_agendar_assentos(p_novo INTEGER)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_atual      INTEGER;
  v_em_uso     INTEGER;
  v_hoje       DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_vigencia   DATE;
BEGIN
  v_vigencia := (date_trunc('month', v_hoje) + interval '1 month')::date;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  IF NOT public.rh_tem_permissao('financeiro') THEN
    RAISE EXCEPTION 'Sem permissão para alterar os assentos contratados';
  END IF;

  SELECT r.empresa_id
    INTO v_empresa_id
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid()
    AND r.ativo
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não é RH ativo de nenhuma empresa';
  END IF;

  -- Serializa ajustes da mesma empresa e impede que duas solicitações
  -- concorrentes sobrescrevam o contrato sem enxergar o mesmo estado.
  SELECT e.max_assentos
    INTO v_atual
  FROM public.empresas e
  WHERE e.id = v_empresa_id
  FOR UPDATE;

  IF p_novo IS NULL OR p_novo < 1 THEN
    RAISE EXCEPTION 'A quantidade de assentos deve ser de pelo menos 1';
  END IF;

  IF p_novo = v_atual THEN
    RAISE EXCEPTION 'A nova quantidade deve ser diferente da quantidade atual';
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_em_uso
  FROM public.empresa_colaboradores ec
  WHERE ec.empresa_id = v_empresa_id
    AND ec.status IN ('ativo', 'convidado');

  IF p_novo < v_em_uso THEN
    RAISE EXCEPTION 'Há % colaboradores ocupando assento. O novo total não pode ser menor que %.',
      v_em_uso, v_em_uso;
  END IF;

  UPDATE public.empresas
  SET max_assentos_agendado = p_novo,
      max_assentos_vigencia = v_vigencia,
      updated_at = now()
  WHERE id = v_empresa_id;

  RETURN v_vigencia;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_agendar_assentos(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_agendar_assentos(INTEGER) TO authenticated;


-- ── 5. Aplica o que já está vencido agora mesmo ───────────────────────────
-- Sem isto, a Nalu Poke só sairia de 147 no próximo carregamento do painel
-- ou na primeira execução do cron.

SELECT public.aplicar_assentos_agendados() AS empresas_atualizadas;
