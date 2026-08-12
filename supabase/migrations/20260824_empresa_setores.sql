-- =====================================================
-- Malama — Registro de setores da empresa
-- Migration: 20260824_empresa_setores.sql
--
-- Aplicar via SQL Editor.
--
-- O PROBLEMA
--   Até aqui o setor não era uma entidade: `rh_setores()` devolvia
--   SELECT DISTINCT TRIM(setor) dos colaboradores. O setor nascia como
--   efeito colateral de alguém digitar um texto livre no cadastro. Isso
--   produz três defeitos que o RH não consegue enxergar nem corrigir:
--
--   1. Setor com zero pessoas não existe. Não dá para planejar ação para
--      um setor antes de povoá-lo, e se o último colaborador sai o setor
--      desaparece dos relatórios e do plano de ação.
--   2. Typo vira setor novo, e o dado some em SILÊNCIO. "T.I." / "TI" /
--      "Ti " viram três coortes; como matriz, absenteísmo e JSS aplicam
--      piso k (k=5), cada fragmento cai abaixo do piso e é suprimido. O
--      RH não vê erro, vê gráfico vazio.
--   3. Renomear era impossível: o texto está copiado em 7 lugares.
--
-- A ESCOLHA: REGISTRO CANÔNICO, NÃO FK
--   `empresa_setores` passa a ser a fonte da verdade, mas as tabelas
--   continuam gravando o TEXTO do setor. O texto segue sendo a chave de
--   junção que matriz, absenteísmo, JSS, plano de ação e campanhas já
--   usam — nenhuma delas precisa mudar. O que muda é a origem do texto:
--   ele passa a ser escolhido de uma lista, nunca digitado.
--   Normalizar com setor_id obrigaria reescrever ~8 RPCs, as views da
--   matriz e o array `setores[]` das campanhas pelo mesmo ganho prático.
--   O registro fica pronto para receber a FK depois, se valer a pena.
--
--   O que fecha o buraco de canonicidade é `rh_setor_renomear()`, que
--   propaga o nome novo nas 7 tabelas numa transação só — e, quando o
--   destino já existe, FUNDE os dois setores. É a ferramenta de limpeza
--   para as duplicatas que já entraram por digitação.
-- =====================================================

-- =====================================================
-- 1. TABELA
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_setores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 60),
  -- Arquivar em vez de excluir: afastamento, resposta anônima e item de
  -- plano guardam o texto e continuam existindo no histórico. Setor
  -- inativo some dos seletores, não dos relatórios.
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicidade insensível a caixa e a espaço: é exatamente o que impedia
-- "TI" e "ti " de coexistirem como coortes separadas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresa_setores_nome
  ON empresa_setores(empresa_id, lower(trim(nome)));

CREATE INDEX IF NOT EXISTS idx_empresa_setores_empresa
  ON empresa_setores(empresa_id, ativo);

DROP TRIGGER IF EXISTS update_empresa_setores_updated_at ON empresa_setores;
CREATE TRIGGER update_empresa_setores_updated_at
  BEFORE UPDATE ON empresa_setores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE empresa_setores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all setores" ON empresa_setores;
CREATE POLICY "super_admin all setores"
  ON empresa_setores FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own setores" ON empresa_setores;
CREATE POLICY "rh reads own setores"
  ON empresa_setores FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- Sem policy de escrita: criar/renomear/arquivar só pelas RPCs abaixo,
-- que validam a empresa, a colisão de nome e a propagação do texto.


-- =====================================================
-- 2. BACKFILL
--
-- Importa tudo que já é usado como setor hoje, para que o registro nasça
-- completo e nenhum recorte existente perca a origem. Quando a mesma
-- coorte aparece em caixas diferentes, vence a grafia MAIS USADA — as
-- demais viram alvo de fusão pela tela de setores.
-- 'Sem setor' é rótulo interno dos links de campanha, não é setor.
-- =====================================================

WITH todos AS (
  SELECT empresa_id, TRIM(setor) AS nome FROM empresa_colaboradores
   WHERE NULLIF(TRIM(setor), '') IS NOT NULL
  UNION ALL
  SELECT empresa_id, TRIM(setor) FROM empresa_afastamentos
   WHERE NULLIF(TRIM(setor), '') IS NOT NULL
  UNION ALL
  SELECT empresa_id, TRIM(setor) FROM empresa_ambulatorio
   WHERE NULLIF(TRIM(setor), '') IS NOT NULL
  UNION ALL
  SELECT empresa_id, TRIM(setor) FROM empresa_planos_acao
   WHERE NULLIF(TRIM(setor), '') IS NOT NULL
),
contagem AS (
  SELECT empresa_id, nome, lower(nome) AS chave, COUNT(*) AS usos
    FROM todos
   WHERE lower(nome) <> 'sem setor'
     -- Nome acima do limite da tabela violaria o CHECK e abortaria a
     -- migration inteira no SQL Editor. Fica de fora do registro e segue
     -- aparecendo pelo caminho legado de `rh_setores()`.
     AND length(nome) <= 60
   GROUP BY empresa_id, nome
),
canonico AS (
  SELECT DISTINCT ON (empresa_id, chave) empresa_id, nome, chave, usos
    FROM contagem
   ORDER BY empresa_id, chave, usos DESC, nome
)
INSERT INTO empresa_setores (empresa_id, nome)
SELECT empresa_id, nome FROM canonico
ON CONFLICT DO NOTHING;


-- =====================================================
-- 3. rh_setores() — lista para os seletores
--
-- Passa a ler o REGISTRO, e não mais os colaboradores. Duas mudanças de
-- comportamento, ambas intencionais:
--   · setor recém-criado aparece com n = 0 (é o ponto: planejar antes de
--     povoar);
--   · setor legado que exista só nos colaboradores continua aparecendo,
--     para que uma empresa nunca perca um recorte se o backfill não o
--     alcançou.
-- Assinatura preservada (setor, n) — nenhum consumidor muda.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setores();

CREATE OR REPLACE FUNCTION rh_setores()
RETURNS TABLE (setor TEXT, n INT) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()
  ),
  colab AS (
    SELECT lower(TRIM(ec.setor))  AS chave,
           MIN(TRIM(ec.setor))    AS nome,
           COUNT(*)::int          AS n
      FROM empresa_colaboradores ec
     WHERE ec.empresa_id IN (SELECT empresa_id FROM emp)
       AND ec.status IN ('ativo', 'convidado')
       AND NULLIF(TRIM(ec.setor), '') IS NOT NULL
     GROUP BY lower(TRIM(ec.setor))
  ),
  reg AS (
    SELECT lower(TRIM(s.nome)) AS chave, s.nome
      FROM empresa_setores s
     WHERE s.empresa_id IN (SELECT empresa_id FROM emp)
       AND s.ativo
  ),
  uniao AS (
    -- prio 0 = grafia do registro ganha da grafia digitada no cadastro.
    SELECT DISTINCT ON (chave) chave, nome, prio
      FROM (
        SELECT chave, nome, 0 AS prio FROM reg
        UNION ALL
        SELECT chave, nome, 1 AS prio FROM colab
      ) t
     ORDER BY chave, prio
  )
  SELECT u.nome, COALESCE(c.n, 0)
    FROM uniao u
    LEFT JOIN colab c ON c.chave = u.chave
   ORDER BY 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_setores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setores() TO authenticated;


-- =====================================================
-- 4. rh_setores_admin() — lista para a tela de gestão
--
-- Além do nome e da contagem, devolve `em_uso`: se o setor já aparece em
-- algum registro histórico. É o que decide, na tela, entre oferecer
-- "excluir" (setor criado por engano, nunca usado) e "arquivar".
-- =====================================================

DROP FUNCTION IF EXISTS rh_setores_admin();

CREATE OR REPLACE FUNCTION rh_setores_admin()
RETURNS TABLE (
  id     UUID,
  nome   TEXT,
  ativo  BOOLEAN,
  n      INT,
  em_uso BOOLEAN
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()
  )
  SELECT
    s.id,
    s.nome,
    s.ativo,
    (SELECT COUNT(*)::int FROM empresa_colaboradores ec
      WHERE ec.empresa_id = s.empresa_id
        AND ec.status IN ('ativo', 'convidado')
        AND lower(TRIM(ec.setor)) = lower(TRIM(s.nome))),
    (EXISTS (SELECT 1 FROM empresa_afastamentos a
              WHERE a.empresa_id = s.empresa_id
                AND lower(TRIM(a.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM empresa_ambulatorio am
                 WHERE am.empresa_id = s.empresa_id
                   AND lower(TRIM(am.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM empresa_planos_acao p
                 WHERE p.empresa_id = s.empresa_id
                   AND lower(TRIM(p.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM psychosocial_campaigns c
                 WHERE c.empresa_id = s.empresa_id
                   AND EXISTS (SELECT 1 FROM unnest(c.setores) x
                                WHERE lower(TRIM(x)) = lower(TRIM(s.nome))))
    )
  FROM empresa_setores s
  WHERE s.empresa_id IN (SELECT empresa_id FROM emp)
  ORDER BY s.ativo DESC, s.nome;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_setores_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setores_admin() TO authenticated;


-- =====================================================
-- 5. rh_setor_criar(nome)
--
-- Nome já existente e ATIVO é erro. Já existente e arquivado reativa a
-- mesma linha em vez de criar uma segunda: recriar geraria colisão no
-- índice único e, pior, sugeriria ao RH que ele tem dois setores.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setor_criar(TEXT);

CREATE OR REPLACE FUNCTION rh_setor_criar(p_nome TEXT)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_nome    TEXT := TRIM(COALESCE(p_nome, ''));
  v_existe  empresa_setores%ROWTYPE;
  v_id      UUID;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF v_nome = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o nome do setor');
  END IF;
  IF length(v_nome) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nome do setor muito longo (máx. 60 caracteres)');
  END IF;
  IF lower(v_nome) = 'sem setor' THEN
    RETURN jsonb_build_object('ok', false, 'error', '"Sem setor" é reservado para quem ainda não foi classificado');
  END IF;

  SELECT * INTO v_existe
    FROM empresa_setores
   WHERE empresa_id = v_empresa
     AND lower(TRIM(nome)) = lower(v_nome)
   LIMIT 1;

  IF FOUND THEN
    IF v_existe.ativo THEN
      RETURN jsonb_build_object('ok', false, 'error', format('O setor "%s" já existe', v_existe.nome));
    END IF;
    UPDATE empresa_setores SET ativo = TRUE, nome = v_nome WHERE id = v_existe.id;
    RETURN jsonb_build_object('ok', true, 'id', v_existe.id, 'reativado', true);
  END IF;

  INSERT INTO empresa_setores (empresa_id, nome, criado_por)
  VALUES (v_empresa, v_nome, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'reativado', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_setor_criar(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setor_criar(TEXT) TO authenticated;


-- =====================================================
-- 6. rh_setor_renomear(id, nome, permitir_fusao)
--
-- Renomeia no registro E propaga o texto nas 7 tabelas que o guardam.
-- A busca é por lower(trim(...)), então a operação também recolhe as
-- grafias divergentes que já entraram por digitação — é justamente o que
-- reconstitui coortes quebradas pelo piso k.
--
-- FUSÃO: se o nome de destino já for outro setor do registro, a chamada
-- devolve fusao_possivel e não faz nada. Com p_permitir_fusao = TRUE, os
-- dois viram um só e a linha de origem é removida do registro.
--
-- Consequência assumida na fusão: `psychosocial_setor_links` tem
-- UNIQUE (campaign_id, setor). Se a mesma campanha já tem link para o
-- destino, o link do setor de origem é APAGADO — uma URL já divulgada
-- para aquele setor deixa de responder. A tela avisa antes de fundir.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setor_renomear(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION rh_setor_renomear(
  p_id             UUID,
  p_nome           TEXT,
  p_permitir_fusao BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_empresa   UUID;
  v_atual     empresa_setores%ROWTYPE;
  v_nome      TEXT := TRIM(COALESCE(p_nome, ''));
  v_chave_old TEXT;
  v_destino   empresa_setores%ROWTYPE;
  v_fundido   BOOLEAN := FALSE;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT * INTO v_atual
    FROM empresa_setores WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;

  IF v_nome = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o novo nome do setor');
  END IF;
  IF length(v_nome) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nome do setor muito longo (máx. 60 caracteres)');
  END IF;
  IF lower(v_nome) = 'sem setor' THEN
    RETURN jsonb_build_object('ok', false, 'error', '"Sem setor" é reservado para quem ainda não foi classificado');
  END IF;

  v_chave_old := lower(TRIM(v_atual.nome));

  IF v_chave_old = lower(v_nome) AND v_atual.nome = v_nome THEN
    RETURN jsonb_build_object('ok', true, 'fundido', false, 'inalterado', true);
  END IF;

  -- Outro setor com o mesmo nome? Então isto é uma fusão, não um rename.
  SELECT * INTO v_destino
    FROM empresa_setores
   WHERE empresa_id = v_empresa
     AND id <> v_atual.id
     AND lower(TRIM(nome)) = lower(v_nome)
   LIMIT 1;

  IF FOUND THEN
    IF NOT p_permitir_fusao THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('O setor "%s" já existe', v_destino.nome),
        'fusao_possivel', true,
        'destino', v_destino.nome
      );
    END IF;
    v_fundido := TRUE;
    -- Grafia vencedora é a do destino, que é quem permanece.
    v_nome := v_destino.nome;
  END IF;

  -- ── Propagação do texto ──
  UPDATE empresa_colaboradores
     SET setor = v_nome
   WHERE empresa_id = v_empresa AND lower(TRIM(setor)) = v_chave_old;

  UPDATE empresa_afastamentos
     SET setor = v_nome
   WHERE empresa_id = v_empresa AND lower(TRIM(setor)) = v_chave_old;

  UPDATE empresa_ambulatorio
     SET setor = v_nome
   WHERE empresa_id = v_empresa AND lower(TRIM(setor)) = v_chave_old;

  UPDATE empresa_planos_acao
     SET setor = v_nome
   WHERE empresa_id = v_empresa AND lower(TRIM(setor)) = v_chave_old;

  -- Público-alvo das campanhas: array de texto. O DISTINCT resolve a
  -- campanha que já mirava origem E destino ao mesmo tempo.
  UPDATE psychosocial_campaigns c
     SET setores = (
           SELECT array_agg(DISTINCT CASE WHEN lower(TRIM(x)) = v_chave_old THEN v_nome ELSE x END)
             FROM unnest(c.setores) x
         )
   WHERE c.empresa_id = v_empresa
     AND c.setores IS NOT NULL
     AND EXISTS (SELECT 1 FROM unnest(c.setores) x WHERE lower(TRIM(x)) = v_chave_old);

  -- Link que colidiria com o do destino na mesma campanha some (ver
  -- comentário do cabeçalho): a URL antiga daquele setor para de valer.
  DELETE FROM psychosocial_setor_links l
   WHERE l.campaign_id IN (SELECT id FROM psychosocial_campaigns WHERE empresa_id = v_empresa)
     AND lower(TRIM(l.setor)) = v_chave_old
     AND EXISTS (
           SELECT 1 FROM psychosocial_setor_links l2
            WHERE l2.campaign_id = l.campaign_id
              AND lower(TRIM(l2.setor)) = lower(v_nome)
              AND l2.token <> l.token
         );

  UPDATE psychosocial_setor_links l
     SET setor = v_nome
   WHERE l.campaign_id IN (SELECT id FROM psychosocial_campaigns WHERE empresa_id = v_empresa)
     AND lower(TRIM(l.setor)) = v_chave_old;

  UPDATE psychosocial_anonymous_responses r
     SET setor = v_nome
   WHERE r.campaign_id IN (SELECT id FROM psychosocial_campaigns WHERE empresa_id = v_empresa)
     AND lower(TRIM(r.setor)) = v_chave_old;

  -- ── Registro ──
  IF v_fundido THEN
    DELETE FROM empresa_setores WHERE id = v_atual.id;
  ELSE
    UPDATE empresa_setores SET nome = v_nome WHERE id = v_atual.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'fundido', v_fundido, 'nome', v_nome);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_setor_renomear(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setor_renomear(UUID, TEXT, BOOLEAN) TO authenticated;


-- =====================================================
-- 7. rh_setor_arquivar(id, ativo)
--
-- Arquivar com gente dentro criaria setor fantasma: sumiria do seletor
-- mas continuaria aparecendo na matriz e no absenteísmo, sem que o RH
-- tivesse como agir sobre ele. Então bloqueia e diz quantos mover.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setor_arquivar(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION rh_setor_arquivar(p_id UUID, p_ativo BOOLEAN)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_atual   empresa_setores%ROWTYPE;
  v_n       INT;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT * INTO v_atual
    FROM empresa_setores WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;

  IF p_ativo IS NOT TRUE THEN
    SELECT COUNT(*)::int INTO v_n
      FROM empresa_colaboradores ec
     WHERE ec.empresa_id = v_empresa
       AND ec.status IN ('ativo', 'convidado')
       AND lower(TRIM(ec.setor)) = lower(TRIM(v_atual.nome));

    IF v_n > 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('Ainda há %s colaborador(es) em "%s". Mova essas pessoas para outro setor antes de arquivar.',
                        v_n, v_atual.nome)
      );
    END IF;
  END IF;

  UPDATE empresa_setores SET ativo = COALESCE(p_ativo, FALSE) WHERE id = v_atual.id;

  RETURN jsonb_build_object('ok', true, 'ativo', COALESCE(p_ativo, FALSE));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_setor_arquivar(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setor_arquivar(UUID, BOOLEAN) TO authenticated;


-- =====================================================
-- 8. rh_setor_excluir(id)
--
-- Só para setor criado por engano e nunca usado. Com qualquer histórico,
-- excluir deixaria registro órfão apontando para um setor inexistente —
-- nesse caso o caminho é arquivar.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setor_excluir(UUID);

CREATE OR REPLACE FUNCTION rh_setor_excluir(p_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_atual   empresa_setores%ROWTYPE;
  v_chave   TEXT;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT * INTO v_atual
    FROM empresa_setores WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;

  v_chave := lower(TRIM(v_atual.nome));

  IF EXISTS (SELECT 1 FROM empresa_colaboradores ec
              WHERE ec.empresa_id = v_empresa AND lower(TRIM(ec.setor)) = v_chave)
     OR EXISTS (SELECT 1 FROM empresa_afastamentos a
                 WHERE a.empresa_id = v_empresa AND lower(TRIM(a.setor)) = v_chave)
     OR EXISTS (SELECT 1 FROM empresa_ambulatorio am
                 WHERE am.empresa_id = v_empresa AND lower(TRIM(am.setor)) = v_chave)
     OR EXISTS (SELECT 1 FROM empresa_planos_acao p
                 WHERE p.empresa_id = v_empresa AND lower(TRIM(p.setor)) = v_chave)
     OR EXISTS (SELECT 1 FROM psychosocial_campaigns c
                 WHERE c.empresa_id = v_empresa
                   AND EXISTS (SELECT 1 FROM unnest(c.setores) x WHERE lower(TRIM(x)) = v_chave))
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('"%s" já tem histórico na plataforma. Arquive o setor em vez de excluir.', v_atual.nome)
    );
  END IF;

  DELETE FROM empresa_setores WHERE id = v_atual.id;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_setor_excluir(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setor_excluir(UUID) TO authenticated;
