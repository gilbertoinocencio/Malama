-- =====================================================
-- Malama — Relatório de evidência por módulo contratado
--
-- O documento descrevia SEMPRE o mesmo programa, com o mesmo texto fixo:
-- acompanhamento nutricional, telemedicina e monitoramento metabólico
-- (incluindo GLP-1). Numa empresa que contratou só o módulo psicossocial,
-- isso é uma declaração formal de serviços que ela não tem — exatamente o
-- tipo de afirmação que a outra parte usa para derrubar a credibilidade do
-- documento inteiro. É a mesma razão por que a emissão de certificado já
-- era bloqueada quando o contrato não tinha serviços registrados.
--
-- Os módulos já existem em `empresas.modo_mental` / `modo_metabolico`. O
-- que faltava era a RPC devolvê-los e separar as consultas por tipo de
-- profissional: um número único de "consultas realizadas" numa empresa que
-- tem os dois módulos é lido como se fosse tudo psicólogo.
-- =====================================================

-- Mudança de retorno exige DROP: o Postgres recusa CREATE OR REPLACE quando
-- a assinatura de saída muda.
DROP FUNCTION IF EXISTS public.rh_compliance_metricas();

CREATE FUNCTION public.rh_compliance_metricas()
RETURNS TABLE (
  empresa_id              UUID,
  nome                    TEXT,
  cnpj                    TEXT,
  data_inicio             DATE,
  colaboradores_elegiveis INT,
  colaboradores_ativos    INT,
  consultas_realizadas    INT,
  -- Módulos contratados. O documento só pode afirmar o que está aqui.
  modo_mental             BOOLEAN,
  modo_metabolico         BOOLEAN,
  -- Separadas por `doctors.tipo_profissional`. Somadas continuam batendo
  -- com `consultas_realizadas`, que fica para não quebrar o histórico.
  consultas_psicologo     INT,
  consultas_medico        INT
) AS $$
  WITH minha_empresa AS (
    SELECT e.id, e.nome, e.cnpj, e.data_inicio,
           COALESCE(e.modo_mental, false)     AS modo_mental,
           COALESCE(e.modo_metabolico, false) AS modo_metabolico
      FROM empresas e
     WHERE e.id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
     LIMIT 1
  ),
  colaboradores AS (
    SELECT ec.user_id, ec.id, ec.status, ec.empresa_id
      FROM empresa_colaboradores ec
     WHERE ec.empresa_id = (SELECT id FROM minha_empresa)
       AND ec.status <> 'removido'
  ),
  atendimentos AS (
    SELECT COALESCE(d.tipo_profissional, 'medico') AS tipo
      FROM consultations c
      LEFT JOIN doctors d ON d.id = c.doctor_id
     WHERE c.status = 'completed'
       AND c.patient_id IN (SELECT user_id FROM colaboradores WHERE user_id IS NOT NULL)
  )
  SELECT
    me.id,
    me.nome,
    me.cnpj,
    me.data_inicio,
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, id::text))::INT FROM colaboradores),
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, id::text))::INT
       FROM colaboradores WHERE status = 'ativo'),
    (SELECT COUNT(*)::INT FROM atendimentos),
    me.modo_mental,
    me.modo_metabolico,
    (SELECT COUNT(*)::INT FROM atendimentos WHERE tipo = 'psicologo'),
    (SELECT COUNT(*)::INT FROM atendimentos WHERE tipo <> 'psicologo')
  FROM minha_empresa me;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.rh_compliance_metricas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_compliance_metricas() TO authenticated;

-- ── Snapshot do documento emitido ──────────────────────
-- A reemissão é feita a partir do REGISTRO, nunca dos números de hoje. Sem
-- gravar os módulos e a separação das consultas, reemitir um documento
-- antigo o descreveria com os módulos que a empresa tem AGORA — e um
-- documento de evidência que muda de conteúdo ao ser reimpresso não serve
-- de prova.
ALTER TABLE public.empresa_compliance_docs
  ADD COLUMN IF NOT EXISTS modo_mental         BOOLEAN,
  ADD COLUMN IF NOT EXISTS modo_metabolico     BOOLEAN,
  ADD COLUMN IF NOT EXISTS consultas_psicologo INT,
  ADD COLUMN IF NOT EXISTS consultas_medico    INT;

COMMENT ON COLUMN public.empresa_compliance_docs.modo_mental IS
  'Módulos vigentes NA EMISSÃO. NULL = documento anterior a 20260845, cujo texto descrevia o programa completo.';
