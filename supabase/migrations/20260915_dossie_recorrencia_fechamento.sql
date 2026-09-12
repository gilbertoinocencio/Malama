-- =====================================================
-- Malama — Dossiê da medida e leitura registrada do ciclo
--
-- Duas coisas que hoje o RH só consegue juntando quatro telas:
--
--   1. DOSSIÊ DA MEDIDA (rh_dossie_medida): hipótese que originou, medida,
--      combinados de liderança, execução e resultado observado — em UMA via,
--      para virar documento numerado (tipo 'medida', prefixo MAL-MED).
--   2. LEITURA REGISTRADA (psychosocial_campaigns.leitura_registrada_em +
--      rh_marcar_ciclo_lido): a jornada precisa saber se a empresa já fechou
--      o ciclo. localStorage não serve — vale por navegador. A coluna é o
--      que faz o passo "Feche o ciclo" sumir em qualquer máquina.
--
-- O RECAP do fechamento (o que mudou contra o ciclo anterior, o que foi
-- feito no meio, comparabilidade sazonal) NÃO vive no banco: é calculado
-- na Edge Function rh-agent a partir das mesmas leituras agregadas do
-- briefing, para tela, PDF e copiloto dizerem exatamente a mesma coisa.
--
-- Depende de 20260914 (colunas contexto_setor/ressalvas/convergencias em
-- psicossocial_hipoteses). Aplicar aquela antes desta.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. Leitura registrada do ciclo
-- ─────────────────────────────────────────────────────

ALTER TABLE public.psychosocial_campaigns
  ADD COLUMN IF NOT EXISTS leitura_registrada_em TIMESTAMPTZ;

-- rh_listar_campanhas devolve a coluna nova. Mudança de retorno exige DROP.
-- A __base fica intacta: o wrapper faz o JOIN por cima.
DROP FUNCTION IF EXISTS public.rh_listar_campanhas();
CREATE FUNCTION public.rh_listar_campanhas()
RETURNS TABLE (
  id UUID, instrument TEXT, instrument_nome TEXT, eixo TEXT,
  janela_inicio DATE, janela_fim DATE, setores TEXT[], status TEXT,
  encerrada_em TIMESTAMPTZ, created_at TIMESTAMPTZ,
  n_convidados INT, n_respondentes INT,
  leitura_registrada_em TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN QUERY
    SELECT b.id, b.instrument, b.instrument_nome, b.eixo,
           b.janela_inicio, b.janela_fim, b.setores, b.status,
           b.encerrada_em, b.created_at, b.n_convidados, b.n_respondentes,
           c.leitura_registrada_em
      FROM public.rh_listar_campanhas__base() b
      JOIN public.psychosocial_campaigns c ON c.id = b.id;
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_listar_campanhas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_listar_campanhas() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_marcar_ciclo_lido(p_campanha_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa UUID;
  v_quando  TIMESTAMPTZ;
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  SELECT empresa_id INTO v_empresa
    FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem empresa vinculada.');
  END IF;

  -- Idempotente: a primeira leitura é a que vale. Fechar de novo não muda a data.
  UPDATE public.psychosocial_campaigns
     SET leitura_registrada_em = COALESCE(leitura_registrada_em, now())
   WHERE id = p_campanha_id AND empresa_id = v_empresa AND status = 'encerrada'
   RETURNING leitura_registrada_em INTO v_quando;

  IF v_quando IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campanha não encontrada ou ainda aberta.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'leitura_registrada_em', v_quando);
END;
$$;
REVOKE ALL ON FUNCTION public.rh_marcar_ciclo_lido(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_marcar_ciclo_lido(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────
-- 2. Documentos numerados: dois tipos novos
-- ─────────────────────────────────────────────────────

ALTER TABLE public.empresa_relatorios_emitidos
  DROP CONSTRAINT IF EXISTS empresa_relatorios_emitidos_tipo_check;
ALTER TABLE public.empresa_relatorios_emitidos
  ADD CONSTRAINT empresa_relatorios_emitidos_tipo_check
  CHECK (tipo IN ('jss', 'who5', 'medida', 'ciclo'));

CREATE OR REPLACE FUNCTION public.rh_registrar_relatorio(
  p_tipo           TEXT,
  p_periodo_inicio DATE,
  p_periodo_fim    DATE,
  p_payload        JSONB,
  p_hash           TEXT
) RETURNS JSONB AS $$
DECLARE
  v_empresa  UUID;
  v_seq      INT;
  v_numero   TEXT;
  v_nome     TEXT;
  v_email    TEXT;
  v_id       UUID;
  v_prefixo  TEXT;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem empresa vinculada.');
  END IF;

  IF p_tipo NOT IN ('jss', 'who5', 'medida', 'ciclo') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tipo de relatório inválido.');
  END IF;

  SELECT nome, email INTO v_nome, v_email
  FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  v_prefixo := CASE p_tipo
    WHEN 'jss'    THEN 'MAL-JSS'
    WHEN 'who5'   THEN 'MAL-WHO5'
    WHEN 'medida' THEN 'MAL-MED'
    ELSE 'MAL-CIC'
  END;

  PERFORM pg_advisory_xact_lock(hashtext(v_empresa::text || p_tipo));

  SELECT COALESCE(MAX(
           NULLIF(regexp_replace(numero_doc, '^.*-', ''), '')::INT
         ), 0) + 1
    INTO v_seq
    FROM empresa_relatorios_emitidos
   WHERE empresa_id = v_empresa
     AND tipo = p_tipo
     AND EXTRACT(YEAR FROM emitido_em) = EXTRACT(YEAR FROM now());

  v_numero := v_prefixo || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::TEXT, 4, '0');

  INSERT INTO empresa_relatorios_emitidos
    (empresa_id, tipo, numero_doc, periodo_inicio, periodo_fim, payload,
     hash_verificacao, emitido_por, emitido_por_nome, emitido_por_email)
  VALUES
    (v_empresa, p_tipo, v_numero, p_periodo_inicio, p_periodo_fim, p_payload,
     p_hash, auth.uid(), v_nome, v_email)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id, 'numero_doc', v_numero,
    'emitido_por_nome', v_nome, 'emitido_por_email', v_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─────────────────────────────────────────────────────
-- 3. Dossiê da medida
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rh_dossie_medida(p_plano_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa UUID;
  v_medida  JSONB;
  v_hip     JSONB;
  v_base    JSONB;
  v_res     JSONB;
  v_lid     JSONB;
  v_comb    JSONB;
  v_hist    JSONB;
  v_emp     JSONB;
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  SELECT empresa_id INTO v_empresa
    FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
      'id', p.id, 'setor', p.setor, 'origem', p.origem, 'fator', p.fator,
      'risco_descricao', p.risco_descricao, 'medida', p.medida,
      'nivel_controle', p.nivel_controle, 'responsavel', p.responsavel,
      'prazo', p.prazo, 'status', p.status, 'evidencia', p.evidencia,
      'concluida_em', p.concluida_em, 'created_at', p.created_at,
      'atrasada', (p.status IN ('planejada', 'em_andamento') AND p.prazo < CURRENT_DATE),
      'hipotese_id', p.hipotese_id, 'campanha_baseline_id', p.campanha_baseline_id,
      'lideranca_ciclo_id', p.lideranca_ciclo_id)
    INTO v_medida
    FROM public.empresa_planos_acao p
   WHERE p.id = p_plano_id AND p.empresa_id = v_empresa;
  IF v_medida IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object('nome', e.nome, 'cnpj', e.cnpj)
    INTO v_emp FROM public.empresas e WHERE e.id = v_empresa;

  -- Leitura que originou: hipótese + campanha de origem.
  SELECT jsonb_build_object(
      'id', h.id, 'setor', h.setor, 'instrumento', h.instrumento,
      'indicador', h.indicador, 'fator', h.fator, 'descricao', h.descricao,
      'por_que_foi_sugerida', h.por_que_foi_sugerida,
      'evidencias', h.evidencias,
      'perguntas_validacao', to_jsonb(h.perguntas_validacao),
      'caminhos_possiveis', h.caminhos_possiveis,
      'forca_evidencia', h.forca_evidencia,
      'contexto_setor', h.contexto_setor,
      'ressalvas', to_jsonb(COALESCE(h.ressalvas, ARRAY[]::TEXT[])),
      'convergencias', to_jsonb(COALESCE(h.convergencias, ARRAY[]::TEXT[])),
      'campanha', jsonb_build_object(
        'id', c.id, 'instrumento', c.instrument, 'instrumento_nome', i.nome,
        'janela_inicio', c.janela_inicio, 'janela_fim', c.janela_fim))
    INTO v_hip
    FROM public.psicossocial_hipoteses h
    JOIN public.psychosocial_campaigns c ON c.id = h.campanha_baseline_id
    JOIN public.psychosocial_instruments i ON i.code = c.instrument
   WHERE h.id = (v_medida->>'hipotese_id')::UUID AND h.empresa_id = v_empresa;

  SELECT jsonb_build_object(
      'id', c.id, 'instrumento', c.instrument, 'instrumento_nome', i.nome,
      'janela_inicio', c.janela_inicio, 'janela_fim', c.janela_fim)
    INTO v_base
    FROM public.psychosocial_campaigns c
    JOIN public.psychosocial_instruments i ON i.code = c.instrument
   WHERE c.id = (v_medida->>'campanha_baseline_id')::UUID AND c.empresa_id = v_empresa;

  -- Resultado observado: um por indicador × ciclo de follow-up. Valores NULL
  -- são recorte abaixo do piso — o documento diz isso, não reconstrói.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'indicador', r.indicador, 'instrumento', r.instrumento,
      'valor_baseline', r.valor_baseline, 'valor_followup', r.valor_followup,
      'delta', r.delta, 'favoravel_quando', r.favoravel_quando,
      'n_baseline', r.n_baseline, 'n_followup', r.n_followup,
      'intervalo_dias', r.intervalo_dias, 'execucao', r.execucao,
      'classificacao', r.classificacao, 'comparabilidade', r.comparabilidade,
      'narrativa', r.narrativa, 'calculado_em', r.calculado_em,
      'followup', jsonb_build_object(
        'id', f.id, 'janela_inicio', f.janela_inicio, 'janela_fim', f.janela_fim))
      ORDER BY r.calculado_em DESC), '[]'::jsonb)
    INTO v_res
    FROM public.psicossocial_resultados_observados r
    JOIN public.psychosocial_campaigns f ON f.id = r.campanha_followup_id
   WHERE r.plano_acao_id = p_plano_id AND r.empresa_id = v_empresa;

  -- Ciclo de liderança de origem e os combinados irmãos (mesmo ciclo).
  SELECT jsonb_build_object(
      'id', l.id, 'setor', l.setor, 'inicio', l.inicio, 'fim', l.fim,
      'responsavel_rh', l.responsavel_rh, 'etapa', l.etapa, 'status', l.status,
      'pontos_fortes', to_jsonb(l.pontos_fortes), 'pontos_atencao', to_jsonb(l.pontos_atencao),
      'nota_evolucao', l.nota_evolucao)
    INTO v_lid
    FROM public.empresa_lideranca_ciclos l
   WHERE l.id = (v_medida->>'lideranca_ciclo_id')::UUID AND l.empresa_id = v_empresa;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id, 'medida', p.medida, 'responsavel', p.responsavel, 'prazo', p.prazo,
      'status', p.status, 'evidencia', p.evidencia, 'concluida_em', p.concluida_em)
      ORDER BY p.prazo), '[]'::jsonb)
    INTO v_comb
    FROM public.empresa_planos_acao p
   WHERE p.lideranca_ciclo_id = (v_medida->>'lideranca_ciclo_id')::UUID
     AND p.empresa_id = v_empresa AND p.id <> p_plano_id;

  -- Trilha de auditoria da medida, quando existir (só as entradas que citam
  -- este plano em detalhes). Vazio não é erro: nem toda ação é auditada.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'acao', a.acao, 'quando', a.criado_em, 'detalhes', a.detalhes)
      ORDER BY a.criado_em), '[]'::jsonb)
    INTO v_hist
    FROM public.rh_auditoria a
   WHERE a.empresa_id = v_empresa
     AND (a.detalhes->>'plano_id' = p_plano_id::text OR a.detalhes->>'plano_acao_id' = p_plano_id::text);

  RETURN jsonb_build_object(
    'empresa', v_emp,
    'medida', v_medida,
    'hipotese', v_hip,
    'baseline', v_base,
    'resultados', v_res,
    'lideranca', v_lid,
    'combinados', v_comb,
    'historico', v_hist,
    'gerado_em', now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rh_dossie_medida(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_dossie_medida(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────
-- Conferência (o SQL Editor mostra só a última instrução)
-- ─────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'psychosocial_campaigns' AND column_name = 'leitura_registrada_em') AS coluna_leitura,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('rh_dossie_medida', 'rh_marcar_ciclo_lido')) AS funcoes_novas,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'empresa_relatorios_emitidos_tipo_check') AS check_tipo,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rh_listar_campanhas'
      AND pg_get_function_result(p.oid) LIKE '%leitura_registrada_em%') AS listar_campanhas_ok;
