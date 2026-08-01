-- =====================================================
-- Malama — Links de questionário para envio pelo RH
-- Migration: 20260731_campanha_links.sql
--
-- Aplicar via SQL Editor, depois de 20260728_psychosocial_campaign_engine.
--
-- PROBLEMA
--   Depender de o colaborador abrir o app sozinho no começo do mês entrega
--   adesão baixa. O RH quer poder mandar o questionário no WhatsApp, colar
--   no mural, no e-mail interno — como um Google Forms.
--
-- POR QUE LINK POR PESSOA, E NÃO UM LINK DA EMPRESA
--   Um link único é mais fácil de distribuir, mas quebra tudo que dá valor
--   ao dado: sem saber quem é quem não há como impedir a mesma pessoa de
--   responder duas vezes, nem como saber o setor de quem respondeu — e é o
--   recorte por setor que sustenta o relatório de PGR e a matriz de risco.
--   Então cada colaborador tem seu próprio token.
--
-- O QUE O RH CONTINUA NÃO VENDO
--   `rh_campanha_links` devolve nome, e-mail, setor e token. NÃO devolve — e
--   não pode passar a devolver — se a pessoa já respondeu. Saber quem falta
--   é o complemento de saber quem respondeu, e isso é exatamente a informação
--   que o módulo promete não entregar. A adesão continua saindo só agregada
--   por setor, por `rh_campanha_participacao`.
--
-- LIMITE CONHECIDO, REGISTRADO DE PROPÓSITO
--   Quem distribui os links tem os links. Um RH mal-intencionado pode abrir
--   o link de alguém e ver a tela de "já respondido", ou responder no lugar
--   da pessoa. Isso é inerente a QUALQUER link nominal distribuído por quem
--   é do RH (vale igual para Google Forms com link por pessoa) e não se
--   resolve no banco — só trocando o distribuidor: um envio disparado pelo
--   sistema direto ao colaborador, em que o RH nunca vê o token. Se essa
--   garantia virar requisito contratual, é esse o caminho, e a tabela aqui
--   já suporta (basta o envio passar a ser feito por Edge Function).
--
-- SEM CONTA, SEM LINK
--   `psychosocial_assessments.user_id` referencia auth.users e o trigger
--   exige vínculo com a empresa por user_id. Colaborador convidado que ainda
--   não criou conta, portanto, não recebe link — a UI do RH mostra quantos
--   estão nessa situação em vez de silenciar a diferença.
-- =====================================================

-- =====================================================
-- 1. TOKENS
-- =====================================================

CREATE TABLE IF NOT EXISTS psychosocial_campaign_tokens (
  token       TEXT PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES psychosocial_campaigns(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Um token por pessoa por campanha: reemitir a lista não troca o link de
  -- quem já recebeu, senão o link que circulou no WhatsApp morre.
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_tokens_campaign
  ON psychosocial_campaign_tokens(campaign_id);

ALTER TABLE psychosocial_campaign_tokens ENABLE ROW LEVEL SECURITY;

-- NENHUMA policy, de propósito: a tabela liga token -> pessoa, então leitura
-- direta por qualquer papel (RH inclusive) permitiria cruzar com as respostas.
-- Só as funções SECURITY DEFINER abaixo tocam nela.


-- =====================================================
-- 2. GERADOR DE TOKEN
--
-- 24 bytes aleatórios (192 bits) em base64 url-safe = 32 caracteres. Não é
-- adivinhável por força bruta, e cabe numa URL curta de WhatsApp.
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_token_campanha()
RETURNS TEXT AS $$
  -- translate() troca '+' e '/' e REMOVE o '=' (sem contraparte no destino).
  SELECT translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');
$$ LANGUAGE sql VOLATILE SET search_path = public, extensions;


-- =====================================================
-- 3. RPC DO RH — emitir e listar os links
--
-- Idempotente: chamar de novo devolve os mesmos tokens e só cria os que
-- faltam (colaborador que entrou na empresa depois da primeira emissão).
-- =====================================================

DROP FUNCTION IF EXISTS rh_campanha_links(UUID);

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

  -- Emite o que falta. O público-alvo é o MESMO de rh_campanha_participacao:
  -- se divergir, a taxa de adesão passa a ser calculada sobre um denominador
  -- diferente do de quem recebeu link.
  INSERT INTO psychosocial_campaign_tokens (token, campaign_id, user_id)
  SELECT gerar_token_campanha(), p_campaign_id, ec.user_id
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id = v_camp.empresa_id
    AND ec.user_id IS NOT NULL
    AND ec.status IN ('ativo', 'convidado')
    AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores))
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  -- Alvo sem conta criada: não dá para emitir link (ver cabeçalho). Contado
  -- para a UI poder dizer o motivo em vez de a lista vir menor sem explicação.
  SELECT COUNT(*)::int INTO v_sem_conta
  FROM empresa_colaboradores ec
  WHERE ec.empresa_id = v_camp.empresa_id
    AND ec.user_id IS NULL
    AND ec.status IN ('ativo', 'convidado')
    AND (v_camp.setores IS NULL OR ec.setor = ANY (v_camp.setores));

  -- ATENÇÃO: nada aqui indica se a pessoa já respondeu, e não deve passar a
  -- indicar. Ver "O QUE O RH CONTINUA NÃO VENDO" no cabeçalho.
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'nome'), '[]'::jsonb) INTO v_links
  FROM (
    SELECT jsonb_build_object(
      'nome',  COALESCE(NULLIF(TRIM(p.display_name), ''), split_part(ec.email, '@', 1)),
      'email', ec.email,
      'setor', COALESCE(NULLIF(TRIM(ec.setor), ''), 'Sem setor'),
      'token', t.token
    ) AS x
    FROM psychosocial_campaign_tokens t
    JOIN empresa_colaboradores ec
      ON ec.user_id = t.user_id AND ec.empresa_id = v_camp.empresa_id
    LEFT JOIN profiles p ON p.id = t.user_id
    WHERE t.campaign_id = p_campaign_id
  ) s;

  RETURN jsonb_build_object(
    'ok',           true,
    'janela_fim',   v_camp.janela_fim,
    'sem_conta',    v_sem_conta,
    'links',        v_links
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_campanha_links(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_links(UUID) TO authenticated;


-- =====================================================
-- 4. RPC PÚBLICA — o que a tela do link precisa saber
--
-- Chamada SEM login (anon). Devolve só o suficiente para montar a tela e
-- explicar o motivo quando o link não serve mais.
-- =====================================================

DROP FUNCTION IF EXISTS campanha_por_token(TEXT);

CREATE OR REPLACE FUNCTION campanha_por_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT
    c.id AS campaign_id, c.instrument, c.status,
    c.janela_inicio, c.janela_fim,
    i.nome AS instrument_nome,
    e.nome AS empresa_nome,
    EXISTS (
      SELECT 1 FROM psychosocial_assessments a
      WHERE a.campaign_id = c.id AND a.user_id = t.user_id
    ) AS ja_respondeu
  INTO v
  FROM psychosocial_campaign_tokens t
  JOIN psychosocial_campaigns c   ON c.id = t.campaign_id
  JOIN psychosocial_instruments i ON i.code = c.instrument
  JOIN empresas e                 ON e.id = c.empresa_id
  WHERE t.token = p_token;

  IF v.campaign_id IS NULL THEN
    RETURN jsonb_build_object('estado', 'invalido');
  END IF;

  IF v.ja_respondeu THEN
    RETURN jsonb_build_object('estado', 'ja_respondeu');
  END IF;

  IF v.status <> 'aberta' THEN
    RETURN jsonb_build_object('estado', 'encerrada');
  END IF;

  IF CURRENT_DATE < v.janela_inicio OR CURRENT_DATE > v.janela_fim THEN
    RETURN jsonb_build_object('estado', 'fora_da_janela',
                              'janela_fim', v.janela_fim);
  END IF;

  RETURN jsonb_build_object(
    'estado',          'ok',
    'instrument',      v.instrument,
    'instrument_nome', v.instrument_nome,
    'empresa_nome',    v.empresa_nome,
    'janela_fim',      v.janela_fim
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION campanha_por_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION campanha_por_token(TEXT) TO anon, authenticated;


-- =====================================================
-- 5. RPC PÚBLICA — gravar a resposta vinda do link
--
-- O escore chega calculado pelo cliente, igual ao fluxo de dentro do app:
-- a chave de correção vive no registro de instrumentos em TypeScript, e é
-- lá que ela é auditável. O que blinda a gravação é o mesmo trigger de
-- sempre (janela, status, instrumento, público-alvo) — o token só resolve
-- QUEM está respondendo, que sem login não dá para saber de outro jeito.
-- =====================================================

DROP FUNCTION IF EXISTS responder_por_token(TEXT, JSONB, INT, INT, JSONB);

CREATE OR REPLACE FUNCTION responder_por_token(
  p_token     TEXT,
  p_answers   JSONB,
  p_raw_score INT,
  p_score     INT,
  p_subscores JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user     UUID;
  v_campaign UUID;
  v_instr    TEXT;
  v_cadencia INT;
BEGIN
  SELECT t.user_id, c.id, c.instrument, i.cadencia_meses
    INTO v_user, v_campaign, v_instr, v_cadencia
  FROM psychosocial_campaign_tokens t
  JOIN psychosocial_campaigns c   ON c.id = t.campaign_id
  JOIN psychosocial_instruments i ON i.code = c.instrument
  WHERE t.token = p_token;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Link inválido');
  END IF;

  -- Uma resposta por campanha. Checado aqui para dar mensagem boa; o índice
  -- único do WHO-5 mensal continua sendo a garantia de verdade.
  IF EXISTS (
    SELECT 1 FROM psychosocial_assessments
    WHERE campaign_id = v_campaign AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este questionário já foi respondido.');
  END IF;

  INSERT INTO psychosocial_assessments
    (user_id, campaign_id, instrument, reference_month,
     answers, raw_score, score, subscores)
  VALUES
    (v_user, v_campaign, v_instr,
     CASE WHEN v_cadencia = 1 THEN date_trunc('month', CURRENT_DATE)::date ELSE NULL END,
     p_answers, p_raw_score, p_score, p_subscores);

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  -- As exceções do trigger já são frases em português escritas para serem
  -- lidas por quem está respondendo ("Fora da janela da campanha").
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION responder_por_token(TEXT, JSONB, INT, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION responder_por_token(TEXT, JSONB, INT, INT, JSONB) TO anon, authenticated;
