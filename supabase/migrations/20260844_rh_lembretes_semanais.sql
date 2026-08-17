-- =====================================================
-- Malama — Lembretes do RH (NR-1)
--
-- Até aqui toda a condução dependia de o RH lembrar de entrar no painel.
-- Existiam funções de lembrete para consulta e para GLP-1, e nenhuma com
-- destino ao RH: campanha fechava, medida vencia e a janela de medição
-- abria sem que nada saísse do navegador. Em ferramenta de uso esporádico
-- é o produto que precisa puxar o cliente de volta.
--
-- O QUE ESTA FUNÇÃO NÃO FAZ: decidir qual é o próximo passo. Essa decisão
-- vive em `src/lib/rhJornada.ts` e em um lugar só — replicá-la aqui daria
-- duas fontes que divergem na primeira mudança. O que sai daqui são FATOS
-- COM DATA (o que vence, quando, e quanto falta), que o e-mail lista e o
-- painel prioriza.
--
-- A contagem de convidados/respondentes copia `rh_listar_campanhas` de
-- propósito: é o número que o RH vê na linha da campanha, e um e-mail
-- dizendo "38 de 41" enquanto a tela diz outra coisa destrói a confiança
-- nos dois.
-- =====================================================

-- ── Dedupe de envio ────────────────────────────────────
-- Sem isto, um cron diário manda o mesmo lembrete todo dia até a pessoa
-- agir — que é exatamente como um canal útil vira filtro de spam.
CREATE TABLE IF NOT EXISTS public.rh_lembretes_enviados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  -- 'semanal' = digest da semana; 'campanha_fechando' = alerta pontual.
  tipo        TEXT NOT NULL,
  -- O que identifica esta ocorrência: a semana ISO, ou o id da campanha.
  -- É o par (tipo, referencia) que impede o reenvio.
  referencia  TEXT NOT NULL,
  destinatarios INT NOT NULL DEFAULT 0,
  enviado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo, referencia)
);

ALTER TABLE public.rh_lembretes_enviados ENABLE ROW LEVEL SECURITY;

-- Só o super admin lê. O RH não precisa ver o log de envio, e a tabela
-- expõe cadência comercial de todas as empresas.
DROP POLICY IF EXISTS "super_admin all rh_lembretes" ON public.rh_lembretes_enviados;
CREATE POLICY "super_admin all rh_lembretes"
  ON public.rh_lembretes_enviados FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ── Pendências por empresa ─────────────────────────────
-- Mudança de retorno exige DROP antes: o Postgres recusa CREATE OR REPLACE
-- quando a assinatura de saída muda.
DROP FUNCTION IF EXISTS public.rh_pendencias_para_lembrete();

CREATE FUNCTION public.rh_pendencias_para_lembrete()
RETURNS TABLE (
  empresa_id        UUID,
  empresa_nome      TEXT,
  destinatarios     JSONB,
  campanhas_fechando JSONB,
  adesao_baixa      JSONB,
  medidas_atrasadas INT,
  medidas_vencendo  INT,
  medicoes_vencidas JSONB,
  documentos_pendentes INT
) AS $$
WITH empresas_ativas AS (
  SELECT e.id, e.nome
    FROM public.empresas e
   WHERE e.status = 'ativa'
),

-- Quem recebe. O principal sempre; os auxiliares só se tiverem permissão
-- sobre o que o e-mail fala — mandar "sua campanha fecha em 2 dias" para
-- quem não pode abrir a aba de saúde mental é ruído e vaza organização
-- interna da empresa.
destinatarios_por_empresa AS (
  SELECT r.empresa_id,
         jsonb_agg(jsonb_build_object('email', r.email, 'nome', r.nome)
                   ORDER BY r.principal DESC, r.email) AS lista
    FROM public.rh_usuarios r
   WHERE r.ativo
     AND r.email IS NOT NULL
     AND (r.principal
          OR r.permissoes && ARRAY['saude_mental', 'plano_acao', 'compliance'])
   GROUP BY r.empresa_id
),

-- Mesma expressão de `rh_listar_campanhas`. DISTINCT porque
-- empresa_colaboradores guarda histórico, e a resposta anônima (link do
-- setor) soma junto com a respondida dentro do app.
campanhas_abertas AS (
  SELECT c.id, c.empresa_id, c.janela_inicio, c.janela_fim, i.nome AS instrumento_nome,
         (SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int
            FROM public.empresa_colaboradores ec
           WHERE ec.empresa_id = c.empresa_id
             AND ec.status IN ('ativo', 'convidado')
             AND (c.setores IS NULL OR ec.setor = ANY (c.setores))) AS convidados,
         (SELECT COUNT(DISTINCT pa.user_id)::int
            FROM public.psychosocial_assessments pa
           WHERE pa.campaign_id = c.id)
         + (SELECT COUNT(*)::int
              FROM public.psychosocial_anonymous_responses ar
             WHERE ar.campaign_id = c.id) AS respondentes
    FROM public.psychosocial_campaigns c
    JOIN public.psychosocial_instruments i ON i.code = c.instrument
   WHERE c.status = 'aberta'
),

fechando AS (
  SELECT ca.empresa_id,
         jsonb_agg(jsonb_build_object(
           'campanha_id', ca.id,
           'instrumento', ca.instrumento_nome,
           'janela_fim', ca.janela_fim,
           'dias', (ca.janela_fim - CURRENT_DATE),
           'respondentes', ca.respondentes,
           'convidados', ca.convidados
         ) ORDER BY ca.janela_fim) AS lista
    FROM campanhas_abertas ca
   WHERE ca.janela_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + 3
   GROUP BY ca.empresa_id
),

-- Adesão baixa só depois de passada a metade da janela: antes disso o
-- número ainda não significa nada, e avisar cedo demais empurra o RH para
-- a cobrança individual — que enviesa o instrumento.
baixa AS (
  SELECT ca.empresa_id,
         jsonb_agg(jsonb_build_object(
           'instrumento', ca.instrumento_nome,
           'janela_fim', ca.janela_fim,
           'respondentes', ca.respondentes,
           'convidados', ca.convidados,
           'taxa', ROUND(100.0 * ca.respondentes / NULLIF(ca.convidados, 0))
         ) ORDER BY ca.janela_fim) AS lista
    FROM campanhas_abertas ca
   WHERE ca.convidados > 0
     AND CURRENT_DATE >= ca.janela_inicio + ((ca.janela_fim - ca.janela_inicio) / 2)
     AND ca.janela_fim > CURRENT_DATE
     AND (100.0 * ca.respondentes / ca.convidados) < 30
   GROUP BY ca.empresa_id
),

medidas AS (
  SELECT p.empresa_id,
         COUNT(*) FILTER (WHERE p.prazo < CURRENT_DATE)::int AS atrasadas,
         COUNT(*) FILTER (WHERE p.prazo BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)::int AS vencendo
    FROM public.empresa_planos_acao p
   WHERE p.status NOT IN ('concluida', 'cancelada')
   GROUP BY p.empresa_id
),

-- Cadência: WHO-5 mensal, JSS trimestral. Mesmos números de
-- `ritmoDoCiclo` em src/lib/rhJornada.ts.
ultima_medicao AS (
  SELECT c.empresa_id, c.instrument,
         MAX(COALESCE(c.encerrada_em::date, c.janela_fim)) AS referencia
    FROM public.psychosocial_campaigns c
   WHERE c.status <> 'cancelada'
   GROUP BY c.empresa_id, c.instrument
),
vencidas AS (
  SELECT u.empresa_id,
         jsonb_agg(jsonb_build_object(
           'instrumento', i.nome,
           'desde', u.referencia
         ) ORDER BY u.referencia) AS lista
    FROM ultima_medicao u
    JOIN public.psychosocial_instruments i ON i.code = u.instrument
   WHERE NOT EXISTS (
           SELECT 1 FROM campanhas_abertas ca
            WHERE ca.empresa_id = u.empresa_id
              AND ca.instrumento_nome = i.nome
         )
     AND u.referencia + (CASE WHEN u.instrument = 'who5' THEN INTERVAL '1 month'
                              ELSE INTERVAL '3 months' END) <= CURRENT_DATE
   GROUP BY u.empresa_id
),

-- Mesma seleção de `rh_documentos`: o documento específico da empresa
-- substitui o da plataforma para aquele tipo.
docs AS (
  SELECT ea.id AS empresa_id,
         COUNT(*)::int AS pendentes
    FROM empresas_ativas ea
    CROSS JOIN LATERAL (
      SELECT DISTINCT ON (d.tipo) d.id, d.exige_aceite
        FROM public.documentos_legais d
       WHERE d.vigente
         AND (d.empresa_id IS NULL OR d.empresa_id = ea.id)
       ORDER BY d.tipo, (CASE WHEN d.empresa_id IS NOT NULL THEN 0 ELSE 1 END)
    ) aplicavel
   WHERE aplicavel.exige_aceite
     AND NOT EXISTS (
           SELECT 1 FROM public.empresa_aceites a
            WHERE a.empresa_id = ea.id AND a.documento_id = aplicavel.id
         )
   GROUP BY ea.id
)

SELECT ea.id, ea.nome,
       d.lista,
       COALESCE(f.lista, '[]'::jsonb),
       COALESCE(b.lista, '[]'::jsonb),
       COALESCE(m.atrasadas, 0),
       COALESCE(m.vencendo, 0),
       COALESCE(v.lista, '[]'::jsonb),
       COALESCE(dc.pendentes, 0)
  FROM empresas_ativas ea
  JOIN destinatarios_por_empresa d ON d.empresa_id = ea.id
  LEFT JOIN fechando  f  ON f.empresa_id  = ea.id
  LEFT JOIN baixa     b  ON b.empresa_id  = ea.id
  LEFT JOIN medidas   m  ON m.empresa_id  = ea.id
  LEFT JOIN vencidas  v  ON v.empresa_id  = ea.id
  LEFT JOIN docs      dc ON dc.empresa_id = ea.id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Só a service role (a Edge Function do cron). Nenhum usuário autenticado
-- pode ler pendência de outra empresa a partir daqui.
REVOKE ALL ON FUNCTION public.rh_pendencias_para_lembrete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rh_pendencias_para_lembrete() TO service_role;

-- ── Registro de envio (idempotente) ────────────────────
-- Devolve `true` só se ESTA chamada foi quem inseriu a linha. Duas
-- execuções concorrentes do cron não mandam o e-mail duas vezes.
DROP FUNCTION IF EXISTS public.rh_marcar_lembrete_enviado(UUID, TEXT, TEXT, INT);

CREATE FUNCTION public.rh_marcar_lembrete_enviado(
  p_empresa_id UUID,
  p_tipo TEXT,
  p_referencia TEXT,
  p_destinatarios INT
) RETURNS BOOLEAN AS $$
  INSERT INTO public.rh_lembretes_enviados (empresa_id, tipo, referencia, destinatarios)
  VALUES (p_empresa_id, p_tipo, p_referencia, p_destinatarios)
  ON CONFLICT (empresa_id, tipo, referencia) DO NOTHING
  RETURNING true;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rh_marcar_lembrete_enviado(UUID, TEXT, TEXT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rh_marcar_lembrete_enviado(UUID, TEXT, TEXT, INT) TO service_role;

-- ── Agendamento ────────────────────────────────────────
-- Diário, e não semanal: o alerta de campanha fechando precisa cair em
-- qualquer dia. Quem decide se o digest sai hoje é a própria função, pelo
-- dia da semana — assim mudar o dia do digest não exige mexer no cron.
--
-- 11:00 UTC = 08:00 em Brasília: chega antes de a pessoa montar o dia, e
-- não no meio da noite, onde o e-mail é lido em massa e arquivado junto.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-rh-reminders-daily') THEN
      PERFORM cron.unschedule('send-rh-reminders-daily');
    END IF;

    PERFORM cron.schedule(
      'send-rh-reminders-daily',
      '0 11 * * *',
      $job$
        SELECT net.http_post(
          url     := (SELECT value FROM platform_settings WHERE key = 'supabase_functions_url') || '/send-rh-reminders',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key_for_cron')
          ),
          body    := '{}'::jsonb
        )
      $job$
    );

    RAISE NOTICE 'Cron diário send-rh-reminders-daily agendado (11:00 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron não habilitado — habilite a extensão antes de rodar este script.';
  END IF;
END $$;
