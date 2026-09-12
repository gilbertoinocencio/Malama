-- =====================================================
-- Malama — Corrige contagem de convidados na lista de campanhas
-- Migration: 20260916_corrige_convidados_lista_campanhas.sql
--
-- O QUE O RH VIU
--   Na linha da campanha: "2/42". Abrindo o detalhamento por setor: "2/114"
--   (e a soma dos setores mostrados batia com esse 114, faltando só os 2
--   colaboradores do setor pequeno demais para aparecer detalhado).
--
-- POR QUE OS NÚMEROS DIVERGIAM
--   20260834_campanha_usa_efetivo.sql trocou o denominador de "assentos no
--   app" para "efetivo declarado do setor" em três lugares (rh_setores,
--   rh_campanha_links_setor, rh_campanha_participacao) e no rh_alvo_total.
--   Ficou faltando o QUARTO lugar que contava a mesma coisa:
--   rh_listar_campanhas__base — a função por trás da lista de campanhas —,
--   que seguiu contando só empresa_colaboradores (assentos). Dela vem o
--   número que aparece na linha da campanha ("2/42"); do rh_campanha_participacao
--   vem o número de dentro do detalhamento ("2/114"). Mesma campanha, duas
--   fontes, dois números.
--
--   rh_pendencias_para_lembrete (e-mail semanal do RH) tinha o comentário
--   "Mesma expressão de rh_listar_campanhas" e replicava a MESMA conta por
--   assentos — ficaria com o mesmo problema assim que alguém reparasse.
--
-- A CORREÇÃO
--   As duas funções passam a usar a mesma conta de rh_campanha_participacao:
--   GREATEST(assentos cadastrados, efetivo declarado do setor), somado por
--   setor. Assim a linha da campanha, o detalhamento por setor e o e-mail
--   sempre fecham no mesmo total.
-- =====================================================

CREATE OR REPLACE FUNCTION public.rh_listar_campanhas__base()
RETURNS TABLE (
  id UUID, instrument TEXT, instrument_nome TEXT, eixo TEXT,
  janela_inicio DATE, janela_fim DATE, setores TEXT[], status TEXT,
  encerrada_em TIMESTAMPTZ, created_at TIMESTAMPTZ,
  n_convidados INT, n_respondentes INT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT
    c.id, c.instrument, i.nome, i.eixo,
    c.janela_inicio, c.janela_fim, c.setores, c.status,
    c.encerrada_em, c.created_at,
    (
      WITH assentos AS (
        SELECT COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor,
               COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int AS n
          FROM empresa_colaboradores ec
         WHERE ec.empresa_id = c.empresa_id
           AND ec.status IN ('ativo', 'convidado')
           AND (c.setores IS NULL OR ec.setor = ANY (c.setores))
         GROUP BY COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor')
      ),
      declarados AS (
        SELECT es.nome AS setor, es.efetivo::int AS n
          FROM empresa_setores es
         WHERE es.empresa_id = c.empresa_id
           AND es.ativo
           AND COALESCE(es.efetivo, 0) > 0
           AND (c.setores IS NULL OR es.nome = ANY (c.setores))
      )
      SELECT COALESCE(SUM(GREATEST(COALESCE(a.n, 0), COALESCE(d.n, 0))), 0)::int
        FROM assentos a
        FULL JOIN declarados d ON lower(TRIM(d.setor)) = lower(TRIM(a.setor))
    ),
    (SELECT COUNT(DISTINCT pa.user_id)::int
       FROM psychosocial_assessments pa
      WHERE pa.campaign_id = c.id)
    + (SELECT COUNT(*)::int
         FROM psychosocial_anonymous_responses ar
        WHERE ar.campaign_id = c.id)
  FROM psychosocial_campaigns c
  JOIN psychosocial_instruments i ON i.code = c.instrument
  WHERE c.empresa_id = (SELECT empresa_id FROM emp)
  ORDER BY c.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;


-- ── E-mail semanal: mesma correção na CTE que replica a conta ──
CREATE OR REPLACE FUNCTION public.rh_pendencias_para_lembrete()
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

-- Mesma expressão de `rh_listar_campanhas__base` (efetivo declarado, não só
-- assentos — ver 20260916_corrige_convidados_lista_campanhas.sql). DISTINCT
-- porque empresa_colaboradores guarda histórico, e a resposta anônima (link
-- do setor) soma junto com a respondida dentro do app.
campanhas_abertas AS (
  SELECT c.id, c.empresa_id, c.janela_inicio, c.janela_fim, i.nome AS instrumento_nome,
         (
           WITH assentos AS (
             SELECT COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor,
                    COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int AS n
               FROM public.empresa_colaboradores ec
              WHERE ec.empresa_id = c.empresa_id
                AND ec.status IN ('ativo', 'convidado')
                AND (c.setores IS NULL OR ec.setor = ANY (c.setores))
              GROUP BY COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor')
           ),
           declarados AS (
             SELECT es.nome AS setor, es.efetivo::int AS n
               FROM public.empresa_setores es
              WHERE es.empresa_id = c.empresa_id
                AND es.ativo
                AND COALESCE(es.efetivo, 0) > 0
                AND (c.setores IS NULL OR es.nome = ANY (c.setores))
           )
           SELECT COALESCE(SUM(GREATEST(COALESCE(a.n, 0), COALESCE(d.n, 0))), 0)::int
             FROM assentos a
             FULL JOIN declarados d ON lower(TRIM(d.setor)) = lower(TRIM(a.setor))
         ) AS convidados,
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
