-- =====================================================
-- Malama — Reclassificar o setor de um colaborador
-- Migration: 20260831_definir_setor_colaborador.sql
--
-- Aplicar via SQL Editor.
--
-- O BURACO QUE ISTO FECHA
--   O setor era gravado no convite e congelava: o único UPDATE que o portal
--   fazia em empresa_colaboradores era o de remoção. Quem entrou sem setor,
--   ou no setor errado, ficava assim para sempre — e todo o registro de
--   setores (migration 20260824) partia do princípio oposto: a empresa
--   define os setores primeiro e aponta as pessoas depois.
--
--   Consequência que já estava em produção: `rh_setor_arquivar` responde
--   "mova essas pessoas para outro setor antes de arquivar", instrução que
--   ninguém conseguia cumprir. Setor com gente dentro era inarquivável.
--
-- POR QUE RPC E NÃO POLICY DE UPDATE
--   Uma policy de UPDATE em empresa_colaboradores deixaria o RH escrever
--   qualquer coluna da linha — status, user_id, empresa_id. A regra que
--   importa (o setor tem que existir no registro da empresa) precisa rodar
--   no servidor, senão o texto livre volta pela porta dos fundos e refaz as
--   coortes duplicadas que o registro veio eliminar.
-- =====================================================

DROP FUNCTION IF EXISTS rh_definir_setor_colaborador(UUID, TEXT);

CREATE OR REPLACE FUNCTION rh_definir_setor_colaborador(
  p_colaborador_id UUID,
  p_setor          TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_empresa   UUID;
  v_alvo      TEXT := NULLIF(TRIM(COALESCE(p_setor, '')), '');
  v_canonico  TEXT;
  v_existe    BOOLEAN;
BEGIN
  SELECT empresa_id INTO v_empresa
    FROM rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  SELECT TRUE INTO v_existe
    FROM empresa_colaboradores
   WHERE id = p_colaborador_id
     AND empresa_id = v_empresa
     AND status <> 'removido'
   LIMIT 1;

  IF v_existe IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Colaborador não encontrado nesta empresa');
  END IF;

  -- Vazio = tirar do setor. É legítimo: o colaborador volta para o agregado
  -- geral da empresa, sem recorte.
  IF v_alvo IS NULL THEN
    UPDATE empresa_colaboradores SET setor = NULL WHERE id = p_colaborador_id;
    RETURN jsonb_build_object('ok', true, 'setor', NULL);
  END IF;

  -- Só aceita setor do registro, e grava a grafia canônica dele.
  SELECT s.nome INTO v_canonico
    FROM empresa_setores s
   WHERE s.empresa_id = v_empresa
     AND s.ativo
     AND lower(TRIM(s.nome)) = lower(v_alvo)
   LIMIT 1;

  IF v_canonico IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('O setor "%s" não existe no cadastro da empresa. Crie-o antes na lista de setores.', v_alvo)
    );
  END IF;

  UPDATE empresa_colaboradores SET setor = v_canonico WHERE id = p_colaborador_id;

  RETURN jsonb_build_object('ok', true, 'setor', v_canonico);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION rh_definir_setor_colaborador(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rh_definir_setor_colaborador(UUID, TEXT) TO authenticated;
