-- =====================================================
-- Malama — Ativação de colaborador no acesso ao app
-- Migration: 20260618_colaborador_ativacao.sql
--
-- Modelo B2B2C: o colaborador é adicionado pelo RH como
-- 'convidado' (reserva o assento) e só vira 'ativo' quando
-- de fato acessa o app. Isso vale tanto para quem já tem
-- conta (e-mail de ativação) quanto para quem se cadastra
-- pelo convite. Assim "ativo" passa a ser métrica real de
-- adoção, não apenas cadastro.
-- =====================================================

-- Ativa todos os vínculos 'convidado' do usuário autenticado.
-- Casa por user_id (já vinculado) OU por e-mail (usuário que
-- acabou de se cadastrar pelo convite e ainda não tinha user_id).
-- SECURITY DEFINER para contornar RLS, mas auth.uid()/auth.jwt()
-- continuam resolvendo o usuário que chamou — então cada um só
-- consegue ativar os próprios vínculos.
CREATE OR REPLACE FUNCTION ativar_colaboradores_do_usuario()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  v_email := lower(auth.jwt() ->> 'email');

  UPDATE empresa_colaboradores
  SET status        = 'ativo',
      user_id       = COALESCE(user_id, auth.uid()),
      data_ativacao = COALESCE(data_ativacao, now())
  WHERE status = 'convidado'
    AND (
      user_id = auth.uid()
      OR (v_email IS NOT NULL AND lower(email) = v_email)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION ativar_colaboradores_do_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ativar_colaboradores_do_usuario() TO authenticated;
