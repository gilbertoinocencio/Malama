-- =====================================================
-- Malama — Organização do trabalho (empresa e setor) + calendário sazonal
-- Migration: 20260912_organizacao_do_trabalho.sql
--
-- Aplicar via SQL Editor.
--
-- POR QUÊ: o onboarding pedia descrição do NEGÓCIO (produtos, unidades,
-- "o que fazemos") — que a Receita já responde (20260911) — e não da
-- ORGANIZAÇÃO DO TRABALHO, que é o que o copiloto precisa para ler WHO-5 e
-- JSS por setor. "Carga alta na Cozinha" só vira hipótese útil quando se
-- sabe que a Cozinha tem escala 6x1, calor, pico de almoço e a coleta caiu
-- em janeiro. Esta migration cria o lugar desses dados:
--
--   1. empresa_contexto_operacional.organizacao (JSONB) — 6 grupos
--      estruturados no nível da empresa: eventos dos últimos 12 meses,
--      liderança, vínculos, jornada, remuneração variável, SST existente.
--   2. empresa_setores.organizacao (JSONB) — contato com público, ritmo,
--      condições físicas, escala e previsibilidade, pico, líder formal,
--      meta individual.
--   3. cnae_calendario_sazonal — referência estática de meses de pico por
--      divisão CNAE (o pico declarado pelo setor prevalece).
--   4. rh_agente_contexto() passa a expor UF/município (não identificáveis,
--      necessários para clima) e o calendário da divisão.
--
-- JSONB com validação na RPC, e não colunas tipadas: um grupo de ~10 campos
-- por tabela viraria assinatura de 15 parâmetros; a validação por enum na
-- própria RPC mantém o banco tão estrito quanto um CHECK (valor fora da
-- lista é rejeitado, chave desconhecida é descartada).
--
-- Tudo aqui é DECLARAÇÃO da empresa. Nenhum campo é avaliação de risco, e
-- o motor de hipóteses não cria hipótese a partir deles — só enriquece as
-- que já nascem de tendência ou matriz (ver psicossocial-hipoteses.ts).
-- =====================================================


-- ── 1. Normalizadores (valor fora do enum → exceção; chave estranha → fora) ──

CREATE OR REPLACE FUNCTION public.organizacao_empresa_normalizar(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v JSONB := COALESCE(p, '{}'::jsonb);
  r JSONB := '{}'::jsonb;
  item TEXT;
BEGIN
  IF jsonb_typeof(v) <> 'object' THEN RAISE EXCEPTION 'organizacao deve ser um objeto'; END IF;

  -- listas com enum
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(v->'eventos_12m', '[]'::jsonb)) LOOP
    IF item NOT IN ('demissoes_coletivas','troca_gestao','sistema_novo','expansao_rapida','incidente_grave','fusao_aquisicao','reestruturacao','nenhum') THEN
      RAISE EXCEPTION 'eventos_12m inválido: %', item;
    END IF;
  END LOOP;
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(v->'vinculos', '[]'::jsonb)) LOOP
    IF item NOT IN ('clt','temporario','terceirizado','pj','estagiario','aprendiz') THEN
      RAISE EXCEPTION 'vinculos inválido: %', item;
    END IF;
  END LOOP;
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(v->'sst_existente', '[]'::jsonb)) LOOP
    IF item NOT IN ('sesmt_proprio','sesmt_terceirizado','cipa','pgr_vigente','medicina_trabalho','psicologo','canal_denuncia','nenhum') THEN
      RAISE EXCEPTION 'sst_existente inválido: %', item;
    END IF;
  END LOOP;

  -- escolhas únicas
  IF v->>'lideranca_formal' IS NOT NULL AND v->>'lideranca_formal' NOT IN ('todos_setores','maioria','poucos','nenhum') THEN
    RAISE EXCEPTION 'lideranca_formal inválido';
  END IF;
  IF v->>'pessoas_por_lider' IS NOT NULL AND v->>'pessoas_por_lider' NOT IN ('ate_8','de_9_a_15','de_16_a_30','mais_de_30','varia') THEN
    RAISE EXCEPTION 'pessoas_por_lider inválido';
  END IF;
  IF v->>'vinculo_predominante' IS NOT NULL AND v->>'vinculo_predominante' NOT IN ('clt','temporario','terceirizado','pj','estagiario','aprendiz') THEN
    RAISE EXCEPTION 'vinculo_predominante inválido';
  END IF;
  IF v->>'hora_extra' IS NOT NULL AND v->>'hora_extra' NOT IN ('nao','alguns_setores','rotina') THEN
    RAISE EXCEPTION 'hora_extra inválido';
  END IF;
  IF v->>'escala_predominante' IS NOT NULL AND v->>'escala_predominante' NOT IN ('comercial','6x1','5x2','12x36','revezamento','flexivel','outra') THEN
    RAISE EXCEPTION 'escala_predominante inválido';
  END IF;
  IF v->>'remuneracao_variavel' IS NOT NULL AND v->>'remuneracao_variavel' NOT IN ('nao','alguns_setores','maioria') THEN
    RAISE EXCEPTION 'remuneracao_variavel inválido';
  END IF;
  IF length(COALESCE(v->>'eventos_12m_detalhe', '')) > 500 THEN
    RAISE EXCEPTION 'eventos_12m_detalhe muito longo';
  END IF;
  IF jsonb_array_length(COALESCE(v->'remuneracao_variavel_setores', '[]'::jsonb)) > 50 THEN
    RAISE EXCEPTION 'remuneracao_variavel_setores: máximo 50';
  END IF;

  -- só as chaves conhecidas saem daqui
  r := jsonb_strip_nulls(jsonb_build_object(
    'eventos_12m',                  COALESCE(v->'eventos_12m', '[]'::jsonb),
    'eventos_12m_detalhe',          NULLIF(trim(COALESCE(v->>'eventos_12m_detalhe', '')), ''),
    'lideranca_formal',             v->>'lideranca_formal',
    'pessoas_por_lider',            v->>'pessoas_por_lider',
    'troca_lideranca_12m',          CASE WHEN jsonb_typeof(v->'troca_lideranca_12m') = 'boolean' THEN v->'troca_lideranca_12m' END,
    'vinculos',                     COALESCE(v->'vinculos', '[]'::jsonb),
    'vinculo_predominante',         v->>'vinculo_predominante',
    'hora_extra',                   v->>'hora_extra',
    'banco_de_horas',               CASE WHEN jsonb_typeof(v->'banco_de_horas') = 'boolean' THEN v->'banco_de_horas' END,
    'escala_predominante',          v->>'escala_predominante',
    'remuneracao_variavel',         v->>'remuneracao_variavel',
    'remuneracao_variavel_setores', COALESCE(v->'remuneracao_variavel_setores', '[]'::jsonb),
    'sst_existente',                COALESCE(v->'sst_existente', '[]'::jsonb)
  ));
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.organizacao_setor_normalizar(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v JSONB := COALESCE(p, '{}'::jsonb);
  item TEXT;
  mes  INT;
BEGIN
  IF jsonb_typeof(v) <> 'object' THEN RAISE EXCEPTION 'organizacao deve ser um objeto'; END IF;

  IF v->>'contato_publico' IS NOT NULL AND v->>'contato_publico' NOT IN ('nenhum','indireto','presencial','exposicao_agressao') THEN
    RAISE EXCEPTION 'contato_publico inválido';
  END IF;
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(v->'ritmo_ditado_por', '[]'::jsonb)) LOOP
    IF item NOT IN ('cliente','maquina_sistema','meta','lideranca','propria_equipe') THEN
      RAISE EXCEPTION 'ritmo_ditado_por inválido: %', item;
    END IF;
  END LOOP;
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(v->'condicoes_fisicas', '[]'::jsonb)) LOOP
    IF item NOT IN ('em_pe','esforco_fisico','calor','frio','ruido','repetitivo','dirige') THEN
      RAISE EXCEPTION 'condicoes_fisicas inválido: %', item;
    END IF;
  END LOOP;
  IF v->>'escala' IS NOT NULL AND v->>'escala' NOT IN ('comercial','6x1','5x2','12x36','revezamento','flexivel','outra') THEN
    RAISE EXCEPTION 'escala inválida';
  END IF;
  IF v->>'escala_previsivel' IS NOT NULL AND v->>'escala_previsivel' NOT IN ('sim','parcial','nao') THEN
    RAISE EXCEPTION 'escala_previsivel inválido';
  END IF;
  IF jsonb_typeof(COALESCE(v->'pico_meses', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'pico_meses deve ser lista';
  END IF;
  FOR mes IN SELECT (jsonb_array_elements_text(COALESCE(v->'pico_meses', '[]'::jsonb)))::int LOOP
    IF mes < 1 OR mes > 12 THEN RAISE EXCEPTION 'pico_meses fora de 1..12'; END IF;
  END LOOP;
  IF length(COALESCE(v->>'pico_descricao', '')) > 200 THEN
    RAISE EXCEPTION 'pico_descricao muito longo';
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'contato_publico',   v->>'contato_publico',
    'ritmo_ditado_por',  COALESCE(v->'ritmo_ditado_por', '[]'::jsonb),
    'condicoes_fisicas', COALESCE(v->'condicoes_fisicas', '[]'::jsonb),
    'escala',            v->>'escala',
    'escala_previsivel', v->>'escala_previsivel',
    'pico_meses',        COALESCE(v->'pico_meses', '[]'::jsonb),
    'pico_descricao',    NULLIF(trim(COALESCE(v->>'pico_descricao', '')), ''),
    'lider_formal',      CASE WHEN jsonb_typeof(v->'lider_formal') = 'boolean' THEN v->'lider_formal' END,
    'meta_individual',   CASE WHEN jsonb_typeof(v->'meta_individual') = 'boolean' THEN v->'meta_individual' END
  ));
END;
$$;


-- ── 2. Empresa: coluna, histórico, trigger, RPC de gravação ───────────────

ALTER TABLE public.empresa_contexto_operacional
  ADD COLUMN IF NOT EXISTS organizacao JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.empresa_contexto_operacional_historico
  ADD COLUMN IF NOT EXISTS organizacao JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.empresa_contexto_operacional.organizacao IS
  'Organização do trabalho declarada pela empresa (eventos_12m, liderança, vínculos, jornada, remuneração variável, SST). Validada por organizacao_empresa_normalizar(). Contexto, não avaliação de risco.';

CREATE OR REPLACE FUNCTION public.registrar_versao_contexto_operacional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.empresa_contexto_operacional_historico (
    empresa_id, versao, setor_atuacao, cnae_principal, descricao_negocio,
    produtos_servicos, processos_principais, unidades, areas_funcoes,
    modelo_trabalho, turnos,
    sazonalidade, contexto_adicional, confirmado_por, confirmado_em, organizacao
  ) VALUES (
    NEW.empresa_id, NEW.versao, NEW.setor_atuacao, NEW.cnae_principal,
    NEW.descricao_negocio, NEW.produtos_servicos, NEW.processos_principais,
    NEW.unidades, NEW.areas_funcoes, NEW.modelo_trabalho, NEW.turnos,
    NEW.sazonalidade, NEW.contexto_adicional,
    NEW.confirmado_por, NEW.confirmado_em, NEW.organizacao
  ) ON CONFLICT (empresa_id, versao) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Assinatura antiga (11 argumentos) sai: os campos de negócio foram
-- substituídos pela Receita e pelo bloco de organização.
DROP FUNCTION IF EXISTS public.rh_salvar_contexto_operacional(
  TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.rh_salvar_contexto_operacional(
  p_setor_atuacao TEXT,
  p_cnae_principal TEXT,
  p_descricao_negocio TEXT,
  p_contexto_adicional TEXT,
  p_organizacao JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_org JSONB;
  v_resultado public.empresa_contexto_operacional%ROWTYPE;
BEGIN
  SELECT r.empresa_id INTO v_empresa
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid()
    AND r.ativo
    AND (r.principal OR 'empresa' = ANY(r.permissoes))
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para editar o perfil da empresa';
  END IF;

  v_org := public.organizacao_empresa_normalizar(p_organizacao);

  INSERT INTO public.empresa_contexto_operacional AS c (
    empresa_id, setor_atuacao, cnae_principal, descricao_negocio,
    contexto_adicional, organizacao, confirmado_por, confirmado_em
  ) VALUES (
    v_empresa,
    NULLIF(trim(p_setor_atuacao), ''),
    NULLIF(trim(p_cnae_principal), ''),
    NULLIF(trim(p_descricao_negocio), ''),
    NULLIF(trim(p_contexto_adicional), ''),
    v_org,
    auth.uid(), now()
  )
  ON CONFLICT (empresa_id) DO UPDATE SET
    setor_atuacao = EXCLUDED.setor_atuacao,
    cnae_principal = EXCLUDED.cnae_principal,
    descricao_negocio = EXCLUDED.descricao_negocio,
    contexto_adicional = EXCLUDED.contexto_adicional,
    organizacao = EXCLUDED.organizacao,
    -- campos de negócio deixam de ser coletados: zera para não arrastar
    -- versão antiga junto com a nova
    produtos_servicos = ARRAY[]::TEXT[],
    unidades = ARRAY[]::TEXT[],
    confirmado_por = auth.uid(),
    confirmado_em = now(),
    versao = c.versao + 1
  RETURNING * INTO v_resultado;

  RETURN to_jsonb(v_resultado) - 'confirmado_por';
END;
$$;

REVOKE ALL ON FUNCTION public.rh_salvar_contexto_operacional(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_salvar_contexto_operacional(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;


-- ── 3. Setor: coluna, lista administrativa, RPC de gravação ──────────────

ALTER TABLE public.empresa_setores
  ADD COLUMN IF NOT EXISTS organizacao JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.empresa_setores.organizacao IS
  'Organização do trabalho do setor (contato com público, ritmo, condições físicas, escala, pico, líder formal, meta individual). Validada por organizacao_setor_normalizar(). Contexto declaratório.';

DROP FUNCTION IF EXISTS public.rh_setores_admin();

CREATE OR REPLACE FUNCTION public.rh_setores_admin()
RETURNS TABLE (
  id                UUID,
  nome              TEXT,
  ativo             BOOLEAN,
  n                 INT,
  em_uso            BOOLEAN,
  efetivo           INT,
  modelos_trabalho  TEXT[],
  turnos            TEXT[],
  organizacao       JSONB
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM public.rh_usuarios
    WHERE user_id = auth.uid() AND ativo
  )
  SELECT
    s.id,
    s.nome,
    s.ativo,
    (SELECT COUNT(*)::int FROM public.empresa_colaboradores ec
      WHERE ec.empresa_id = s.empresa_id
        AND ec.status IN ('ativo', 'convidado')
        AND lower(TRIM(ec.setor)) = lower(TRIM(s.nome))),
    (EXISTS (SELECT 1 FROM public.empresa_afastamentos a
              WHERE a.empresa_id = s.empresa_id
                AND lower(TRIM(a.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM public.empresa_ambulatorio am
                 WHERE am.empresa_id = s.empresa_id
                   AND lower(TRIM(am.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM public.empresa_planos_acao p
                 WHERE p.empresa_id = s.empresa_id
                   AND lower(TRIM(p.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM public.psychosocial_campaigns c
                 WHERE c.empresa_id = s.empresa_id
                   AND EXISTS (SELECT 1 FROM unnest(c.setores) x
                                WHERE lower(TRIM(x)) = lower(TRIM(s.nome))))
    ),
    s.efetivo,
    s.modelos_trabalho,
    s.turnos,
    s.organizacao
  FROM public.empresa_setores s
  WHERE s.empresa_id IN (SELECT empresa_id FROM emp)
  ORDER BY s.ativo DESC, s.nome;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.rh_setores_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_setores_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_setor_atualizar_organizacao(
  p_id UUID,
  p_organizacao JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_org     JSONB;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM public.rh_usuarios
   WHERE user_id = auth.uid() AND ativo
   LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  BEGIN
    v_org := public.organizacao_setor_normalizar(p_organizacao);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
  END;

  UPDATE public.empresa_setores
     SET organizacao = v_org
   WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'organizacao', v_org);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rh_setor_atualizar_organizacao(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_setor_atualizar_organizacao(UUID, JSONB) TO authenticated;


-- ── 4. Calendário sazonal por divisão CNAE (referência geral) ─────────────
-- O pico declarado pelo setor prevalece sobre isto. Serve para o copiloto
-- nomear o confundidor quando a empresa ainda não declarou nada, e para
-- sugerir quando medir e quando implantar medida.

CREATE TABLE IF NOT EXISTS public.cnae_calendario_sazonal (
  divisao  TEXT NOT NULL CHECK (divisao ~ '^[0-9]{2}$'),
  meses    INT[] NOT NULL CHECK (cardinality(meses) BETWEEN 1 AND 12),
  rotulo   TEXT NOT NULL,
  fonte    TEXT NOT NULL DEFAULT 'Referência geral Malama (calendário comercial/fiscal brasileiro)',
  PRIMARY KEY (divisao, rotulo)
);

GRANT SELECT ON public.cnae_calendario_sazonal TO authenticated;

INSERT INTO public.cnae_calendario_sazonal (divisao, meses, rotulo) VALUES
  ('01', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 'Safra e entressafra variam por cultura — confirmar com a empresa'),
  ('10', ARRAY[10,11,12], 'Produção para festas de fim de ano'),
  ('11', ARRAY[10,11,12,1,2], 'Verão, festas e Carnaval'),
  ('41', ARRAY[1,2,3], 'Período de chuvas (obras)'),
  ('42', ARRAY[1,2,3], 'Período de chuvas (obras)'),
  ('43', ARRAY[1,2,3], 'Período de chuvas (obras)'),
  ('47', ARRAY[11,12], 'Black Friday e Natal'),
  ('47', ARRAY[5], 'Dia das Mães'),
  ('47', ARRAY[10], 'Dia das Crianças'),
  ('49', ARRAY[11,12], 'Pico logístico de fim de ano'),
  ('52', ARRAY[11,12], 'Pico logístico de fim de ano'),
  ('53', ARRAY[11,12], 'Pico de entregas de fim de ano'),
  ('55', ARRAY[12,1,2], 'Alta temporada de verão'),
  ('55', ARRAY[7], 'Férias de julho'),
  ('56', ARRAY[12,1], 'Festas de fim de ano e férias'),
  ('56', ARRAY[2], 'Carnaval'),
  ('56', ARRAY[5], 'Dia das Mães'),
  ('62', ARRAY[12], 'Fechamento de ano (entregas e virada de sistemas)'),
  ('64', ARRAY[12,1], 'Fechamento de ano e metas'),
  ('66', ARRAY[12,1], 'Fechamento de ano e renovações'),
  ('69', ARRAY[3,4], 'Imposto de Renda'),
  ('69', ARRAY[1], 'Fechamento anual e obrigações de janeiro'),
  ('78', ARRAY[12,1], 'Contratações e desligamentos de fim de ano'),
  ('85', ARRAY[1,2], 'Matrículas e início do ano letivo'),
  ('85', ARRAY[6,7,11,12], 'Fim de semestre'),
  ('86', ARRAY[5,6,7,8], 'Sazonalidade respiratória (outono/inverno)'),
  ('87', ARRAY[5,6,7,8], 'Sazonalidade respiratória (outono/inverno)')
ON CONFLICT (divisao, rotulo) DO UPDATE SET meses = EXCLUDED.meses;


-- ── 5. Contexto do copiloto: UF/município e calendário da divisão ─────────
-- CREATE OR REPLACE basta (retorno continua JSONB). Sócios e endereço
-- completo continuam de fora; UF e município não identificam ninguém e são
-- o que permite falar de clima.

CREATE OR REPLACE FUNCTION public.rh_agente_contexto()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rh public.rh_usuarios%ROWTYPE;
  v_empresa public.empresas%ROWTYPE;
  v_contexto JSONB;
  v_cadastrais JSONB;
  v_calendario JSONB;
  v_pode_colaboradores BOOLEAN;
  v_pode_saude BOOLEAN;
  v_pode_plano BOOLEAN;
  v_pode_empresa BOOLEAN;
BEGIN
  SELECT * INTO v_rh
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid() AND r.ativo
  LIMIT 1;
  IF v_rh.id IS NULL THEN RAISE EXCEPTION 'Acesso do RH não encontrado'; END IF;

  SELECT * INTO v_empresa FROM public.empresas e WHERE e.id = v_rh.empresa_id;
  v_pode_colaboradores := v_rh.principal OR 'colaboradores' = ANY(v_rh.permissoes);
  v_pode_saude := v_rh.principal OR 'saude_mental' = ANY(v_rh.permissoes)
    OR 'compliance' = ANY(v_rh.permissoes);
  v_pode_plano := v_rh.principal OR 'plano_acao' = ANY(v_rh.permissoes)
    OR 'compliance' = ANY(v_rh.permissoes);
  v_pode_empresa := v_rh.principal OR 'empresa' = ANY(v_rh.permissoes);

  SELECT to_jsonb(c) - 'confirmado_por' INTO v_contexto
  FROM public.empresa_contexto_operacional c
  WHERE c.empresa_id = v_rh.empresa_id;

  SELECT jsonb_build_object(
    'razao_social', d.razao_social,
    'nome_fantasia', d.nome_fantasia,
    'natureza_juridica', d.natureza_juridica,
    'cnae_principal_codigo', d.cnae_principal_codigo,
    'cnae_principal_descricao', d.cnae_principal_descricao,
    'porte', d.porte,
    'situacao_cadastral', d.situacao_cadastral,
    'grau_risco_estimado', cr.grau_risco,
    'uf', d.endereco->>'uf',
    'municipio', d.endereco->>'municipio',
    'sync_status', d.sync_status
  ) INTO v_cadastrais
  FROM public.empresa_dados_cnpj d
  LEFT JOIN public.cnae_grau_risco cr ON cr.codigo = d.cnae_principal_codigo
  WHERE d.empresa_id = v_rh.empresa_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('meses', cs.meses, 'rotulo', cs.rotulo)), '[]'::jsonb)
    INTO v_calendario
  FROM public.cnae_calendario_sazonal cs
  WHERE cs.divisao = left(v_cadastrais->>'cnae_principal_codigo', 2);

  RETURN jsonb_build_object(
    'empresa', jsonb_build_object(
      'nome', v_empresa.nome,
      'status', v_empresa.status,
      'modo_mental', COALESCE(v_empresa.modo_mental, false),
      'modo_metabolico', COALESCE(v_empresa.modo_metabolico, false),
      'modo_compliance', COALESCE(v_empresa.modo_compliance, false)
    ),
    'usuario', jsonb_build_object(
      'papel', v_rh.papel,
      'principal', v_rh.principal,
      'permissoes', v_rh.permissoes
    ),
    'perfil_operacional', v_contexto,
    'dados_cadastrais', v_cadastrais,
    'calendario_setorial', COALESCE(v_calendario, '[]'::jsonb),
    'indicadores', jsonb_build_object(
      'setores', (SELECT count(*) FROM public.empresa_setores s
                  WHERE s.empresa_id = v_rh.empresa_id AND s.ativo),
      'colaboradores', CASE WHEN v_pode_colaboradores THEN
        (SELECT count(*) FROM public.empresa_colaboradores ec
         WHERE ec.empresa_id = v_rh.empresa_id AND ec.status <> 'removido') ELSE NULL END,
      'campanhas_abertas', CASE WHEN v_pode_saude THEN
        (SELECT count(*) FROM public.psychosocial_campaigns pc
         WHERE pc.empresa_id = v_rh.empresa_id AND pc.status = 'aberta') ELSE NULL END,
      'campanhas_encerradas', CASE WHEN v_pode_saude THEN
        (SELECT count(*) FROM public.psychosocial_campaigns pc
         WHERE pc.empresa_id = v_rh.empresa_id AND pc.status = 'encerrada') ELSE NULL END,
      'medidas_abertas', CASE WHEN v_pode_plano THEN
        (SELECT count(*) FROM public.empresa_planos_acao pa
         WHERE pa.empresa_id = v_rh.empresa_id
           AND pa.status IN ('planejada', 'em_andamento')) ELSE NULL END,
      'medidas_atrasadas', CASE WHEN v_pode_plano THEN
        (SELECT count(*) FROM public.empresa_planos_acao pa
         WHERE pa.empresa_id = v_rh.empresa_id
           AND pa.status IN ('planejada', 'em_andamento') AND pa.prazo < CURRENT_DATE) ELSE NULL END,
      'ciclos_lideranca_ativos', CASE WHEN v_pode_plano THEN
        (SELECT count(*) FROM public.empresa_lideranca_ciclos lc
         WHERE lc.empresa_id = v_rh.empresa_id AND lc.status = 'ativo') ELSE NULL END
    ),
    'pode_editar_perfil', v_pode_empresa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_agente_contexto() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_agente_contexto() TO authenticated;
