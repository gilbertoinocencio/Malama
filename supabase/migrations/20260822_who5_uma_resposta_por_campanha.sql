-- =====================================================
-- Malama — WHO-5: a unicidade é POR CAMPANHA, não por mês
--
-- SINTOMA: ao marcar a última pergunta do WHO-5 dentro do app, a tela
-- não conclui. Fica parada na pergunta 5 e a pessoa só sai pelo "Depois",
-- que apenas adia. Nada é gravado.
--
-- CAUSA: a tabela nasceu (20260723) com UNIQUE (user_id, instrument,
-- reference_month), quando WHO-5 era um questionário mensal avulso, sem
-- campanha. Com o motor de campanhas (20260728) quem define o direito de
-- responder passou a ser a campanha:
--
--   · minhas_campanhas_pendentes() oferece a campanha porque NÃO existe
--     resposta com aquele campaign_id;
--   · o INSERT bate no UNIQUE mensal, porque existe resposta daquele
--     usuário no mesmo instrumento e no mesmo mês, de OUTRA campanha.
--
-- Ou seja: a campanha aparece como pendente e é impossível respondê-la.
-- Basta o RH encerrar uma campanha de WHO-5 e abrir outra dentro do mesmo
-- mês — que é exatamente o que rh_criar_campanha permite, já que a trava
-- de sobreposição lá só olha campanha com status 'aberta'.
--
-- CORREÇÃO: o UNIQUE mensal passa a valer só para resposta avulsa
-- (campaign_id IS NULL), o fluxo legado. Resposta de campanha continua
-- protegida contra duplicata por uq_assessment_user_campaign
-- (user_id, campaign_id), criado em 20260728.
--
-- Isso permite duas respostas do mesmo instrumento no mesmo mês para a
-- mesma pessoa. Os relatórios já lidam com isso: a view
-- psychosocial_respostas é lida com DISTINCT ON (chave) ORDER BY data_ref
-- DESC, created_at DESC, então a mais recente é a que conta — e o
-- desempate segue determinístico.
-- =====================================================

-- O nome do constraint é o gerado pelo Postgres e tem 63 caracteres, no
-- limite do identificador. Em vez de apostar na grafia, acha pelo conjunto
-- de colunas — é o mesmo constraint em qualquer ambiente.
DO $$
DECLARE
  v_nome TEXT;
BEGIN
  SELECT c.conname INTO v_nome
  FROM pg_constraint c
  WHERE c.conrelid = 'public.psychosocial_assessments'::regclass
    AND c.contype = 'u'
    AND (
      -- attname é do tipo `name`; sem o cast não existe operador contra text[].
      SELECT array_agg(a.attname::text ORDER BY a.attname::text)
      FROM unnest(c.conkey) AS k(attnum)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    ) = ARRAY['instrument', 'reference_month', 'user_id']
  LIMIT 1;

  IF v_nome IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE psychosocial_assessments DROP CONSTRAINT %I', v_nome
    );
  END IF;
END $$;

-- Fluxo avulso (sem campanha) continua com no máximo uma resposta por
-- usuário/instrumento/mês.
CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_user_instrumento_mes_avulso
  ON psychosocial_assessments(user_id, instrument, reference_month)
  WHERE campaign_id IS NULL;

COMMENT ON INDEX uq_assessment_user_instrumento_mes_avulso IS
  'Unicidade mensal do fluxo legado sem campanha. Resposta de campanha é '
  'protegida por uq_assessment_user_campaign (user_id, campaign_id).';
