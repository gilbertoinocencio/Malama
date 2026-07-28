-- =====================================================
-- Malama — Motor de campanhas psicossociais (NR-1)
-- Migration: 20260728_psychosocial_campaign_engine.sql
--
-- Aplicar via SQL Editor, DEPOIS de:
--   20260723_psychosocial_who5_and_setor.sql
--   20260727_psychosocial_report_fix.sql
--   20260727_empresa_modos.sql
--
-- O QUE MUDA
-- Hoje o WHO-5 é disparado pelo próprio app (localStorage + regra de mês)
-- e o RH não controla nada. Aqui o disparo passa a ser uma CAMPANHA criada
-- pelo RH: instrumento + janela + público-alvo (setores). Isso é o que
-- permite instrumentos com cadências diferentes (mensal, semestral) e o que
-- dá denominador para taxa de resposta.
--
-- SEPARAÇÃO DE SENSIBILIDADE (importante)
--   participação (quem foi convidado, quantos responderam) → NÃO é dado de
--     saúde. O RH vê, inclusive por setor, sem piso de k.
--   escore (como a pessoa está)                            → é dado de saúde.
--     Continua só agregado, com k >= 5, via rh_relatorio_psicossocial.
-- Nenhuma RPC daqui devolve escore.
--
-- Esta migração NÃO altera o comportamento atual do app: campanhas criadas
-- ficam disponíveis via minhas_campanhas_pendentes(), que o app passa a
-- consumir na etapa do aplicativo.
-- =====================================================


-- =====================================================
-- 1. CATÁLOGO DE INSTRUMENTOS
--
-- Instrumento validado exige rastreabilidade: versão, fonte e licença
-- ficam registradas junto, porque é isso que sustenta o relatório num
-- questionamento (fiscal, perito, jurídico do cliente).
-- =====================================================

CREATE TABLE IF NOT EXISTS psychosocial_instruments (
  code           TEXT PRIMARY KEY,
  nome           TEXT NOT NULL,
  versao         TEXT,
  descricao      TEXT,
  -- O que o instrumento mede. Define o eixo dele na matriz de risco:
  --   'bemestar'  → desfecho (a pessoa está sofrendo?)
  --   'exposicao' → fator de risco ocupacional (o trabalho expõe a quê?)
  eixo           TEXT NOT NULL CHECK (eixo IN ('bemestar', 'exposicao')),
  cadencia_meses INT,             -- cadência sugerida (1 = mensal, 6 = semestral)
  fonte          TEXT,            -- referência bibliográfica da versão validada
  licenca        TEXT,            -- termos de uso — checar ANTES de ativar
  -- Instrumento só pode ser usado em campanha quando ativo = true.
  -- Nasce false para qualquer instrumento cuja redação exata ainda não
  -- esteja conferida: texto errado invalida o escore e o relatório.
  ativo          BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE psychosocial_instruments ENABLE ROW LEVEL SECURITY;

-- Catálogo é público para quem está logado (não tem dado pessoal).
DROP POLICY IF EXISTS "authenticated reads instruments" ON psychosocial_instruments;
CREATE POLICY "authenticated reads instruments"
  ON psychosocial_instruments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "super_admin all instruments" ON psychosocial_instruments;
CREATE POLICY "super_admin all instruments"
  ON psychosocial_instruments FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

INSERT INTO psychosocial_instruments
  (code, nome, versao, descricao, eixo, cadencia_meses, fonte, licenca, ativo)
VALUES
  ('who5',
   'Índice de Bem-Estar WHO-5',
   '1998',
   'Cinco itens sobre bem-estar nas últimas duas semanas. Escore 0–100.',
   'bemestar', 1,
   'WHO Regional Office for Europe, 1998. Versão brasileira validada.',
   'Domínio público. Uso livre, inclusive comercial, mantida a redação.',
   true),
  ('jss',
   'Job Stress Scale (demanda-controle-apoio)',
   'Alves et al., 2004',
   'Versão resumida do modelo demanda-controle de Karasek, validada no Brasil (ELSA-Brasil). Mede exposição ocupacional: demanda, controle e apoio social.',
   'exposicao', 6,
   'Alves MGM et al. Versão resumida da job stress scale: adaptação para o português. Rev Saúde Pública, 2004.',
   'Publicada em artigo de acesso aberto, sem taxa de licenciamento (diferente de COPSOQ III e JCQ, que exigem acordo para uso comercial).',
   false)  -- ativar só depois de conferir a redação exata dos itens
ON CONFLICT (code) DO NOTHING;


-- =====================================================
-- 2. CAMPANHAS
-- =====================================================

CREATE TABLE IF NOT EXISTS psychosocial_campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  instrument     TEXT NOT NULL REFERENCES psychosocial_instruments(code),
  janela_inicio  DATE NOT NULL,
  janela_fim     DATE NOT NULL,
  -- NULL = toda a empresa. Array = só estes setores.
  setores        TEXT[],
  status         TEXT NOT NULL DEFAULT 'aberta'
                   CHECK (status IN ('aberta', 'encerrada', 'cancelada')),
  criada_por     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  encerrada_em   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (janela_fim >= janela_inicio)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_empresa
  ON psychosocial_campaigns(empresa_id, status, janela_fim DESC);

ALTER TABLE psychosocial_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all campaigns" ON psychosocial_campaigns;
CREATE POLICY "super_admin all campaigns"
  ON psychosocial_campaigns FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RH lê as campanhas da própria empresa. Escrita só pelas RPCs abaixo
-- (que validam janela, instrumento ativo e sobreposição).
DROP POLICY IF EXISTS "rh reads own empresa campaigns" ON psychosocial_campaigns;
CREATE POLICY "rh reads own empresa campaigns"
  ON psychosocial_campaigns FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  );

-- O colaborador NÃO lê esta tabela direto: recebe as campanhas dele por
-- minhas_campanhas_pendentes(), que já filtra empresa, setor e janela.


-- =====================================================
-- 3. GENERALIZAÇÃO DE psychosocial_assessments
--
-- A tabela nasceu WHO-5-only. Tudo aqui é aditivo; as linhas existentes
-- (WHO-5 mensal, sem campanha) continuam válidas com campaign_id NULL.
-- =====================================================

ALTER TABLE psychosocial_assessments
  ADD COLUMN IF NOT EXISTS campaign_id UUID
    REFERENCES psychosocial_campaigns(id) ON DELETE SET NULL;

-- Escores por dimensão (ex.: demanda/controle/apoio da JSS).
-- WHO-5 não usa: fica NULL.
ALTER TABLE psychosocial_assessments
  ADD COLUMN IF NOT EXISTS subscores JSONB;

-- instrument deixa de ser lista fixa e passa a apontar para o catálogo.
ALTER TABLE psychosocial_assessments
  DROP CONSTRAINT IF EXISTS psychosocial_assessments_instrument_check;

ALTER TABLE psychosocial_assessments
  DROP CONSTRAINT IF EXISTS psychosocial_assessments_instrument_fkey;
ALTER TABLE psychosocial_assessments
  ADD CONSTRAINT psychosocial_assessments_instrument_fkey
  FOREIGN KEY (instrument) REFERENCES psychosocial_instruments(code);

-- reference_month só faz sentido em instrumento mensal. Instrumento
-- semestral grava NULL e é chaveado por campanha.
ALTER TABLE psychosocial_assessments
  ALTER COLUMN reference_month DROP NOT NULL;

-- raw_score 0–25 era a escala do WHO-5. Vira só "não negativo";
-- a faixa por instrumento é validada no código que calcula o escore.
ALTER TABLE psychosocial_assessments
  DROP CONSTRAINT IF EXISTS psychosocial_assessments_raw_score_check;
ALTER TABLE psychosocial_assessments
  ADD CONSTRAINT psychosocial_assessments_raw_score_nonneg CHECK (raw_score >= 0);

-- score continua 0–100: é o índice normalizado, comparável entre
-- instrumentos. O CHECK original permanece.

-- Uma resposta por colaborador por campanha. O UNIQUE antigo
-- (user_id, instrument, reference_month) segue valendo para o WHO-5
-- mensal; com reference_month NULL ele não restringe (NULLs distintos).
CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_user_campaign
  ON psychosocial_assessments(user_id, campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_campaign
  ON psychosocial_assessments(campaign_id)
  WHERE campaign_id IS NOT NULL;


-- =====================================================
-- 4. TRIGGER: resposta a campanha precisa ser legítima
--
-- A policy de INSERT só garante user_id = auth.uid(). Sem isto, alguém
-- poderia gravar resposta apontando para a campanha de outra empresa e
-- contaminar o relatório dela.
-- =====================================================

CREATE OR REPLACE FUNCTION valida_resposta_campanha()
RETURNS TRIGGER AS $$
DECLARE
  v_camp   RECORD;
  v_setor  TEXT;
BEGIN
  IF NEW.campaign_id IS NULL THEN
    RETURN NEW;  -- resposta avulsa (fluxo WHO-5 legado)
  END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns c
  WHERE c.id = NEW.campaign_id;

  IF v_camp.id IS NULL THEN
    RAISE EXCEPTION 'Campanha inexistente';
  END IF;

  IF v_camp.status <> 'aberta' THEN
    RAISE EXCEPTION 'Campanha não está aberta';
  END IF;

  IF CURRENT_DATE < v_camp.janela_inicio OR CURRENT_DATE > v_camp.janela_fim THEN
    RAISE EXCEPTION 'Fora da janela da campanha';
  END IF;

  IF NEW.instrument <> v_camp.instrument THEN
    RAISE EXCEPTION 'Instrumento não corresponde ao da campanha';
  END IF;

  -- O respondente precisa ser colaborador ativo da empresa da campanha
  SELECT ec.setor INTO v_setor
  FROM empresa_colaboradores ec
  WHERE ec.user_id = NEW.user_id
    AND ec.empresa_id = v_camp.empresa_id
    AND ec.status IN ('ativo', 'convidado')
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não pertence à empresa da campanha';
  END IF;

  -- E estar no público-alvo, quando a campanha é por setor
  IF v_camp.setores IS NOT NULL AND NOT (v_setor = ANY (v_camp.setores)) THEN
    RAISE EXCEPTION 'Colaborador fora do público-alvo da campanha';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_valida_resposta_campanha ON psychosocial_assessments;
CREATE TRIGGER trg_valida_resposta_campanha
  BEFORE INSERT ON psychosocial_assessments
  FOR EACH ROW EXECUTE FUNCTION valida_resposta_campanha();


-- =====================================================
-- 5. RPCs DO RH
-- =====================================================

-- ── Criar campanha ────────────────────────────────────
DROP FUNCTION IF EXISTS rh_criar_campanha(TEXT, DATE, DATE, TEXT[]);

CREATE OR REPLACE FUNCTION rh_criar_campanha(
  p_instrument    TEXT,
  p_janela_inicio DATE,
  p_janela_fim    DATE,
  p_setores       TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
  v_ativo      BOOLEAN;
  v_id         UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT ativo INTO v_ativo
  FROM psychosocial_instruments WHERE code = p_instrument;

  IF v_ativo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Instrumento desconhecido');
  END IF;
  IF NOT v_ativo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Instrumento ainda não liberado para uso');
  END IF;

  IF p_janela_fim < p_janela_inicio THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Janela inválida');
  END IF;

  -- Uma campanha aberta por instrumento de cada vez, sem sobreposição de
  -- janela: duas campanhas simultâneas do mesmo instrumento gerariam
  -- respostas concorrentes e taxa de resposta sem sentido.
  IF EXISTS (
    SELECT 1 FROM psychosocial_campaigns
    WHERE empresa_id = v_empresa_id
      AND instrument = p_instrument
      AND status = 'aberta'
      AND janela_inicio <= p_janela_fim
      AND janela_fim    >= p_janela_inicio
  ) THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Já existe campanha aberta deste instrumento no período');
  END IF;

  INSERT INTO psychosocial_campaigns
    (empresa_id, instrument, janela_inicio, janela_fim, setores, criada_por)
  VALUES
    (v_empresa_id, p_instrument, p_janela_inicio, p_janela_fim,
     NULLIF(p_setores, '{}'::TEXT[]), auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'campaign_id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_criar_campanha(TEXT, DATE, DATE, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_criar_campanha(TEXT, DATE, DATE, TEXT[]) TO authenticated;


-- ── Encerrar / cancelar campanha ──────────────────────
DROP FUNCTION IF EXISTS rh_encerrar_campanha(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION rh_encerrar_campanha(
  p_campaign_id UUID,
  p_cancelar    BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  UPDATE psychosocial_campaigns
  SET status       = CASE WHEN p_cancelar THEN 'cancelada' ELSE 'encerrada' END,
      encerrada_em = now()
  WHERE id = p_campaign_id
    AND empresa_id = v_empresa_id
    AND status = 'aberta';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campanha não encontrada ou já encerrada');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_encerrar_campanha(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_encerrar_campanha(UUID, BOOLEAN) TO authenticated;


-- ── Listar campanhas com participação ─────────────────
-- Devolve SÓ participação (convidados / respondentes). Nenhum escore.
DROP FUNCTION IF EXISTS rh_listar_campanhas();

CREATE OR REPLACE FUNCTION rh_listar_campanhas()
RETURNS TABLE (
  id              UUID,
  instrument      TEXT,
  instrument_nome TEXT,
  eixo            TEXT,
  janela_inicio   DATE,
  janela_fim      DATE,
  setores         TEXT[],
  status          TEXT,
  encerrada_em    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ,
  n_convidados    INT,
  n_respondentes  INT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT
    c.id,
    c.instrument,
    i.nome,
    i.eixo,
    c.janela_inicio,
    c.janela_fim,
    c.setores,
    c.status,
    c.encerrada_em,
    c.created_at,
    (SELECT COUNT(*)::int
       FROM empresa_colaboradores ec
      WHERE ec.empresa_id = c.empresa_id
        AND ec.status IN ('ativo', 'convidado')
        AND (c.setores IS NULL OR ec.setor = ANY (c.setores))),
    (SELECT COUNT(*)::int
       FROM psychosocial_assessments pa
      WHERE pa.campaign_id = c.id)
  FROM psychosocial_campaigns c
  JOIN psychosocial_instruments i ON i.code = c.instrument
  WHERE c.empresa_id = (SELECT empresa_id FROM emp)
  ORDER BY c.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_listar_campanhas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_listar_campanhas() TO authenticated;


-- ── Participação por setor de uma campanha ────────────
-- Adesão NÃO é dado de saúde: não tem piso de k. Saber que o setor X
-- respondeu 12% é justamente o sinal que o RH precisa ver — adesão baixa
-- num setor costuma ser sinal de risco, não de desinteresse.
DROP FUNCTION IF EXISTS rh_campanha_participacao(UUID);

CREATE OR REPLACE FUNCTION rh_campanha_participacao(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
  v_camp       RECORD;
  v_setores    JSONB;
  v_conv       INT;
  v_resp       INT;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_camp
  FROM psychosocial_campaigns
  WHERE id = p_campaign_id AND empresa_id = v_empresa_id;

  IF v_camp.id IS NULL THEN RETURN NULL; END IF;

  WITH alvo AS (
    SELECT
      ec.user_id,
      COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor') AS setor
    FROM empresa_colaboradores ec
    WHERE ec.empresa_id = v_camp.empresa_id
      AND ec.status IN ('ativo', 'convidado')
      AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
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
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor',         setor,
        'convidados',    convidados,
        'respondentes',  respondentes,
        'taxa',          CASE WHEN convidados > 0
                              THEN ROUND(respondentes * 100.0 / convidados)::int
                              ELSE 0 END
      ) ORDER BY setor
    ), '[]'::jsonb),
    COALESCE(SUM(convidados)::int, 0),
    COALESCE(SUM(respondentes)::int, 0)
  INTO v_setores, v_conv, v_resp
  FROM por_setor;

  RETURN jsonb_build_object(
    'campaign_id',    p_campaign_id,
    'convidados',     v_conv,
    'respondentes',   v_resp,
    'taxa',           CASE WHEN v_conv > 0
                           THEN ROUND(v_resp * 100.0 / v_conv)::int
                           ELSE 0 END,
    'setores',        v_setores
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_campanha_participacao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_participacao(UUID) TO authenticated;


-- ── Setores existentes na empresa (para montar o público-alvo) ──
DROP FUNCTION IF EXISTS rh_setores();

CREATE OR REPLACE FUNCTION rh_setores()
RETURNS TABLE (setor TEXT, n INT) AS $$
  SELECT TRIM(ec.setor), COUNT(*)::int
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
    AND ec.status IN ('ativo', 'convidado')
    AND NULLIF(TRIM(ec.setor), '') IS NOT NULL
  GROUP BY TRIM(ec.setor)
  ORDER BY 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_setores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setores() TO authenticated;


-- =====================================================
-- 6. RPC DO COLABORADOR
--
-- Campanhas abertas, dentro da janela, dirigidas ao setor dele e que
-- ele ainda não respondeu. É o que o app vai consumir no lugar da regra
-- de localStorage.
-- =====================================================

DROP FUNCTION IF EXISTS minhas_campanhas_pendentes();

CREATE OR REPLACE FUNCTION minhas_campanhas_pendentes()
RETURNS TABLE (
  campaign_id     UUID,
  instrument      TEXT,
  instrument_nome TEXT,
  janela_inicio   DATE,
  janela_fim      DATE,
  empresa_nome    TEXT
) AS $$
  SELECT
    c.id, c.instrument, i.nome, c.janela_inicio, c.janela_fim, e.nome
  FROM psychosocial_campaigns c
  JOIN psychosocial_instruments i ON i.code = c.instrument
  JOIN empresas e               ON e.id = c.empresa_id
  JOIN empresa_colaboradores ec ON ec.empresa_id = c.empresa_id
                              AND ec.user_id = auth.uid()
                              AND ec.status IN ('ativo', 'convidado')
  WHERE c.status = 'aberta'
    AND CURRENT_DATE BETWEEN c.janela_inicio AND c.janela_fim
    AND e.status = 'ativa'
    AND e.acesso_bloqueado = false
    AND (c.setores IS NULL OR ec.setor = ANY (c.setores))
    AND NOT EXISTS (
      SELECT 1 FROM psychosocial_assessments pa
      WHERE pa.campaign_id = c.id AND pa.user_id = auth.uid()
    )
  ORDER BY c.janela_fim ASC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION minhas_campanhas_pendentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION minhas_campanhas_pendentes() TO authenticated;
