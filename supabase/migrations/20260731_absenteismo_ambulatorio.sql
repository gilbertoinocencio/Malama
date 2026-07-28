-- =====================================================
-- Malama — Absenteísmo (atestados) e atendimentos de ambulatório
-- Migration: 20260731_absenteismo_ambulatorio.sql
--
-- Aplicar via SQL Editor, depois de 20260730_matriz_psicossocial.
--
-- DECISÃO CENTRAL: NENHUM DOS DOIS REGISTROS APONTA PARA UMA PESSOA.
-- Não há user_id nem colaborador_id aqui, e é de propósito.
--
--   O que se ganha: a série de dias perdidos por capítulo de CID e por
--   setor — que é o KPI que a fiscalização e o eSocial olham, e o que
--   liga absenteísmo por transtorno mental (capítulo F) ao setor.
--
--   O que se evita: uma base nominal de dados de saúde dentro da Malama.
--   O atestado a empresa já recebe por lei; consolidá-lo aqui com nome
--   multiplicaria a exposição LGPD sem multiplicar o insight.
--
-- Pelo mesmo motivo o atestado NÃO é armazenado: nada de PDF, nada de CID
-- de quatro dígitos, nada de nome de médico, nada de texto livre. Só o
-- CAPÍTULO do CID (a letra), os dias e o setor. São três campos que o RH
-- digita de um papel que ele já tem em mãos.
--
-- O ambulatório registra CATEGORIA DE QUEIXA, nunca diagnóstico. É o sinal
-- mais precoce que existe: o pico de queixa num setor aparece meses antes
-- do afastamento.
--
-- PRIVACIDADE NOS RECORTES: o piso aqui não é sobre o número de eventos e
-- sim sobre o TAMANHO DO SETOR. Contagem agregada num setor de 3 pessoas
-- identifica; num setor de 20, não. Setores com menos de k_min
-- colaboradores não aparecem na quebra — só no total da empresa.
-- =====================================================


-- =====================================================
-- 1. AFASTAMENTOS (atestados)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_afastamentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  -- Setor copiado no lançamento. Texto, não FK: o vínculo é com o setor,
  -- nunca com a pessoa.
  setor          TEXT,
  -- Capítulo do CID-10: só a letra. F = transtornos mentais e
  -- comportamentais, M = osteomuscular, J = respiratório, e assim por diante.
  cid_grupo      CHAR(1) NOT NULL CHECK (cid_grupo ~ '^[A-Z]$'),
  dias           INTEGER NOT NULL CHECK (dias > 0 AND dias <= 365),
  data_inicio    DATE NOT NULL,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afastamentos_empresa
  ON empresa_afastamentos(empresa_id, data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_afastamentos_setor
  ON empresa_afastamentos(empresa_id, setor);

ALTER TABLE empresa_afastamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all afastamentos" ON empresa_afastamentos;
CREATE POLICY "super_admin all afastamentos"
  ON empresa_afastamentos FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own afastamentos" ON empresa_afastamentos;
CREATE POLICY "rh reads own afastamentos"
  ON empresa_afastamentos FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "rh inserts own afastamentos" ON empresa_afastamentos;
CREATE POLICY "rh inserts own afastamentos"
  ON empresa_afastamentos FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

-- Correção de lançamento errado = apagar e relançar. Sem UPDATE: registro
-- que alimenta evidência de PGR não deve ser editável em silêncio.
DROP POLICY IF EXISTS "rh deletes own afastamentos" ON empresa_afastamentos;
CREATE POLICY "rh deletes own afastamentos"
  ON empresa_afastamentos FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));


-- =====================================================
-- 2. ATENDIMENTOS DE AMBULATÓRIO
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_ambulatorio (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  setor          TEXT,
  -- Categoria de QUEIXA, não diagnóstico. Lista fechada de propósito:
  -- campo livre viraria prontuário paralelo sem responsável técnico.
  categoria      TEXT NOT NULL CHECK (categoria IN (
                   'cefaleia',
                   'dor_musculoesqueletica',
                   'ansiedade_estresse',
                   'gastrointestinal',
                   'respiratorio',
                   'cardiovascular',
                   'curativo_procedimento',
                   'medicacao',
                   'outro'
                 )),
  data           DATE NOT NULL,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ambulatorio_empresa
  ON empresa_ambulatorio(empresa_id, data DESC);

ALTER TABLE empresa_ambulatorio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "super_admin all ambulatorio"
  ON empresa_ambulatorio FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "rh reads own ambulatorio"
  ON empresa_ambulatorio FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "rh inserts own ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "rh inserts own ambulatorio"
  ON empresa_ambulatorio FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "rh deletes own ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "rh deletes own ambulatorio"
  ON empresa_ambulatorio FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()));


-- =====================================================
-- 3. RPC: lançar registros
--    Passa pela RPC para o setor ser validado contra a empresa e o
--    empresa_id nunca vir do cliente.
-- =====================================================

DROP FUNCTION IF EXISTS rh_lancar_afastamento(TEXT, CHAR, INTEGER, DATE);

CREATE OR REPLACE FUNCTION rh_lancar_afastamento(
  p_setor       TEXT,
  p_cid_grupo   CHAR,
  p_dias        INTEGER,
  p_data_inicio DATE
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
  v_id         UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF UPPER(p_cid_grupo) !~ '^[A-Z]$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Capítulo de CID inválido');
  END IF;

  IF p_dias IS NULL OR p_dias <= 0 OR p_dias > 365 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dias de afastamento fora do intervalo');
  END IF;

  IF p_data_inicio IS NULL OR p_data_inicio > CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Data de início inválida');
  END IF;

  INSERT INTO empresa_afastamentos
    (empresa_id, setor, cid_grupo, dias, data_inicio, registrado_por)
  VALUES
    (v_empresa_id, NULLIF(TRIM(p_setor), ''), UPPER(p_cid_grupo), p_dias,
     p_data_inicio, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_lancar_afastamento(TEXT, CHAR, INTEGER, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_lancar_afastamento(TEXT, CHAR, INTEGER, DATE) TO authenticated;


DROP FUNCTION IF EXISTS rh_lancar_ambulatorio(TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION rh_lancar_ambulatorio(
  p_setor     TEXT,
  p_categoria TEXT,
  p_data      DATE
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
  v_id         UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF p_data IS NULL OR p_data > CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Data inválida');
  END IF;

  INSERT INTO empresa_ambulatorio
    (empresa_id, setor, categoria, data, registrado_por)
  VALUES
    (v_empresa_id, NULLIF(TRIM(p_setor), ''), p_categoria, p_data, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Categoria de queixa inválida');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_lancar_ambulatorio(TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_lancar_ambulatorio(TEXT, TEXT, DATE) TO authenticated;


-- =====================================================
-- 4. RPC: resumo de absenteísmo
-- =====================================================

DROP FUNCTION IF EXISTS rh_absenteismo_resumo(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_absenteismo_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB AS $$
DECLARE
  k_min      CONSTANT INT := 5;   -- piso pelo TAMANHO do setor
  v_empresa  UUID;
  v_grupos   JSONB;
  v_setores  JSONB;
  v_supr     INT;
  v_eps      INT;
  v_dias     INT;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN RETURN NULL; END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(dias), 0)::int
    INTO v_eps, v_dias
  FROM empresa_afastamentos
  WHERE empresa_id = v_empresa
    AND data_inicio BETWEEN p_inicio AND p_fim;

  -- Quebra por capítulo de CID (total da empresa, sem recorte de setor)
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('grupo', g, 'episodios', e, 'dias', d)
           ORDER BY d DESC
         ), '[]'::jsonb)
    INTO v_grupos
  FROM (
    SELECT cid_grupo AS g, COUNT(*)::int AS e, SUM(dias)::int AS d
    FROM empresa_afastamentos
    WHERE empresa_id = v_empresa
      AND data_inicio BETWEEN p_inicio AND p_fim
    GROUP BY cid_grupo
  ) x;

  -- Quebra por setor. Só setores com >= k_min colaboradores com assento.
  WITH tamanho AS (
    SELECT COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor') AS setor,
           COUNT(*)::int AS colaboradores
    FROM empresa_colaboradores
    WHERE empresa_id = v_empresa AND status IN ('ativo', 'convidado')
    GROUP BY 1
  ),
  af AS (
    SELECT COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor') AS setor,
           COUNT(*)::int AS episodios,
           SUM(dias)::int AS dias,
           SUM(dias) FILTER (WHERE cid_grupo = 'F')::int AS dias_f,
           COUNT(*) FILTER (WHERE cid_grupo = 'F')::int AS episodios_f
    FROM empresa_afastamentos
    WHERE empresa_id = v_empresa
      AND data_inicio BETWEEN p_inicio AND p_fim
    GROUP BY 1
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor',            t.setor,
        'colaboradores',    t.colaboradores,
        'episodios',        COALESCE(a.episodios, 0),
        'dias',             COALESCE(a.dias, 0),
        'dias_f',           COALESCE(a.dias_f, 0),
        'episodios_f',      COALESCE(a.episodios_f, 0),
        -- Dias perdidos por colaborador: normaliza setores de tamanhos
        -- diferentes, senão o setor grande sempre parece o pior.
        'dias_por_colaborador',
          ROUND(COALESCE(a.dias, 0)::numeric / NULLIF(t.colaboradores, 0), 1)
      ) ORDER BY COALESCE(a.dias, 0) DESC, t.setor
    ) FILTER (WHERE t.colaboradores >= k_min), '[]'::jsonb),
    COUNT(*) FILTER (WHERE t.colaboradores < k_min)::int
  INTO v_setores, v_supr
  FROM tamanho t
  LEFT JOIN af a ON a.setor = t.setor;

  RETURN jsonb_build_object(
    'periodo_inicio',     p_inicio,
    'periodo_fim',        p_fim,
    'k_min',              k_min,
    'total_episodios',    COALESCE(v_eps, 0),
    'total_dias',         COALESCE(v_dias, 0),
    'grupos',             v_grupos,
    'setores',            v_setores,
    'setores_suprimidos', COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_absenteismo_resumo(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_absenteismo_resumo(DATE, DATE) TO authenticated;


-- =====================================================
-- 5. RPC: resumo do ambulatório
-- =====================================================

DROP FUNCTION IF EXISTS rh_ambulatorio_resumo(DATE, DATE);

CREATE OR REPLACE FUNCTION rh_ambulatorio_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB AS $$
DECLARE
  k_min      CONSTANT INT := 5;
  v_empresa  UUID;
  v_cats     JSONB;
  v_setores  JSONB;
  v_supr     INT;
  v_total    INT;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN RETURN NULL; END IF;

  SELECT COUNT(*)::int INTO v_total
  FROM empresa_ambulatorio
  WHERE empresa_id = v_empresa AND data BETWEEN p_inicio AND p_fim;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('categoria', c, 'atendimentos', n) ORDER BY n DESC
         ), '[]'::jsonb)
    INTO v_cats
  FROM (
    SELECT categoria AS c, COUNT(*)::int AS n
    FROM empresa_ambulatorio
    WHERE empresa_id = v_empresa AND data BETWEEN p_inicio AND p_fim
    GROUP BY categoria
  ) x;

  WITH tamanho AS (
    SELECT COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor') AS setor,
           COUNT(*)::int AS colaboradores
    FROM empresa_colaboradores
    WHERE empresa_id = v_empresa AND status IN ('ativo', 'convidado')
    GROUP BY 1
  ),
  at AS (
    SELECT COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor') AS setor,
           COUNT(*)::int AS atendimentos,
           COUNT(*) FILTER (WHERE categoria = 'ansiedade_estresse')::int AS ansiedade
    FROM empresa_ambulatorio
    WHERE empresa_id = v_empresa AND data BETWEEN p_inicio AND p_fim
    GROUP BY 1
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'setor',         t.setor,
        'colaboradores', t.colaboradores,
        'atendimentos',  COALESCE(a.atendimentos, 0),
        'ansiedade',     COALESCE(a.ansiedade, 0),
        'por_colaborador',
          ROUND(COALESCE(a.atendimentos, 0)::numeric / NULLIF(t.colaboradores, 0), 1)
      ) ORDER BY COALESCE(a.atendimentos, 0) DESC, t.setor
    ) FILTER (WHERE t.colaboradores >= k_min), '[]'::jsonb),
    COUNT(*) FILTER (WHERE t.colaboradores < k_min)::int
  INTO v_setores, v_supr
  FROM tamanho t
  LEFT JOIN at a ON a.setor = t.setor;

  RETURN jsonb_build_object(
    'periodo_inicio',     p_inicio,
    'periodo_fim',        p_fim,
    'k_min',              k_min,
    'total',              COALESCE(v_total, 0),
    'categorias',         v_cats,
    'setores',            v_setores,
    'setores_suprimidos', COALESCE(v_supr, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_ambulatorio_resumo(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_ambulatorio_resumo(DATE, DATE) TO authenticated;
