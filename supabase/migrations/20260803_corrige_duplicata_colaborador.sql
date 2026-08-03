-- =====================================================
-- Malama — Corrige contagem dupla de colaborador com histórico
-- Migration: 20260803_corrige_duplicata_colaborador.sql
--
-- Aplicar via SQL Editor, depois de 20260731_campanha_links.
--
-- SINTOMA
--   Empresa com 3 colaboradores no público-alvo mostrava "9 links
--   individuais", com a mesma pessoa repetida três vezes na lista.
--
-- CAUSA
--   `empresa_colaboradores` guarda HISTÓRICO: quem entra, sai e volta tem
--   várias linhas para o mesmo user_id na mesma empresa (1 'ativo' + 2
--   'removido', no caso observado). O INSERT de tokens filtrava status
--   corretamente e emitia 1 token por pessoa, mas o SELECT que devolve a
--   lista fazia JOIN em empresa_colaboradores SEM o mesmo filtro — então
--   cada token casava com todas as linhas históricas daquela pessoa e a
--   lista multiplicava.
--
--   O erro é de uma classe que se repete: sempre que se junta uma tabela de
--   histórico por user_id sem repetir o filtro de status, a contagem infla
--   em silêncio. Por isso `rh_campanha_participacao` também é blindada aqui,
--   embora ainda não tivesse manifestado o problema — ela alimenta o
--   denominador da taxa de adesão, e adesão inflada é pior que adesão
--   ausente: parece um número bom.
--
-- CUIDADO COM O DISTINCT
--   Colaborador convidado que ainda não criou conta tem user_id NULL, e o
--   DISTINCT ON do Postgres trata NULLs como iguais — deduplicar por
--   user_id puro colapsaria TODOS os sem-conta numa pessoa só. A chave de
--   deduplicação é, portanto, user_id quando existe e o id da linha quando
--   não existe.
-- =====================================================

-- =====================================================
-- 1. LISTA DE LINKS — uma linha por pessoa
-- =====================================================

CREATE OR REPLACE FUNCTION rh_campanha_links(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
  v_camp       RECORD;
  v_sem_conta  INT;
  v_links      JSONB;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem empresa vinculada');
  END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns
  WHERE id = p_campaign_id AND empresa_id = v_empresa_id;

  IF v_camp.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campanha não encontrada');
  END IF;

  -- Emite o que falta. DISTINCT porque a mesma pessoa pode ter várias linhas
  -- de histórico ativas em tese; o UNIQUE(campaign_id, user_id) já protegia,
  -- mas sem o DISTINCT o INSERT tentaria a mesma chave várias vezes.
  INSERT INTO psychosocial_campaign_tokens (token, campaign_id, user_id)
  SELECT gerar_token_campanha(), p_campaign_id, u.user_id
  FROM (
    SELECT DISTINCT ec.user_id
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.user_id IS NOT NULL
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
  ) u
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  -- Alvo sem conta criada: não é possível emitir link (a resposta precisa de
  -- user_id). DISTINCT por e-mail porque aqui não há user_id para agrupar.
  SELECT COUNT(DISTINCT ec.email)::int INTO v_sem_conta
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id = v_camp.empresa_id
    AND ec.user_id IS NULL
    AND ec.status IN ('ativo', 'convidado')
    AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores));

  -- ATENÇÃO: nada aqui indica se a pessoa já respondeu, e não deve passar a
  -- indicar — saber quem falta é o complemento de saber quem respondeu.
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'nome'), '[]'::jsonb) INTO v_links
  FROM (
    SELECT DISTINCT ON (t.user_id) jsonb_build_object(
      'nome',  COALESCE(NULLIF(TRIM(p.display_name), ''), split_part(ec.email, '@', 1)),
      'email', ec.email,
      'setor', COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor'),
      'token', t.token
    ) AS x
    FROM psychosocial_campaign_tokens t
    JOIN empresa_colaboradores ec
      ON ec.user_id = t.user_id
     AND ec.empresa_id = v_camp.empresa_id
     -- O filtro que faltava. Sem ele o token casa também com as linhas
     -- 'removido' da mesma pessoa e a lista multiplica.
     AND ec.status IN ('ativo', 'convidado')
    LEFT JOIN profiles p ON p.id = t.user_id
    WHERE t.campaign_id = p_campaign_id
    -- Vínculo mais recente ganha: é o que tem o setor e o cargo atuais.
    ORDER BY t.user_id, ec.data_adicao DESC
  ) s;

  RETURN jsonb_build_object(
    'ok',         true,
    'janela_fim', v_camp.janela_fim,
    'sem_conta',  v_sem_conta,
    'links',      v_links
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_campanha_links(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_links(UUID) TO authenticated;


-- =====================================================
-- 2. ADESÃO — blindagem do denominador
--
-- Mantém o piso k de 20260731_participacao_k_anonima; muda só o `alvo`,
-- que passa a contar PESSOAS e não linhas de histórico.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_campanha_participacao(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id  UUID;
  v_camp        RECORD;
  v_min         CONSTANT INT := 5;   -- mesmo k do relatório psicossocial
  v_setores     JSONB;
  v_conv        INT;
  v_resp        INT;
  v_balde_conv  INT;
  v_balde_resp  INT;
  v_balde_n     INT;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns
  WHERE id = p_campaign_id AND empresa_id = v_empresa_id;

  IF v_camp.id IS NULL THEN RETURN NULL; END IF;

  WITH alvo AS (
    -- Uma linha por PESSOA. Chave de deduplicação: user_id quando existe, id
    -- da linha quando não existe (senão todos os sem-conta viram um só).
    SELECT DISTINCT ON (COALESCE(ec.user_id::text, ec.id::text))
      ec.user_id,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
    ORDER BY COALESCE(ec.user_id::text, ec.id::text), ec.data_adicao DESC
  ),
  respondeu AS (
    SELECT DISTINCT pa.user_id
    FROM psychosocial_assessments pa
    WHERE pa.campaign_id = p_campaign_id
  ),
  por_setor AS (
    SELECT
      a.setor,
      COUNT(*)::int AS convidados,
      COUNT(*) FILTER (WHERE r.user_id IS NOT NULL)::int AS respondentes
    FROM alvo a
    LEFT JOIN respondeu r ON r.user_id = a.user_id
    GROUP BY a.setor
  ),
  grandes AS (
    SELECT * FROM por_setor WHERE convidados >= v_min
  ),
  pequenos AS (
    SELECT * FROM por_setor WHERE convidados < v_min
  )
  SELECT
    (SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'setor',        g.setor,
          'convidados',   g.convidados,
          'respondentes', g.respondentes,
          'taxa',         CASE WHEN g.convidados > 0
                               THEN ROUND(g.respondentes * 100.0 / g.convidados)::int
                               ELSE 0 END,
          'agrupado',     false
        ) ORDER BY g.setor
      ), '[]'::jsonb) FROM grandes g),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM pequenos),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM pequenos),
    (SELECT COUNT(*)::int                        FROM pequenos),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM por_setor),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM por_setor)
  INTO v_setores, v_balde_conv, v_balde_resp, v_balde_n, v_conv, v_resp;

  IF v_balde_conv >= v_min THEN
    v_setores := v_setores || jsonb_build_array(jsonb_build_object(
      'setor',        'Demais setores',
      'convidados',   v_balde_conv,
      'respondentes', v_balde_resp,
      'taxa',         ROUND(v_balde_resp * 100.0 / v_balde_conv)::int,
      'agrupado',     true
    ));
    v_balde_n    := 0;
    v_balde_conv := 0;
  END IF;

  RETURN jsonb_build_object(
    'campaign_id',        p_campaign_id,
    'convidados',         v_conv,
    'respondentes',       v_resp,
    'taxa',               CASE WHEN v_conv > 0
                               THEN ROUND(v_resp * 100.0 / v_conv)::int
                               ELSE 0 END,
    'setores',            v_setores,
    'min_coorte',         v_min,
    'ocultos_setores',    v_balde_n,
    'ocultos_convidados', v_balde_conv
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_campanha_participacao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_participacao(UUID) TO authenticated;


-- =====================================================
-- 3. TAMANHO REAL DO PÚBLICO-ALVO
--
-- O formulário de nova campanha somava `rh_setores`, que só devolve quem tem
-- SETOR PREENCHIDO. Numa empresa onde a maioria ainda não tem setor, "Toda a
-- empresa" aparecia como 1 colaborador quando eram 3 — o RH abria a campanha
-- achando que ela cobria quase ninguém.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_alvo_total()
RETURNS INT AS $$
  SELECT COUNT(DISTINCT COALESCE(ec.user_id::text, ec.id::text))::int
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id IN (
      SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()
    )
    AND ec.status IN ('ativo', 'convidado');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_alvo_total() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_alvo_total() TO authenticated;
