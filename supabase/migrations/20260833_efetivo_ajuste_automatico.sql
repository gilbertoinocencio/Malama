-- =====================================================
-- Malama — Efetivo do setor acompanha o cadastro automaticamente
-- Migration: 20260833_efetivo_ajuste_automatico.sql
--
-- Aplicar via SQL Editor, depois de 20260832.
--
-- REGRA: O EFETIVO SÓ SOBE.
--   Quando o número de colaboradores com acesso num setor ultrapassa o
--   efetivo declarado, o efetivo é elevado para acompanhar — o declarado
--   virou mentira e a correção é óbvia. Remover alguém do painel NÃO reduz o
--   efetivo: cadastrar no Malama não é contratar, e tirar do painel não é
--   demitir. A pessoa continua trabalhando no setor, apenas sem acesso ao
--   app, e baixar o efetivo aí apagaria um funcionário da conta da empresa,
--   inflando artificialmente qualquer taxa de cobertura ou indicador per
--   capita futuro.
--
--   Quem realmente saiu da empresa é corrigido pelo RH no campo, que
--   continua editável para baixo (respeitado o piso do número de cadastrados,
--   validado em rh_setor_definir_efetivo).
--
-- POR QUE TRIGGER, E NÃO REGRA NO SERVIÇO
--   O setor de um colaborador muda por três caminhos: convite (edge function
--   invite-colaborador), reclassificação na lista (rh_definir_setor_
--   colaborador) e remoção. Espalhar a regra pelos três garante que um deles
--   fique para trás. No trigger, ela vale para qualquer escrita, inclusive
--   correção manual feita no SQL Editor.
-- =====================================================

CREATE OR REPLACE FUNCTION sincroniza_efetivo_setor()
RETURNS TRIGGER AS $$
DECLARE
  -- Só NEW: o gatilho é INSERT/UPDATE, e referenciar OLD num INSERT quebra
  -- em PL/pgSQL ("record old is not assigned yet").
  v_empresa UUID := NEW.empresa_id;
  v_chave   TEXT := lower(TRIM(NEW.setor));
  v_n       INT;
BEGIN
  -- Só interessa quem ocupa assento e tem setor. Remoção e saída de setor
  -- não disparam nada: o efetivo não desce.
  IF v_chave IS NULL OR v_chave = '' OR NEW.status NOT IN ('ativo', 'convidado') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int INTO v_n
    FROM empresa_colaboradores ec
   WHERE ec.empresa_id = v_empresa
     AND ec.status IN ('ativo', 'convidado')
     AND lower(TRIM(ec.setor)) = v_chave;

  UPDATE empresa_setores s
     SET efetivo = v_n
   WHERE s.empresa_id = v_empresa
     AND lower(TRIM(s.nome)) = v_chave
     AND s.efetivo IS NOT NULL
     AND s.efetivo < v_n;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- AFTER: a contagem precisa enxergar a linha já gravada.
DROP TRIGGER IF EXISTS trg_sincroniza_efetivo_setor ON empresa_colaboradores;
CREATE TRIGGER trg_sincroniza_efetivo_setor
  AFTER INSERT OR UPDATE OF setor, status ON empresa_colaboradores
  FOR EACH ROW EXECUTE FUNCTION sincroniza_efetivo_setor();


-- =====================================================
-- Correção da base atual
--
-- Setor cujo efetivo já esteja abaixo do número de cadastrados sobe agora,
-- para o painel não nascer exibindo "14 de 12".
-- =====================================================

UPDATE empresa_setores s
   SET efetivo = c.n
  FROM (
    SELECT ec.empresa_id, lower(TRIM(ec.setor)) AS chave, COUNT(*)::int AS n
      FROM empresa_colaboradores ec
     WHERE ec.status IN ('ativo', 'convidado')
       AND NULLIF(TRIM(ec.setor), '') IS NOT NULL
     GROUP BY ec.empresa_id, lower(TRIM(ec.setor))
  ) c
 WHERE c.empresa_id = s.empresa_id
   AND c.chave = lower(TRIM(s.nome))
   AND s.efetivo IS NOT NULL
   AND s.efetivo < c.n;
