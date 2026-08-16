-- =====================================================
-- Malama — Ajuste de assentos pelo RH
-- Migration: 20260843_rh_ajuste_assentos.sql
--
-- Permite aumentar ou reduzir os assentos contratados. Em ambos os casos,
-- a nova quantidade e o novo valor total passam a valer no primeiro dia do
-- mês seguinte. O ajuste nunca pode ficar abaixo dos assentos ocupados.
-- =====================================================

CREATE OR REPLACE FUNCTION public.rh_agendar_assentos(p_novo INTEGER)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_atual      INTEGER;
  v_em_uso     INTEGER;
  v_vigencia   DATE := (date_trunc('month', current_date) + interval '1 month')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  IF NOT public.rh_tem_permissao('financeiro') THEN
    RAISE EXCEPTION 'Sem permissão para alterar os assentos contratados';
  END IF;

  SELECT r.empresa_id
    INTO v_empresa_id
  FROM public.rh_usuarios r
  WHERE r.user_id = auth.uid()
    AND r.ativo
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não é RH ativo de nenhuma empresa';
  END IF;

  -- Serializa ajustes da mesma empresa e impede que duas solicitações
  -- concorrentes sobrescrevam o contrato sem enxergar o mesmo estado.
  SELECT e.max_assentos
    INTO v_atual
  FROM public.empresas e
  WHERE e.id = v_empresa_id
  FOR UPDATE;

  IF p_novo IS NULL OR p_novo < 1 THEN
    RAISE EXCEPTION 'A quantidade de assentos deve ser de pelo menos 1';
  END IF;

  IF p_novo = v_atual THEN
    RAISE EXCEPTION 'A nova quantidade deve ser diferente da quantidade atual';
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_em_uso
  FROM public.empresa_colaboradores ec
  WHERE ec.empresa_id = v_empresa_id
    AND ec.status IN ('ativo', 'convidado');

  IF p_novo < v_em_uso THEN
    RAISE EXCEPTION 'Há % colaboradores ocupando assento. O novo total não pode ser menor que %.',
      v_em_uso, v_em_uso;
  END IF;

  UPDATE public.empresas
  SET max_assentos_agendado = p_novo,
      max_assentos_vigencia = v_vigencia,
      updated_at = now()
  WHERE id = v_empresa_id;

  RETURN v_vigencia;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_agendar_assentos(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_agendar_assentos(INTEGER) TO authenticated;

-- Mantém o resumo do RH alinhado com a cobrança: o valor por assento é a
-- soma das modalidades contratadas, e não apenas o campo metabólico legado.
CREATE OR REPLACE FUNCTION public.rh_get_resumo_financeiro()
RETURNS TABLE (
  empresa_id            UUID,
  nome                  TEXT,
  cnpj                  TEXT,
  cobranca_email        TEXT,
  cobranca_responsavel  TEXT,
  valor_por_assento     NUMERIC,
  max_assentos          INTEGER,
  assentos_ocupados     BIGINT,
  acesso_bloqueado      BOOLEAN,
  max_assentos_agendado INTEGER,
  max_assentos_vigencia DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nome,
    e.cnpj,
    e.cobranca_email,
    e.cobranca_responsavel,
    public.empresa_valor_assento(e.id),
    e.max_assentos,
    (SELECT COUNT(*)
       FROM public.empresa_colaboradores ec
      WHERE ec.empresa_id = e.id
        AND ec.status IN ('ativo', 'convidado')),
    e.acesso_bloqueado,
    e.max_assentos_agendado,
    e.max_assentos_vigencia
  FROM public.empresas e
  WHERE public.rh_tem_permissao('financeiro')
    AND e.id IN (
      SELECT r.empresa_id
      FROM public.rh_usuarios r
      WHERE r.user_id = auth.uid()
        AND r.ativo
    );
$$;

REVOKE ALL ON FUNCTION public.rh_get_resumo_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_get_resumo_financeiro() TO authenticated;
