-- =====================================================
-- Malama — Plano de ação devolve o vínculo com a liderança
--
-- `empresa_planos_acao.lideranca_ciclo_id` existe desde a 20260837 e é
-- preenchido por `rh_adicionar_lideranca_acao`, mas `rh_listar_planos_acao`
-- nunca o devolveu. O tipo do cliente já declarava o campo — ele só chegava
-- sempre indefinido.
--
-- Efeito na tela: um combinado nascido na conversa com a liderança ficava
-- idêntico a um item digitado à mão no plano, e as duas abas passavam a
-- impressão de fazer a mesma coisa em duplicidade. Na empresa de teste, 5
-- dos 6 itens do plano vieram de ciclos de liderança e nenhum mostrava isso.
--
-- O vínculo é a FK, e não `origem`: a RPC da liderança grava origem =
-- 'manual', então aquele campo não distingue os dois caminhos.
-- =====================================================

DROP FUNCTION IF EXISTS public.rh_listar_planos_acao();

CREATE FUNCTION public.rh_listar_planos_acao()
RETURNS TABLE (
  id                 UUID,
  setor              TEXT,
  origem             TEXT,
  fator              TEXT,
  risco_descricao    TEXT,
  medida             TEXT,
  nivel_controle     TEXT,
  responsavel        TEXT,
  prazo              DATE,
  status             TEXT,
  evidencia          TEXT,
  concluida_em       DATE,
  atrasada           BOOLEAN,
  created_at         TIMESTAMPTZ,
  lideranca_ciclo_id UUID,
  -- Setor do ciclo de origem, para a tela nomear a conversa sem precisar
  -- carregar a lista de ciclos só para resolver um rótulo.
  lideranca_setor    TEXT
) AS $$
  SELECT
    p.id, p.setor, p.origem, p.fator, p.risco_descricao, p.medida,
    p.nivel_controle, p.responsavel, p.prazo, p.status, p.evidencia,
    p.concluida_em,
    (p.status IN ('planejada', 'em_andamento') AND p.prazo < CURRENT_DATE),
    p.created_at,
    p.lideranca_ciclo_id,
    c.setor
  FROM empresa_planos_acao p
  LEFT JOIN empresa_lideranca_ciclos c ON c.id = p.lideranca_ciclo_id
  WHERE p.empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  ORDER BY
    CASE p.status WHEN 'em_andamento' THEN 0 WHEN 'planejada' THEN 1
                  WHEN 'concluida' THEN 2 ELSE 3 END,
    p.prazo;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.rh_listar_planos_acao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_listar_planos_acao() TO authenticated;
