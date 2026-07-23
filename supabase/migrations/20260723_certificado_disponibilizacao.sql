-- =====================================================
-- Malama — Certificado de disponibilização do benefício (NR-1 / defesa)
-- Migration: 20260723_certificado_disponibilizacao.sql
--
-- RPC SECURITY DEFINER que lista os colaboradores da empresa do RH
-- logado com o NOME (de profiles.display_name, fallback = parte local do
-- e-mail) e a DATA DE ATIVAÇÃO do assento. Serve para emitir o
-- certificado de que o colaborador teve o benefício DISPONIBILIZADO.
--
-- IMPORTANTE (privacidade): NÃO retorna nenhum dado de uso, adesão,
-- resposta de instrumento, consulta ou saúde. Apenas: teve acesso e
-- desde quando. É o mínimo necessário para a defesa da empresa
-- (comprovar diligência de disponibilização), sem expor comportamento.
--
-- Aplicar via SQL Editor.
-- =====================================================

DROP FUNCTION IF EXISTS rh_certificado_colaboradores();

CREATE OR REPLACE FUNCTION rh_certificado_colaboradores()
RETURNS TABLE (
  colaborador_id UUID,
  nome           TEXT,
  setor          TEXT,
  funcao         TEXT,
  data_adicao    TIMESTAMPTZ,
  data_ativacao  TIMESTAMPTZ,
  status         TEXT
) AS $$
  WITH emp AS (
    SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT
    ec.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      split_part(u.email, '@', 1),
      'Colaborador'
    ) AS nome,
    ec.setor,
    ec.funcao,
    ec.data_adicao,
    ec.data_ativacao,
    ec.status
  FROM empresa_colaboradores ec
  LEFT JOIN public.profiles p ON p.id = ec.user_id
  LEFT JOIN auth.users u       ON u.id = ec.user_id
  WHERE ec.empresa_id = (SELECT empresa_id FROM emp)
    AND ec.status <> 'removido'
  ORDER BY nome;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION rh_certificado_colaboradores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_certificado_colaboradores() TO authenticated;
