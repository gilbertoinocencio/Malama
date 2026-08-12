-- =====================================================
-- Malama — Efetivo declarado do setor
-- Migration: 20260832_setor_efetivo.sql
--
-- Aplicar via SQL Editor.
--
-- DOIS NÚMEROS DIFERENTES, E A CONFUSÃO ENTRE ELES É O PROBLEMA
--   · assentos   — colaboradores do setor COM acesso Malama. Derivado, o
--                  sistema conta sozinho.
--   · efetivo    — quantas pessoas o setor tem na empresa, incluindo quem
--                  nunca abriu o app. Só a empresa sabe; por isso é digitado.
--
--   Sem o efetivo não existe taxa de cobertura, e todo indicador "por
--   colaborador" é calculado sobre a base errada: hoje
--   `rh_absenteismo_resumo` divide os dias de afastamento pelo número de
--   ASSENTOS, então um setor de 40 pessoas com 12 assentos aparece com
--   absenteísmo cerca de três vezes maior do que é — e a comparação entre
--   setores distorce sempre que a cobertura difere entre eles.
--
-- ESTA MIGRATION NÃO MUDA NENHUM INDICADOR.
--   Ela só grava o dado. Trocar o denominador do absenteísmo altera números
--   que o RH pode já ter levado para dentro de um PGR assinado, e o piso k
--   também é calculado sobre assentos — passar a usar efetivo exporia
--   recortes hoje suprimidos, o que é afrouxamento de privacidade. As duas
--   coisas são decisão de produto, não efeito colateral de um campo novo.
-- =====================================================

ALTER TABLE empresa_setores
  ADD COLUMN IF NOT EXISTS efetivo INT CHECK (efetivo IS NULL OR efetivo >= 0);

COMMENT ON COLUMN empresa_setores.efetivo IS
  'Total de pessoas do setor na empresa, declarado pelo RH. NULL = não informado. Não confundir com a contagem de colaboradores com assento Malama, que é derivada.';


-- =====================================================
-- rh_setores_admin() passa a devolver o efetivo
-- =====================================================

DROP FUNCTION IF EXISTS rh_setores_admin();

CREATE OR REPLACE FUNCTION rh_setores_admin()
RETURNS TABLE (
  id      UUID,
  nome    TEXT,
  ativo   BOOLEAN,
  n       INT,
  em_uso  BOOLEAN,
  efetivo INT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid()
  )
  SELECT
    s.id,
    s.nome,
    s.ativo,
    (SELECT COUNT(*)::int FROM empresa_colaboradores ec
      WHERE ec.empresa_id = s.empresa_id
        AND ec.status IN ('ativo', 'convidado')
        AND lower(TRIM(ec.setor)) = lower(TRIM(s.nome))),
    (EXISTS (SELECT 1 FROM empresa_afastamentos a
              WHERE a.empresa_id = s.empresa_id
                AND lower(TRIM(a.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM empresa_ambulatorio am
                 WHERE am.empresa_id = s.empresa_id
                   AND lower(TRIM(am.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM empresa_planos_acao p
                 WHERE p.empresa_id = s.empresa_id
                   AND lower(TRIM(p.setor)) = lower(TRIM(s.nome)))
     OR EXISTS (SELECT 1 FROM psychosocial_campaigns c
                 WHERE c.empresa_id = s.empresa_id
                   AND EXISTS (SELECT 1 FROM unnest(c.setores) x
                                WHERE lower(TRIM(x)) = lower(TRIM(s.nome))))
    ),
    s.efetivo
  FROM empresa_setores s
  WHERE s.empresa_id IN (SELECT empresa_id FROM emp)
  ORDER BY s.ativo DESC, s.nome;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_setores_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setores_admin() TO authenticated;


-- =====================================================
-- rh_setor_definir_efetivo(id, efetivo)
--
-- NULL limpa o campo — "não informado" é diferente de "zero pessoas", e a
-- diferença importa: zero significaria que o setor está vazio, o que faria
-- qualquer taxa de cobertura dividir por zero.
-- =====================================================

DROP FUNCTION IF EXISTS rh_setor_definir_efetivo(UUID, INT);

CREATE OR REPLACE FUNCTION rh_setor_definir_efetivo(p_id UUID, p_efetivo INT)
RETURNS JSONB AS $$
DECLARE
  v_empresa UUID;
  v_n       INT;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF p_efetivo IS NOT NULL AND p_efetivo < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O efetivo não pode ser negativo');
  END IF;

  IF p_efetivo IS NOT NULL AND p_efetivo > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valor de efetivo fora do razoável');
  END IF;

  -- Efetivo menor que o número de pessoas já cadastradas no setor é
  -- contradição: ou o número está errado, ou há gente classificada no setor
  -- errado. Recusar é melhor do que exibir cobertura acima de 100%.
  SELECT COUNT(*)::int INTO v_n
    FROM empresa_colaboradores ec
   WHERE ec.empresa_id = v_empresa
     AND ec.status IN ('ativo', 'convidado')
     AND lower(TRIM(ec.setor)) = (
       SELECT lower(TRIM(s.nome)) FROM empresa_setores s
        WHERE s.id = p_id AND s.empresa_id = v_empresa
     );

  IF p_efetivo IS NOT NULL AND p_efetivo < v_n THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('O setor já tem %s colaborador(es) com acesso. O efetivo não pode ser menor que isso.', v_n)
    );
  END IF;

  UPDATE empresa_setores
     SET efetivo = p_efetivo
   WHERE id = p_id AND empresa_id = v_empresa;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Setor não encontrado');
  END IF;

  RETURN jsonb_build_object('ok', true, 'efetivo', p_efetivo);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_setor_definir_efetivo(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_setor_definir_efetivo(UUID, INT) TO authenticated;
