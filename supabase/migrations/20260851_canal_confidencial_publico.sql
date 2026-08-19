-- =====================================================
-- Malama — Canal confidencial: porta pública e fim do acompanhamento
--
-- Duas mudanças que saem da mesma correção de modelo.
--
-- 1. O PROTOCOLO É O NÚMERO DO CASO DO RH, para o arquivo de provas. Nunca foi
--    código de acompanhamento do relator. Como nada na linha liga o relato a
--    uma pessoa, não existe a quem devolver retorno: a chave, a consulta por
--    protocolo e o campo "retorno visível ao relator" saem inteiros. O que
--    sobra é registro_apuracao — onde o RH escreve o que foi apurado, para o
--    próprio arquivo.
--
-- 2. EMPRESA EM MODO COMPLIANCE NÃO DÁ APP AO COLABORADOR. A única porta que
--    essa base tem é o link do questionário que chegou pelo WhatsApp, e é de
--    dentro dele que o canal precisa ser alcançável — sem trocar de URL, para
--    que abrir o canal seja indistinguível de responder à pesquisa para
--    qualquer observador: colega ao lado, histórico do navegador, proxy da
--    empresa num aparelho corporativo.
--
--    Cartaz com QR foi descartado de propósito. Escanear um QR de assédio é um
--    ato público: quem faz fica visível para a câmera do corredor e para quem
--    passa. O anonimato morreria antes do primeiro caractere.
--
-- DE QUEBRA, ISTO CONSERTA O CANAL DO APP, QUE NUNCA FUNCIONOU. A versão
-- anterior de enviar_relato_confidencial chamava crypt()/gen_salt() do
-- pgcrypto sob SET search_path = public, mas neste projeto a extensão está no
-- schema "extensions" (ver 20260627_clinical_dataloop_foundation.sql). Os
-- nomes não resolviam e todo envio morria com "function crypt(...) does not
-- exist". Sem chave para gerar, o problema deixa de existir. Nada aqui pode
-- voltar a depender de pgcrypto sem qualificar o schema.
-- =====================================================

-- ── 1. Fim do acompanhamento ───────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.acompanhar_relato_confidencial(TEXT, TEXT);

-- A chave só existia para essa consulta. Deixar a coluna de pé sem ninguém
-- escrever nem verificar seria armadilha para quem ler isto depois: o nome
-- promete um mecanismo que não existe mais. Os hashes guardados são de códigos
-- que já não abrem nada.
ALTER TABLE public.relatos_confidenciais_trabalho DROP COLUMN IF EXISTS chave_hash;

-- "retorno_publico" dizia que o texto era visto pelo relator. Sem consulta por
-- protocolo, ninguém de fora lê isso — e um RH que acredita no nome da coluna
-- escreve uma resposta cuidadosa para o vazio.
DO $bloco$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relatos_confidenciais_trabalho'
      AND column_name = 'retorno_publico'
  ) THEN
    ALTER TABLE public.relatos_confidenciais_trabalho
      RENAME COLUMN retorno_publico TO registro_apuracao;
  END IF;
END;
$bloco$;

-- ── 2. Origem do relato ────────────────────────────────────────────────────

ALTER TABLE public.relatos_confidenciais_trabalho
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'app'
  CHECK (origem IN ('app', 'link_publico'));

-- ── 3. Envio pelo app, agora sem chave ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enviar_relato_confidencial(
  p_categoria TEXT,
  p_urgencia TEXT,
  p_descricao TEXT,
  p_setor TEXT DEFAULT NULL,
  p_envolvidos TEXT DEFAULT NULL,
  p_quando_ocorreu TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_empresa UUID;
BEGIN
  SELECT ec.empresa_id INTO v_empresa
  FROM public.empresa_colaboradores ec
  JOIN public.empresas e ON e.id = ec.empresa_id
  WHERE ec.user_id = auth.uid() AND ec.status = 'ativo' AND e.status = 'ativa'
  LIMIT 1;

  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Benefício empresarial ativo não encontrado'; END IF;

  INSERT INTO public.relatos_confidenciais_trabalho(
    empresa_id, protocolo, categoria, urgencia, descricao, setor, envolvidos, quando_ocorreu, origem
  ) VALUES (
    v_empresa,
    'MAL-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
    p_categoria, p_urgencia, trim(p_descricao),
    NULLIF(trim(coalesce(p_setor, '')), ''),
    NULLIF(trim(coalesce(p_envolvidos, '')), ''),
    NULLIF(trim(coalesce(p_quando_ocorreu, '')), ''),
    'app'
  );

  -- Nenhum user_id é gravado, e o protocolo não volta para o cliente: ele é do
  -- RH. Na mão do relator seria papel comprometedor que não abre nada.
  RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.enviar_relato_confidencial(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_relato_confidencial(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── 4. Freio de enxurrada, sem tocar em nada identificável ─────────────────
--
-- A função pública é chamável por anon, então precisa de teto. O teto é por
-- LINK e por DIA. De propósito não há IP aqui: processar IP contradiz a única
-- promessa que este canal faz. A tabela guarda o hash do token e um contador —
-- nada que ligue de volta a um relato.

CREATE TABLE IF NOT EXISTS public.relatos_publicos_throttle (
  token_hash TEXT NOT NULL,
  dia DATE NOT NULL,
  contagem INT NOT NULL DEFAULT 0,
  PRIMARY KEY (token_hash, dia)
);

ALTER TABLE public.relatos_publicos_throttle ENABLE ROW LEVEL SECURITY;
-- Sem policies: só a função SECURITY DEFINER abaixo toca.

-- ── 5. Envio pelo link do questionário, sem login ──────────────────────────

CREATE OR REPLACE FUNCTION public.enviar_relato_publico(
  p_token TEXT,
  p_categoria TEXT,
  p_urgencia TEXT,
  p_descricao TEXT,
  p_setor TEXT DEFAULT NULL,
  p_envolvidos TEXT DEFAULT NULL,
  p_quando_ocorreu TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_empresa UUID;
  v_hash TEXT;
  v_contagem INT;
BEGIN
  -- A janela da campanha NÃO é checada, e isso é intencional: o link continua
  -- sendo a porta do canal depois de a pesquisa encerrar. Assédio não acontece
  -- só dentro do prazo do questionário, e o link já está na conversa do
  -- WhatsApp — é o único endereço que essa pessoa tem.
  SELECT c.empresa_id INTO v_empresa
  FROM public.psychosocial_setor_links l
  JOIN public.psychosocial_campaigns c ON c.id = l.campaign_id
  JOIN public.empresas e ON e.id = c.empresa_id
  WHERE l.token = p_token AND e.status = 'ativa';

  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;

  -- sha256() nativa do Postgres, e NÃO digest() do pgcrypto: neste projeto a
  -- extensão vive no schema "extensions", então sob SET search_path = public a
  -- digest() não resolve e a função inteira morre com "function does not
  -- exist". Foi assim que o canal do app nasceu quebrado (ver abaixo).
  v_hash := encode(sha256(p_token::bytea), 'hex');
  INSERT INTO public.relatos_publicos_throttle(token_hash, dia, contagem)
  VALUES (v_hash, CURRENT_DATE, 1)
  ON CONFLICT (token_hash, dia)
  DO UPDATE SET contagem = public.relatos_publicos_throttle.contagem + 1
  RETURNING contagem INTO v_contagem;

  -- Estourar o teto aborta a função inteira, e o incremento volta atrás junto.
  -- O contador fica parado no limite e todo envio seguinte do dia é recusado,
  -- que é o comportamento desejado.
  IF v_contagem > 20 THEN
    RAISE EXCEPTION 'Muitos envios por este link hoje. Tente novamente amanhã.';
  END IF;

  -- O SETOR NÃO É HERDADO DO TOKEN, embora o token saiba qual é. Preencher
  -- sozinho estreitaria o universo de suspeitos sem a pessoa ter escolhido
  -- isso — em setor pequeno, identifica. Vale só o que ela digitar. Pelo mesmo
  -- motivo o token não é gravado na linha.
  INSERT INTO public.relatos_confidenciais_trabalho(
    empresa_id, protocolo, categoria, urgencia, descricao, setor, envolvidos, quando_ocorreu, origem
  ) VALUES (
    v_empresa,
    'MAL-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
    p_categoria, p_urgencia, trim(p_descricao),
    NULLIF(trim(coalesce(p_setor, '')), ''),
    NULLIF(trim(coalesce(p_envolvidos, '')), ''),
    NULLIF(trim(coalesce(p_quando_ocorreu, '')), ''),
    'link_publico'
  );

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.enviar_relato_publico(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_relato_publico(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ── 6. Fila do RH: registro da apuração e origem ───────────────────────────

CREATE OR REPLACE FUNCTION public.rh_abrir_relato(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_rh public.rh_usuarios%ROWTYPE; v_relato public.relatos_confidenciais_trabalho%ROWTYPE;
BEGIN
  SELECT * INTO v_rh FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND (principal OR 'apuracao' = ANY(permissoes));
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Acesso restrito à equipe de apuração'; END IF;
  SELECT * INTO v_relato FROM public.relatos_confidenciais_trabalho
  WHERE id = p_id AND empresa_id = v_rh.empresa_id;
  IF v_relato.id IS NULL THEN RAISE EXCEPTION 'Relato não encontrado'; END IF;
  INSERT INTO public.relatos_confidenciais_auditoria(relato_id, rh_usuario_id, acao)
  VALUES (v_relato.id, v_rh.id, 'abriu');
  RETURN jsonb_build_object(
    'id', v_relato.id, 'protocolo', v_relato.protocolo, 'categoria', v_relato.categoria,
    'urgencia', v_relato.urgencia, 'descricao', v_relato.descricao, 'setor', v_relato.setor,
    'envolvidos', v_relato.envolvidos, 'quando_ocorreu', v_relato.quando_ocorreu,
    'status', v_relato.status, 'registro_apuracao', v_relato.registro_apuracao,
    'origem', v_relato.origem,
    'criado_em', v_relato.criado_em, 'atualizado_em', v_relato.atualizado_em
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.rh_abrir_relato(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_abrir_relato(UUID) TO authenticated;

-- Trocar o NOME de um parâmetro exige DROP: CREATE OR REPLACE não renomeia.
DROP FUNCTION IF EXISTS public.rh_atualizar_relato(UUID, TEXT, TEXT);

CREATE FUNCTION public.rh_atualizar_relato(
  p_id UUID, p_status TEXT, p_registro_apuracao TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_rh public.rh_usuarios%ROWTYPE; v_anterior TEXT;
BEGIN
  SELECT * INTO v_rh FROM public.rh_usuarios
  WHERE user_id = auth.uid() AND ativo AND (principal OR 'apuracao' = ANY(permissoes));
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Acesso restrito à equipe de apuração'; END IF;
  IF p_status NOT IN ('novo','acolhimento','em_apuracao','encaminhado','concluido','arquivado') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT status INTO v_anterior FROM public.relatos_confidenciais_trabalho
  WHERE id = p_id AND empresa_id = v_rh.empresa_id FOR UPDATE;
  IF v_anterior IS NULL THEN RAISE EXCEPTION 'Relato não encontrado'; END IF;
  UPDATE public.relatos_confidenciais_trabalho
  SET status = p_status, registro_apuracao = NULLIF(trim(p_registro_apuracao), ''), atualizado_em = now()
  WHERE id = p_id;
  INSERT INTO public.relatos_confidenciais_auditoria(relato_id, rh_usuario_id, acao, detalhes)
  VALUES (p_id, v_rh.id, 'alterou_status', jsonb_build_object('de', v_anterior, 'para', p_status));
  RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.rh_atualizar_relato(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_atualizar_relato(UUID, TEXT, TEXT) TO authenticated;
