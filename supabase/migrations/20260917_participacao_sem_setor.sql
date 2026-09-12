-- =====================================================
-- Malama — Participação da campanha: "sem setor" não é setor pequeno
-- Migration: 20260917_participacao_sem_setor.sql
--
-- O QUE O RH VIU
--   Card de Setores em Início: 8 setores, 112 pessoas. Campanha: 114
--   convidados e a nota "1 setor com menos de 5 pessoas não aparece
--   detalhado (2 colaboradores)" — mas nenhum setor cadastrado tem menos
--   de 5 pessoas.
--
-- POR QUE
--   Dois colaboradores ativos estavam com o campo setor VAZIO (o convite
--   permite). `rh_campanha_participacao` os agrupava num balde 'Sem setor'
--   de 2 pessoas, que caía abaixo do piso k e virava "setor oculto". A nota
--   dizia a verdade contábil e mentia sobre a causa: não é setor pequeno
--   demais, é gente sem setor. E a correção (definir o setor na lista de
--   colaboradores) fica em outra tela, sem nada apontando para lá.
--
-- A CORREÇÃO
--   'Sem setor' sai da contagem de setores ocultos e passa a voltar como
--   `sem_setor_convidados` — só o número de convidados, nunca o de
--   respondentes, para não expor quem respondeu num grupo pequeno. Se o
--   grupo sem setor alcançar o piso, aparece como linha normal (o k já
--   protege). O total da empresa continua contando essas pessoas.
-- =====================================================

-- A __base é a que tem o corpo; `rh_campanha_participacao` é só o wrapper
-- de módulo criado em 20260901 e não precisa mudar.
CREATE OR REPLACE FUNCTION public.rh_campanha_participacao__base(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id  UUID;
  v_camp        RECORD;
  v_min         CONSTANT INT := 5;
  v_setores     JSONB;
  v_conv        INT;
  v_resp        INT;
  v_balde_conv  INT;
  v_balde_resp  INT;
  v_balde_n     INT;
  v_sem_setor   INT;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns
  WHERE id = p_campaign_id AND empresa_id = v_empresa_id;

  IF v_camp.id IS NULL THEN RETURN NULL; END IF;

  WITH alvo AS (
    SELECT DISTINCT ON (COALESCE(ec.user_id::text, ec.id::text))
      ec.user_id,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
    ORDER BY COALESCE(ec.user_id::text, ec.id::text), ec.data_adicao DESC
  ),
  assentos AS (
    SELECT a.setor, COUNT(*)::int AS n FROM alvo a GROUP BY a.setor
  ),
  declarados AS (
    SELECT es.nome AS setor, es.efetivo::int AS n
    FROM empresa_setores es
    WHERE es.empresa_id = v_camp.empresa_id
      AND es.ativo
      AND COALESCE(es.efetivo, 0) > 0
      AND (v_camp.setores IS NULL OR es.nome = ANY (v_camp.setores))
  ),
  convidados AS (
    SELECT
      COALESCE(a.setor, d.setor) AS setor,
      GREATEST(COALESCE(a.n, 0), COALESCE(d.n, 0)) AS n
    FROM assentos a
    FULL JOIN declarados d ON lower(TRIM(d.setor)) = lower(TRIM(a.setor))
  ),
  ident AS (
    SELECT a.setor, COUNT(DISTINCT pa.user_id)::int AS n
    FROM psychosocial_assessments pa
    JOIN alvo a ON a.user_id = pa.user_id
    WHERE pa.campaign_id = p_campaign_id
    GROUP BY a.setor
  ),
  anon AS (
    SELECT ar.setor, COUNT(*)::int AS n
    FROM psychosocial_anonymous_responses ar
    WHERE ar.campaign_id = p_campaign_id
    GROUP BY ar.setor
  ),
  por_setor AS (
    SELECT
      c.setor,
      c.n AS convidados,
      COALESCE(i.n, 0) + COALESCE(x.n, 0) AS respondentes
    FROM convidados c
    LEFT JOIN ident i ON lower(TRIM(i.setor)) = lower(TRIM(c.setor))
    LEFT JOIN anon  x ON lower(TRIM(x.setor)) = lower(TRIM(c.setor))
  ),
  grandes AS (SELECT * FROM por_setor WHERE convidados >= v_min),
  -- Setor pequeno de verdade: tem nome. Gente sem setor não entra aqui.
  pequenos AS (SELECT * FROM por_setor WHERE convidados < v_min AND setor <> 'Sem setor')
  SELECT
    (SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'setor',        g.setor,
          'convidados',   g.convidados,
          'respondentes', g.respondentes,
          'taxa',         LEAST(100, CASE WHEN g.convidados > 0
                                          THEN ROUND(g.respondentes * 100.0 / g.convidados)::int
                                          ELSE 0 END),
          'agrupado',     false
        ) ORDER BY (g.setor = 'Sem setor'), g.setor
      ), '[]'::jsonb) FROM grandes g),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM pequenos),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM pequenos),
    (SELECT COUNT(*)::int                        FROM pequenos),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM por_setor),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM por_setor),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM por_setor
      WHERE setor = 'Sem setor' AND convidados < v_min)
  INTO v_setores, v_balde_conv, v_balde_resp, v_balde_n, v_conv, v_resp, v_sem_setor;

  IF v_balde_conv >= v_min THEN
    v_setores := v_setores || jsonb_build_array(jsonb_build_object(
      'setor',        'Demais setores',
      'convidados',   v_balde_conv,
      'respondentes', v_balde_resp,
      'taxa',         LEAST(100, ROUND(v_balde_resp * 100.0 / v_balde_conv)::int),
      'agrupado',     true
    ));
    v_balde_n    := 0;
    v_balde_conv := 0;
  END IF;

  RETURN jsonb_build_object(
    'campaign_id',         p_campaign_id,
    'convidados',          v_conv,
    'respondentes',        v_resp,
    'taxa',                LEAST(100, CASE WHEN v_conv > 0
                                           THEN ROUND(v_resp * 100.0 / v_conv)::int
                                           ELSE 0 END),
    'setores',             v_setores,
    'min_coorte',          v_min,
    'ocultos_setores',     v_balde_n,
    'ocultos_convidados',  v_balde_conv,
    'sem_setor_convidados', v_sem_setor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;
