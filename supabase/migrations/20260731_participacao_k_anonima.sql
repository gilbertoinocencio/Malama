-- =====================================================
-- Malama — Piso de anonimato na adesão por setor
-- Migration: 20260731_participacao_k_anonima.sql
--
-- Aplicar via SQL Editor, depois de 20260728_psychosocial_campaign_engine.
--
-- PROBLEMA
--   `rh_campanha_participacao` devolvia respondentes/convidados por setor sem
--   piso nenhum. O raciocínio original era que adesão é participação, não
--   resultado — e participação não é dado de saúde. Isso vale enquanto o
--   setor é grande: num setor de UMA pessoa, "1/1" diz ao RH exatamente que
--   aquela pessoa respondeu, e "0/1" diz que não respondeu.
--
--   Em empresa pequena ou setor enxuto (manutenção com 2, portaria com 3) o
--   painel de adesão vira identificação individual. Ainda não é o conteúdo da
--   resposta — o escore continua inalcançável —, mas é mais do que o módulo
--   promete entregar ao empregador.
--
-- SOLUÇÃO
--   Mesmo piso já usado no relatório (k = 5). Setor abaixo do piso não sai
--   detalhado: cai num balde "Demais setores". Se o próprio balde ficar
--   abaixo do piso, ele também não sai — vira só um contador de quantas
--   pessoas ficaram fora do detalhamento, para o RH saber que o total não
--   fecha com a soma das linhas em vez de achar que sumiu gente.
--
--   O corte é feito AQUI, no banco, e não na tela: número que não pode ser
--   visto não pode sair do servidor, senão ele continua viajando para o
--   navegador e aparece em qualquer inspeção de rede.
--
-- O QUE ESTE PISO NÃO RESOLVE
--   Saturação. Um setor com 5 pessoas mostrando "5/5" diz que as cinco
--   responderam, e "0/5" diz que nenhuma respondeu — em qualquer tamanho de
--   coorte, os extremos identificam. Corrigir isso exigiria esconder ou
--   arredondar taxa, o que destruiria justamente o KPI que o RH usa para
--   agir. Fica registrado como limite conhecido e aceito.
--
--   O total da empresa continua sem piso, de propósito: é o agregado que o
--   RH contrata para acompanhar, e o roster inteiro já é conhecido dele.
-- =====================================================

CREATE OR REPLACE FUNCTION rh_campanha_participacao(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id  UUID;
  v_camp        RECORD;
  v_min         CONSTANT INT := 5;   -- mesmo k do relatório psicossocial
  v_setores     JSONB;
  v_conv        INT;
  v_resp        INT;
  v_balde_conv  INT;
  v_balde_resp  INT;
  v_balde_n     INT;
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
  ),
  grandes AS (
    SELECT * FROM por_setor WHERE convidados >= v_min
  ),
  pequenos AS (
    SELECT * FROM por_setor WHERE convidados < v_min
  )
  SELECT
    (SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'setor',        g.setor,
          'convidados',   g.convidados,
          'respondentes', g.respondentes,
          'taxa',         CASE WHEN g.convidados > 0
                               THEN ROUND(g.respondentes * 100.0 / g.convidados)::int
                               ELSE 0 END,
          'agrupado',     false
        ) ORDER BY g.setor
      ), '[]'::jsonb) FROM grandes g),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM pequenos),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM pequenos),
    (SELECT COUNT(*)::int                        FROM pequenos),
    (SELECT COALESCE(SUM(convidados), 0)::int   FROM por_setor),
    (SELECT COALESCE(SUM(respondentes), 0)::int FROM por_setor)
  INTO v_setores, v_balde_conv, v_balde_resp, v_balde_n, v_conv, v_resp;

  -- Os setores pequenos juntos já formam uma coorte de tamanho suficiente:
  -- viram uma linha só. Deixa de ser "quem", passa a ser "quantos".
  IF v_balde_conv >= v_min THEN
    v_setores := v_setores || jsonb_build_array(jsonb_build_object(
      'setor',        'Demais setores',
      'convidados',   v_balde_conv,
      'respondentes', v_balde_resp,
      'taxa',         ROUND(v_balde_resp * 100.0 / v_balde_conv)::int,
      'agrupado',     true
    ));
    v_balde_n    := 0;   -- nada ficou de fora
    v_balde_conv := 0;
  END IF;

  RETURN jsonb_build_object(
    'campaign_id',        p_campaign_id,
    'convidados',         v_conv,
    'respondentes',       v_resp,
    'taxa',               CASE WHEN v_conv > 0
                               THEN ROUND(v_resp * 100.0 / v_conv)::int
                               ELSE 0 END,
    'setores',            v_setores,
    'min_coorte',         v_min,
    -- Quantos setores e quantas pessoas ficaram fora do detalhamento por
    -- serem coorte pequena demais. A UI usa isso para explicar a diferença
    -- entre o total e a soma das linhas.
    'ocultos_setores',    v_balde_n,
    'ocultos_convidados', v_balde_conv
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_campanha_participacao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_campanha_participacao(UUID) TO authenticated;
