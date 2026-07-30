-- =====================================================
-- Malama — Ingestão de eventos SST do eSocial
-- Migration: 20260814_ingestao_esocial.sql
--
-- Aplicar via SQL Editor, depois de 20260813.
--
-- O QUE ISTO RESOLVE
-- O eixo de absenteísmo da 20260731 depende do RH digitar capítulo de CID,
-- dias e setor a partir de papel. Isso não acontece com consistência, e é
-- justamente o KPI que a fiscalização olha. Toda empresa brasileira já
-- declara esses eventos ao governo em formato padronizado — ler o formato
-- que já existe elimina a digitação.
--
-- NEUTRO DE FORNECEDOR POR CONSTRUÇÃO
-- O schema canônico são os eventos SST do eSocial. Quem os emite (TOTVS
-- SIGAMDT, clínica de medicina do trabalho, Senior, SAP) é irrelevante para
-- esta camada: muda o transporte, não o conteúdo.
--
-- ─────────────────────────────────────────────────────────────────
-- A FRONTEIRA QUE NÃO PODE SER ATRAVESSADA
--
-- A 20260731 recusou de propósito guardar dado de saúde nominal: não há
-- identificador de pessoa em empresa_afastamentos. O comportamento natural
-- de qualquer integração é "sincroniza tudo", e sincronizar tudo aqui
-- recriaria exatamente a base que foi recusada.
--
-- Regra: o CPF entra, resolve o setor, e é DESCARTADO. Nunca é gravado
-- junto do evento de saúde. O que persiste continua sendo (setor,
-- capítulo, dias) — igual ao caminho manual.
--
-- ─────────────────────────────────────────────────────────────────
-- POR QUE SÓ CPF COM CORRESPONDÊNCIA É INGERIDO
--
-- Um arquivo do eSocial cobre TODOS os empregados da empresa, não só quem
-- tem assento na Malama. Ingerir tudo quebraria a métrica: o relatório da
-- 20260731 divide dias perdidos pelo número de colaboradores COM ASSENTO
-- no setor (linha 298 daquele arquivo). Numerador da empresa inteira sobre
-- denominador de assentos daria "dias perdidos por colaborador" inflado —
-- um número errado num documento que vai para o PGR.
--
-- Então: só entra evento de CPF que casa com colaborador da empresa. O
-- restante é CONTADO e devolvido ao RH como "fora da base Malama", para a
-- lacuna ficar visível em vez de virar viés silencioso.
--
-- Cobrir a empresa inteira exige headcount por setor como entrada nova.
-- É uma decisão de produto, não um detalhe de ingestão, e fica de fora.
-- =====================================================


-- =====================================================
-- 1. CPF NO CADASTRO — chave de junção, não atributo de saúde
-- =====================================================

ALTER TABLE public.empresa_colaboradores
  ADD COLUMN IF NOT EXISTS cpf CHAR(11);

-- Só dígitos. A normalização acontece antes de chegar aqui; o CHECK é a
-- rede de segurança contra máscara ("123.456.789-01") entrando no banco e
-- fazendo a junção falhar em silêncio.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresa_colaboradores_cpf_digitos'
  ) THEN
    ALTER TABLE public.empresa_colaboradores
      ADD CONSTRAINT empresa_colaboradores_cpf_digitos
      CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$');
  END IF;
END $$;

-- Mesmo CPF duas vezes na mesma empresa duplicaria a resolução de setor.
-- Parcial: a esmagadora maioria dos cadastros não tem CPF ainda.
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_cpf_unico
  ON public.empresa_colaboradores(empresa_id, cpf)
  WHERE cpf IS NOT NULL;

COMMENT ON COLUMN public.empresa_colaboradores.cpf IS
  'Chave de junção com eventos do eSocial, que chaveiam por CPF. Dado pessoal, NÃO sensível. Usado para resolver o setor no momento da ingestão e descartado — nunca é gravado junto de evento de saúde.';


-- =====================================================
-- 2. IDEMPOTÊNCIA SEM IDENTIFICAR NINGUÉM
--
-- Reenvio de arquivo é a regra, não a exceção: exportação mensal costuma
-- repetir eventos do mês anterior. Sem chave de deduplicação, o mesmo
-- afastamento entra duas vezes e o KPI dobra.
--
-- A chave é HMAC(salt, cpf || data || capítulo):
--   • hash simples de CPF NÃO serve — o espaço é 10^11, quebrável por
--     força bruta em minutos. Seria pseudonimização de fachada.
--   • o salt fica no Vault, mesmo padrão de _training_salt() (20260627).
--   • a chave inclui data e capítulo de propósito: assim ela varia a cada
--     evento e NÃO permite agrupar o histórico de uma pessoa. Dá
--     idempotência exata sem dar capacidade de reidentificação.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'sst_evento_salt') THEN
    PERFORM vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'sst_evento_salt',
      'Salt do HMAC de deduplicação de eventos SST. Trocar invalida a deduplicação histórica.'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vault indisponível — salt de SST não criado: %', SQLERRM;
END;
$do$;

CREATE OR REPLACE FUNCTION public._sst_evento_chave(
  p_cpf      TEXT,
  p_data     DATE,
  p_capitulo TEXT
)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_salt TEXT;
BEGIN
  SELECT decrypted_secret INTO v_salt
  FROM vault.decrypted_secrets WHERE name = 'sst_evento_salt';

  IF COALESCE(v_salt, '') = '' THEN
    RAISE EXCEPTION 'sst_evento_salt ausente no Vault — ingestão bloqueada para não gravar sem deduplicação.';
  END IF;

  RETURN encode(
    extensions.hmac(p_cpf || '|' || p_data::text || '|' || p_capitulo, v_salt, 'sha256'),
    'hex'
  );
END;
$$;

REVOKE ALL ON FUNCTION public._sst_evento_chave(TEXT, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._sst_evento_chave(TEXT, DATE, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public._sst_evento_chave(TEXT, DATE, TEXT) FROM authenticated;

COMMENT ON FUNCTION public._sst_evento_chave(TEXT, DATE, TEXT) IS
  'Uso interno da ingestão. EXECUTE revogado: a função aceita CPF como entrada e não deve ser chamável por usuário de aplicação.';


-- =====================================================
-- 3. PROCEDÊNCIA NO REGISTRO DE AFASTAMENTO
-- =====================================================

ALTER TABLE public.empresa_afastamentos
  ADD COLUMN IF NOT EXISTS origem      TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origem_hash TEXT,
  ADD COLUMN IF NOT EXISTS lote_id     UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresa_afastamentos_origem_valida'
  ) THEN
    ALTER TABLE public.empresa_afastamentos
      ADD CONSTRAINT empresa_afastamentos_origem_valida
      CHECK (origem IN ('manual', 'esocial'));
  END IF;
END $$;

-- A deduplicação real. Parcial: lançamento manual não tem hash.
CREATE UNIQUE INDEX IF NOT EXISTS idx_afastamentos_origem_hash
  ON public.empresa_afastamentos(empresa_id, origem_hash)
  WHERE origem_hash IS NOT NULL;


-- =====================================================
-- 4. LOTES — trilha de auditoria da ingestão
--
-- Evidência de PGR precisa dizer de onde o número veio. Sem isto, um
-- relatório com 400 afastamentos importados é indistinguível de 400
-- digitados à mão.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.empresa_ingestao_lotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  origem            TEXT NOT NULL DEFAULT 'esocial',
  /** Nome do arquivo enviado. Só rótulo, para o RH se reconhecer. */
  arquivo           TEXT,
  /** SHA-256 do conteúdo: reenvio do mesmo arquivo é detectado na hora. */
  arquivo_hash      TEXT,
  eventos_lidos     INTEGER NOT NULL DEFAULT 0,
  eventos_gravados  INTEGER NOT NULL DEFAULT 0,
  eventos_repetidos INTEGER NOT NULL DEFAULT 0,
  /** CPF do arquivo que não é colaborador Malama — esperado, não erro. */
  fora_da_base      INTEGER NOT NULL DEFAULT 0,
  /** Reconhecidos porém sem destino nesta versão (CAT, ASO, agentes). */
  sem_destino       INTEGER NOT NULL DEFAULT 0,
  enviado_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestao_lotes_empresa
  ON public.empresa_ingestao_lotes(empresa_id, created_at DESC);

ALTER TABLE public.empresa_ingestao_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all ingestao_lotes" ON public.empresa_ingestao_lotes;
CREATE POLICY "super_admin all ingestao_lotes"
  ON public.empresa_ingestao_lotes FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own ingestao_lotes" ON public.empresa_ingestao_lotes;
CREATE POLICY "rh reads own ingestao_lotes"
  ON public.empresa_ingestao_lotes FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));


-- =====================================================
-- 5. RPC: vincular CPF ao colaborador
--
-- Em lote, porque o caso de uso é colar uma planilha, não editar 300 fichas.
-- p_pares: [{ "email": "...", "cpf": "12345678901" }, ...]
-- =====================================================

DROP FUNCTION IF EXISTS rh_vincular_cpfs(JSONB);

CREATE OR REPLACE FUNCTION rh_vincular_cpfs(p_pares JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_par        JSONB;
  v_cpf        TEXT;
  v_email      TEXT;
  v_ok         INT := 0;
  v_nao_achou  INT := 0;
  v_invalido   INT := 0;
  v_duplicado  INT := 0;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF p_pares IS NULL OR jsonb_typeof(p_pares) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lista de vínculos inválida');
  END IF;

  FOR v_par IN SELECT * FROM jsonb_array_elements(p_pares) LOOP
    v_email := LOWER(TRIM(COALESCE(v_par ->> 'email', '')));
    v_cpf   := regexp_replace(COALESCE(v_par ->> 'cpf', ''), '[^0-9]', '', 'g');

    IF v_cpf !~ '^[0-9]{11}$' OR v_email = '' THEN
      v_invalido := v_invalido + 1;
      CONTINUE;
    END IF;

    BEGIN
      UPDATE empresa_colaboradores
         SET cpf = v_cpf
       WHERE empresa_id = v_empresa_id
         AND LOWER(email) = v_email
         AND status <> 'removido';

      IF NOT FOUND THEN
        v_nao_achou := v_nao_achou + 1;
      ELSE
        v_ok := v_ok + 1;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      -- Mesmo CPF já vinculado a outro colaborador desta empresa.
      v_duplicado := v_duplicado + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'vinculados',    v_ok,
    'email_nao_encontrado', v_nao_achou,
    'cpf_invalido',  v_invalido,
    'cpf_duplicado', v_duplicado
  );
END;
$$;

REVOKE ALL ON FUNCTION rh_vincular_cpfs(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_vincular_cpfs(JSONB) TO authenticated;


-- =====================================================
-- 6. RPC: ingerir afastamentos
--
-- p_eventos: [{ "cpf": "...", "data_inicio": "2026-01-15",
--               "capitulo": "F", "dias": 15 }, ...]
--
-- O CPF chega, resolve o setor e morre aqui dentro. Só (setor, capítulo,
-- dias, data) atravessa para empresa_afastamentos.
-- =====================================================

DROP FUNCTION IF EXISTS rh_ingerir_afastamentos(JSONB, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION rh_ingerir_afastamentos(
  p_eventos      JSONB,
  p_arquivo      TEXT DEFAULT NULL,
  p_arquivo_hash TEXT DEFAULT NULL,
  p_sem_destino  INT  DEFAULT 0,
  p_eventos_lidos INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_lote_id    UUID;
  v_ev         JSONB;
  v_cpf        TEXT;
  v_cap        TEXT;
  v_dias       INT;
  v_data       DATE;
  v_setor      TEXT;
  v_achou      BOOLEAN;
  v_chave      TEXT;
  v_grav       INT := 0;
  v_rep        INT := 0;
  v_fora       INT := 0;
  v_desc       INT := 0;
  v_lidos      INT := 0;
  v_ja_enviado UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF p_eventos IS NULL OR jsonb_typeof(p_eventos) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lista de eventos inválida');
  END IF;

  -- Reenvio do mesmo arquivo: avisa em vez de reprocessar. A deduplicação
  -- por evento também pegaria, mas o RH merece saber que já subiu este.
  IF p_arquivo_hash IS NOT NULL THEN
    SELECT id INTO v_ja_enviado
    FROM empresa_ingestao_lotes
    WHERE empresa_id = v_empresa_id AND arquivo_hash = p_arquivo_hash
    LIMIT 1;

    IF v_ja_enviado IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Este arquivo já foi importado anteriormente.',
        'lote_anterior', v_ja_enviado
      );
    END IF;
  END IF;

  INSERT INTO empresa_ingestao_lotes
    (empresa_id, origem, arquivo, arquivo_hash, enviado_por)
  VALUES
    (v_empresa_id, 'esocial', NULLIF(TRIM(COALESCE(p_arquivo, '')), ''),
     p_arquivo_hash, auth.uid())
  RETURNING id INTO v_lote_id;

  FOR v_ev IN SELECT * FROM jsonb_array_elements(p_eventos) LOOP
    v_lidos := v_lidos + 1;

    v_cpf  := regexp_replace(COALESCE(v_ev ->> 'cpf', ''), '[^0-9]', '', 'g');
    v_cap  := UPPER(TRIM(COALESCE(v_ev ->> 'capitulo', '')));
    v_dias := NULLIF(v_ev ->> 'dias', '')::INT;

    BEGIN
      v_data := (v_ev ->> 'data_inicio')::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_data := NULL;
    END;

    -- Registro incompleto não entra: número errado num relatório de PGR é
    -- pior que número ausente.
    IF v_cpf !~ '^[0-9]{11}$'
       OR v_cap !~ '^[A-Z]$'
       OR v_dias IS NULL OR v_dias <= 0 OR v_dias > 365
       OR v_data IS NULL OR v_data > CURRENT_DATE THEN
      v_desc := v_desc + 1;
      CONTINUE;
    END IF;

    -- Resolução do setor. Único uso do CPF.
    SELECT setor, TRUE INTO v_setor, v_achou
    FROM empresa_colaboradores
    WHERE empresa_id = v_empresa_id
      AND cpf = v_cpf
      AND status <> 'removido'
    LIMIT 1;

    IF NOT COALESCE(v_achou, FALSE) THEN
      -- CPF da empresa que não é colaborador Malama. Ver cabeçalho: não
      -- entra, para não desalinhar numerador e denominador do relatório.
      v_fora := v_fora + 1;
      v_achou := FALSE;
      CONTINUE;
    END IF;
    v_achou := FALSE;

    v_chave := public._sst_evento_chave(v_cpf, v_data, v_cap);

    BEGIN
      INSERT INTO empresa_afastamentos
        (empresa_id, setor, cid_grupo, dias, data_inicio,
         registrado_por, origem, origem_hash, lote_id)
      VALUES
        (v_empresa_id, NULLIF(TRIM(COALESCE(v_setor, '')), ''), v_cap, v_dias,
         v_data, auth.uid(), 'esocial', v_chave, v_lote_id);
      v_grav := v_grav + 1;
    EXCEPTION WHEN unique_violation THEN
      v_rep := v_rep + 1;
    END;

    -- Encerra o escopo do CPF neste laço.
    v_cpf := NULL;
    v_setor := NULL;
  END LOOP;

  UPDATE empresa_ingestao_lotes
     SET eventos_lidos     = COALESCE(p_eventos_lidos, v_lidos),
         eventos_gravados  = v_grav,
         eventos_repetidos = v_rep,
         fora_da_base      = v_fora,
         sem_destino       = COALESCE(p_sem_destino, 0) + v_desc
   WHERE id = v_lote_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'lote_id',       v_lote_id,
    'gravados',      v_grav,
    'repetidos',     v_rep,
    'fora_da_base',  v_fora,
    'descartados',   v_desc,
    'sem_destino',   COALESCE(p_sem_destino, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION rh_ingerir_afastamentos(JSONB, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_ingerir_afastamentos(JSONB, TEXT, TEXT, INT, INT) TO authenticated;


-- =====================================================
-- 7. RPC: histórico de lotes para o painel
-- =====================================================

DROP FUNCTION IF EXISTS rh_lotes_ingestao(INT);

CREATE OR REPLACE FUNCTION rh_lotes_ingestao(p_limite INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
DECLARE
  v_empresa_id UUID;
  v_out        JSONB;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    INTO v_out
  FROM (
    SELECT id, arquivo, eventos_lidos, eventos_gravados, eventos_repetidos,
           fora_da_base, sem_destino, created_at
    FROM empresa_ingestao_lotes
    WHERE empresa_id = v_empresa_id
    ORDER BY created_at DESC
    LIMIT GREATEST(COALESCE(p_limite, 20), 1)
  ) x;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION rh_lotes_ingestao(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_lotes_ingestao(INT) TO authenticated;


-- =====================================================
-- 8. Quantos colaboradores ainda estão sem CPF
--    A ingestão só funciona na medida em que o cadastro tem a chave.
-- =====================================================

DROP FUNCTION IF EXISTS rh_cobertura_cpf();

CREATE OR REPLACE FUNCTION rh_cobertura_cpf()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
DECLARE
  v_empresa_id UUID;
  v_total      INT;
  v_com        INT;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN RETURN NULL; END IF;

  SELECT COUNT(*)::int, COUNT(cpf)::int
    INTO v_total, v_com
  FROM empresa_colaboradores
  WHERE empresa_id = v_empresa_id AND status <> 'removido';

  RETURN jsonb_build_object(
    'total',   COALESCE(v_total, 0),
    'com_cpf', COALESCE(v_com, 0),
    'sem_cpf', COALESCE(v_total, 0) - COALESCE(v_com, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION rh_cobertura_cpf() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_cobertura_cpf() TO authenticated;
