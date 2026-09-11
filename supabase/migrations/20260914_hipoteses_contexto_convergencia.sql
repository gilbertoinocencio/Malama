-- =====================================================
-- Malama — Hipóteses guardam contexto, ressalvas e convergências
-- Migration: 20260914_hipoteses_contexto_convergencia.sql
--
-- Aplicar via SQL Editor.
--
-- O motor de hipóteses (psicossocial-hipoteses.ts) passou a enriquecer cada
-- hipótese com três coisas que só o copiloto via: a organização declarada
-- do setor em uma linha (`contexto_setor`), os confundidores a nomear antes
-- de interpretar (`ressalvas`: pico sazonal, evento da empresa, calor) e os
-- outros dados da empresa na mesma direção (`convergencias`: afastamentos
-- por capítulo F, ambulatório por ansiedade/estresse).
--
-- Persistir é o que permite mostrar isso onde o RH DECIDE: no briefing do
-- Início e no plano de ação, na medida que nasceu daquela hipótese — e
-- deixa registrado por que a medida foi criada, o que vale como
-- rastreabilidade. Nada disso é evidência de risco nem muda a força da
-- hipótese; é contexto declarado e cruzamento agregado.
-- =====================================================

ALTER TABLE public.psicossocial_hipoteses
  ADD COLUMN IF NOT EXISTS contexto_setor TEXT,
  ADD COLUMN IF NOT EXISTS ressalvas      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS convergencias  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.psicossocial_hipoteses.ressalvas IS
  'Confundidores nomeados pelo motor (sazonalidade, evento da empresa, agente físico). Não são evidência.';
COMMENT ON COLUMN public.psicossocial_hipoteses.convergencias IS
  'Outros dados agregados da empresa na mesma direção (absenteísmo cap. F, ambulatório ansiedade/estresse). Convergência, não causa.';


-- ── rh_registrar_hipoteses: mesma função, três colunas a mais ──────────────

DROP FUNCTION IF EXISTS public.rh_registrar_hipoteses(JSONB);

CREATE OR REPLACE FUNCTION public.rh_registrar_hipoteses(p_hipoteses JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_item    JSONB;
  v_setor   TEXT;
  v_id      UUID;
  v_ids     JSONB := '[]'::jsonb;
  v_n       INT := 0;
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');

  SELECT empresa_id INTO v_empresa
  FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF jsonb_typeof(p_hipoteses) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Formato inválido');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_hipoteses) LOOP
    -- Teto por chamada: o briefing gera poucas hipóteses por ciclo, e um
    -- payload grande aqui só poderia vir de defeito ou abuso.
    EXIT WHEN v_n >= 40;

    -- A campanha precisa ser desta empresa. Sem isso, um payload forjado
    -- gravaria memória de ciclo cruzando tenants.
    IF NOT EXISTS (
      SELECT 1 FROM public.psychosocial_campaigns c
      WHERE c.id = (v_item ->> 'campanha_baseline_id')::UUID
        AND c.empresa_id = v_empresa
    ) THEN
      CONTINUE;
    END IF;

    v_setor := NULLIF(TRIM(v_item ->> 'setor'), '');

    INSERT INTO public.psicossocial_hipoteses (
      empresa_id, setor, campanha_baseline_id, instrumento, indicador, fator,
      descricao, por_que_foi_sugerida, evidencias, perguntas_validacao,
      caminhos_possiveis, forca_evidencia, origem, logica_versao,
      metricas_baseline, contexto_desidentificado,
      contexto_setor, ressalvas, convergencias
    ) VALUES (
      v_empresa,
      v_setor,
      (v_item ->> 'campanha_baseline_id')::UUID,
      v_item ->> 'instrumento',
      LEFT(v_item ->> 'indicador', 60),
      v_item ->> 'fator',
      LEFT(v_item ->> 'descricao', 1000),
      LEFT(v_item ->> 'por_que_foi_sugerida', 1000),
      COALESCE(v_item -> 'evidencias', '[]'::jsonb),
      COALESCE(ARRAY(SELECT LEFT(x, 300) FROM jsonb_array_elements_text(
        COALESCE(v_item -> 'perguntas_validacao', '[]'::jsonb)) AS x), ARRAY[]::TEXT[]),
      COALESCE(v_item -> 'caminhos_possiveis', '[]'::jsonb),
      v_item ->> 'forca_evidencia',
      v_item ->> 'origem',
      LEFT(v_item ->> 'logica_versao', 40),
      COALESCE(v_item -> 'metricas_baseline', '{}'::jsonb),
      public.psicossocial_contexto_desidentificado(v_empresa, v_setor),
      LEFT(v_item ->> 'contexto_setor', 600),
      COALESCE(ARRAY(SELECT LEFT(x, 600) FROM jsonb_array_elements_text(
        COALESCE(v_item -> 'ressalvas', '[]'::jsonb)) AS x), ARRAY[]::TEXT[]),
      COALESCE(ARRAY(SELECT LEFT(x, 600) FROM jsonb_array_elements_text(
        COALESCE(v_item -> 'convergencias', '[]'::jsonb)) AS x), ARRAY[]::TEXT[])
    )
    ON CONFLICT (empresa_id, campanha_baseline_id, (COALESCE(setor, '')), indicador)
    DO UPDATE SET
      descricao            = EXCLUDED.descricao,
      por_que_foi_sugerida = EXCLUDED.por_que_foi_sugerida,
      evidencias           = EXCLUDED.evidencias,
      perguntas_validacao  = EXCLUDED.perguntas_validacao,
      caminhos_possiveis   = EXCLUDED.caminhos_possiveis,
      forca_evidencia      = EXCLUDED.forca_evidencia,
      origem               = EXCLUDED.origem,
      logica_versao        = EXCLUDED.logica_versao,
      metricas_baseline    = EXCLUDED.metricas_baseline,
      contexto_setor       = EXCLUDED.contexto_setor,
      ressalvas            = EXCLUDED.ressalvas,
      convergencias        = EXCLUDED.convergencias
    RETURNING id INTO v_id;

    v_ids := v_ids || jsonb_build_object(
      'indicador', v_item ->> 'indicador',
      'setor', v_setor,
      'campanha_baseline_id', v_item ->> 'campanha_baseline_id',
      'id', v_id);
    v_n := v_n + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'hipoteses', v_ids);
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR not_null_violation THEN
    -- Payload fora do vocabulário não derruba o briefing: a memória do
    -- ciclo é acessória, a leitura agregada é o que o RH precisa ver.
    RETURN jsonb_build_object('ok', false, 'error', 'Hipótese fora do vocabulário aceito');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_registrar_hipoteses(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_registrar_hipoteses(JSONB) TO authenticated;
